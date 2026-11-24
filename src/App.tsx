/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { AuthScreen } from './components/AuthScreen';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatWindow } from './components/ChatWindow';
import {
  ChatInfoDrawer,
  NewChatModal,
  NewGroupModal,
  ProfileModal,
} from './components/DrawersAndModals';
import {
  createGroupChat,
  deleteMessageForEveryone,
  editMessage,
  markChatAsRead,
  openOrCreateDirectChat,
  sendMessage,
  setOnlineStatus,
  setTypingStatus,
  subscribeChatMembers,
  subscribeChatMessages,
  subscribeChatTyping,
  subscribeCommunityRoom,
  subscribePublicUsers,
  subscribeUserInbox,
  syncUserOnSignIn,
  toggleMuteChat,
  togglePinChat,
  toggleReaction,
  toggleStarMessage,
  updateMyProfile,
} from './services/chatService';
import {
  ChatMember,
  ChatMessage,
  ChatRoom,
  COMMUNITY_CHAT_ID,
  PublicUserProfile,
  TypingStatus,
  UserInboxChat,
} from './types/chat';
import { chatSound } from './utils/sound';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [me, setMe] = useState<PublicUserProfile | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('baatcheet_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });
  const [mutedSounds, setMutedSounds] = useState<boolean>(() => chatSound.isMuted());

  const [users, setUsers] = useState<PublicUserProfile[]>([]);
  const [inbox, setInbox] = useState<UserInboxChat[]>([]);
  const [communityRoom, setCommunityRoom] = useState<ChatRoom | null>(null);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [typingList, setTypingList] = useState<TypingStatus[]>([]);

  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);

  const prevMsgCountRef = useRef<number>(0);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('baatcheet_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setMe(null);
        setUsers([]);
        setInbox([]);
        setActiveChatId(null);
        setAuthReady(true);
        return;
      }

      try {
        const profile = await syncUserOnSignIn(firebaseUser);
        setMe(profile);
        setAuthError(null);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Failed to initialize user profile.');
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Online presence lifecycle
  useEffect(() => {
    if (!me) return;
    const uid = me.uid;

    const handleVisibility = () => {
      setOnlineStatus(uid, document.visibilityState === 'visible');
    };
    const handleUnload = () => {
      setOnlineStatus(uid, false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [me?.uid]);

  // Global subscriptions (users directory, user inbox, community lounge metadata)
  useEffect(() => {
    if (!me) return;
    const unsubUsers = subscribePublicUsers((list) => {
      setUsers(list);
      const latestMe = list.find((u) => u.uid === me.uid);
      if (latestMe) {
        setMe(latestMe);
      }
    });
    const unsubInbox = subscribeUserInbox(me.uid, (items) => {
      setInbox(items);
    });
    const unsubCommunity = subscribeCommunityRoom((room) => {
      setCommunityRoom(room);
    });

    return () => {
      unsubUsers();
      unsubInbox();
      unsubCommunity();
    };
  }, [me?.uid]);

  // Auto-select BaatCheet Lounge on desktop when inbox loads for the first time
  useEffect(() => {
    if (!activeChatId && inbox.length > 0 && window.innerWidth >= 768) {
      setActiveChatId(inbox[0].chatId);
    }
  }, [inbox, activeChatId]);

  const usersById = useMemo(() => {
    const map: Record<string, PublicUserProfile> = {};
    for (const u of users) {
      map[u.uid] = u;
    }
    return map;
  }, [users]);

  const mergedInbox = useMemo(() => {
    return inbox.map((entry) => {
      if (entry.chatId === COMMUNITY_CHAT_ID && communityRoom) {
        return {
          ...entry,
          title: communityRoom.title || entry.title,
          lastMessageText: communityRoom.lastMessageText || entry.lastMessageText,
          lastMessageSenderId: communityRoom.lastMessageSenderId || entry.lastMessageSenderId,
          lastMessageSenderName: communityRoom.lastMessageSenderName || entry.lastMessageSenderName,
          lastMessageAt: communityRoom.lastMessageAt || entry.lastMessageAt,
        };
      }
      return entry;
    });
  }, [inbox, communityRoom]);

  const activeChat = useMemo(
    () => mergedInbox.find((c) => c.chatId === activeChatId) || null,
    [mergedInbox, activeChatId]
  );

  // Active chat subscriptions (messages, members, typing)
  useEffect(() => {
    if (!me || !activeChatId) {
      setMessages([]);
      setMembers([]);
      setTypingList([]);
      prevMsgCountRef.current = 0;
      return;
    }

    prevMsgCountRef.current = 0;

    const unsubMsgs = subscribeChatMessages(activeChatId, (msgs) => {
      if (
        prevMsgCountRef.current > 0 &&
        msgs.length > prevMsgCountRef.current
      ) {
        const newest = msgs[msgs.length - 1];
        if (newest.senderId !== me.uid && !activeChat?.muted) {
          chatSound.playReceive();
        }
      }
      prevMsgCountRef.current = msgs.length;
      setMessages(msgs);

      if (document.visibilityState === 'visible') {
        markChatAsRead(activeChatId, me.uid);
      }
    });

    const unsubMembers = subscribeChatMembers(activeChatId, setMembers);
    const unsubTyping = subscribeChatTyping(activeChatId, setTypingList);

    markChatAsRead(activeChatId, me.uid);

    return () => {
      unsubMsgs();
      unsubMembers();
      unsubTyping();
    };
  }, [me?.uid, activeChatId]);

  const handleSignIn = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.');
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (me) {
      await setOnlineStatus(me.uid, false);
    }
    await signOut(auth);
  }, [me]);

  const handleSelectUserForDirectChat = useCallback(
    async (peer: PublicUserProfile) => {
      if (!me) return;
      const chatId = await openOrCreateDirectChat(me, peer);
      setActiveChatId(chatId);
    },
    [me]
  );

  const handleCreateGroup = useCallback(
    async (title: string, selectedPeers: PublicUserProfile[]) => {
      if (!me) return;
      const chatId = await createGroupChat(me, title, selectedPeers);
      setActiveChatId(chatId);
    },
    [me]
  );

  const handleSendMessage = useCallback(
    async (text: string, replyTo: ChatMessage | null) => {
      if (!me || !activeChat) return;
      chatSound.playSend();
      const memberUids = members.map((m) => m.uid);
      if (!memberUids.includes(me.uid)) memberUids.push(me.uid);
      await sendMessage({
        chatId: activeChat.chatId,
        chatType: activeChat.chatType,
        sender: me,
        text,
        replyTo,
        memberUids,
      });
    },
    [me, activeChat, members]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!activeChat) return;
      await editMessage(activeChat.chatId, messageId, newText);
    },
    [activeChat]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      await deleteMessageForEveryone(activeChat.chatId, messageId);
    },
    [activeChat]
  );

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string, currentEmoji: string | undefined) => {
      if (!me || !activeChat) return;
      chatSound.playReact();
      await toggleReaction(activeChat.chatId, messageId, me.uid, emoji, currentEmoji);
    },
    [me, activeChat]
  );

  const handleToggleStar = useCallback(
    async (messageId: string, currentlyStarred: boolean) => {
      if (!me || !activeChat) return;
      await toggleStarMessage(activeChat.chatId, messageId, me.uid, currentlyStarred);
    },
    [me, activeChat]
  );

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      if (!me || !activeChat) return;
      setTypingStatus(activeChat.chatId, me, isTyping);
    },
    [me, activeChat]
  );

  if (!authReady) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F0F2F5] dark:bg-[#111B21]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#008069] border-t-transparent animate-spin" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Connecting to BaatCheet...
          </span>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <AuthScreen
        darkMode={darkMode}
        loading={signingIn}
        authError={authError}
        onToggleDark={() => setDarkMode((d) => !d)}
        onSignIn={handleSignIn}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F0F2F5] dark:bg-[#111B21] flex">
      {/* Left Sidebar (hidden on mobile when a chat is active) */}
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
        <ChatSidebar
          me={me}
          chats={mergedInbox}
          usersById={usersById}
          activeChatId={activeChatId}
          darkMode={darkMode}
          mutedSounds={mutedSounds}
          onSelectChat={(id) => {
            setActiveChatId(id);
            setShowChatInfo(false);
          }}
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenNewGroup={() => setShowNewGroup(true)}
          onOpenProfile={() => setShowProfile(true)}
          onToggleDark={() => setDarkMode((d) => !d)}
          onToggleSound={() => setMutedSounds(chatSound.toggleMute())}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Right Chat Window (hidden on mobile when no chat is selected) */}
      <div className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-1 h-full min-w-0`}>
        <ChatWindow
          me={me}
          chat={activeChat}
          messages={messages}
          members={members}
          typingList={typingList}
          usersById={usersById}
          onBackMobile={() => setActiveChatId(null)}
          onOpenInfo={() => setShowChatInfo(true)}
          onOpenNewChat={() => setShowNewChat(true)}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onToggleReaction={handleToggleReaction}
          onToggleStar={handleToggleStar}
          onTypingChange={handleTypingChange}
        />
      </div>

      {/* Modals & Drawers */}
      <NewChatModal
        open={showNewChat}
        me={me}
        users={users}
        onClose={() => setShowNewChat(false)}
        onSelectUser={handleSelectUserForDirectChat}
      />

      <NewGroupModal
        open={showNewGroup}
        me={me}
        users={users}
        onClose={() => setShowNewGroup(false)}
        onCreateGroup={handleCreateGroup}
      />

      <ProfileModal
        open={showProfile}
        me={me}
        onClose={() => setShowProfile(false)}
        onSave={async (displayName, about) => {
          await updateMyProfile(me.uid, displayName, about);
        }}
      />

      <ChatInfoDrawer
        open={showChatInfo}
        me={me}
        chat={activeChat}
        members={members}
        messages={messages}
        usersById={usersById}
        onClose={() => setShowChatInfo(false)}
        onTogglePin={() => {
          if (activeChat) togglePinChat(me.uid, activeChat.chatId, !activeChat.pinned);
        }}
        onToggleMute={() => {
          if (activeChat) toggleMuteChat(me.uid, activeChat.chatId, !activeChat.muted);
        }}
      />
    </div>
  );
}
