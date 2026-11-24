import { User } from 'firebase/auth';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  ChatMember,
  ChatMessage,
  ChatRoom,
  ChatType,
  COMMUNITY_CHAT_ID,
  LIMITS,
  PublicUserProfile,
  TypingStatus,
  UserInboxChat,
} from '../types/chat';

function clip(val: string, max: number): string {
  return val.trim().slice(0, max);
}

export async function syncUserOnSignIn(user: User): Promise<PublicUserProfile> {
  const uid = user.uid;
  const fallbackName = clip(user.displayName || user.email?.split('@')[0] || 'User', LIMITS.NAME_MAX);
  const photoURL = (user.photoURL || '').slice(0, LIMITS.PHOTO_MAX);
  const email = (user.email || '').slice(0, 200);

  const publicRef = doc(db, 'users_public', uid);
  const privateRef = doc(db, 'users_private', uid);

  let profile: PublicUserProfile;

  try {
    const publicSnap = await getDoc(publicRef);
    if (!publicSnap.exists()) {
      const payload = {
        uid,
        displayName: fallbackName,
        photoURL,
        about: 'Hey there! I am using BaatCheet.',
        isOnline: true,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(publicRef, payload);
      profile = {
        uid,
        displayName: fallbackName,
        photoURL,
        about: payload.about,
        isOnline: true,
        lastSeen: null,
        updatedAt: null,
      };
    } else {
      const existing = publicSnap.data() as PublicUserProfile;
      await updateDoc(publicRef, {
        photoURL: photoURL || existing.photoURL || '',
        isOnline: true,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      profile = {
        ...existing,
        photoURL: photoURL || existing.photoURL || '',
        isOnline: true,
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users_public/${uid}`);
  }

  try {
    const privateSnap = await getDoc(privateRef);
    if (!privateSnap.exists()) {
      await setDoc(privateRef, {
        uid,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(privateRef, {
        email,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users_private/${uid}`);
  }

  // Ensure Community Lounge exists and user is enrolled
  await ensureCommunityLoungeMembership(profile);

  return profile;
}

async function ensureCommunityLoungeMembership(profile: PublicUserProfile): Promise<void> {
  const chatRef = doc(db, 'chats', COMMUNITY_CHAT_ID);
  const memberRef = doc(db, 'chats', COMMUNITY_CHAT_ID, 'members', profile.uid);
  const inboxRef = doc(db, 'user_inbox', profile.uid, 'chats', COMMUNITY_CHAT_ID);

  try {
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(chatRef, {
        id: COMMUNITY_CHAT_ID,
        type: 'community',
        title: 'BaatCheet Lounge',
        photoURL: '',
        createdBy: profile.uid,
        memberCount: 1,
        lastMessageText: 'Welcome to BaatCheet! Say salam or hello.',
        lastMessageSenderId: profile.uid,
        lastMessageSenderName: profile.displayName,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(memberRef, {
        uid: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        role: 'admin',
        joinedAt: serverTimestamp(),
        lastReadAt: serverTimestamp(),
      });
      batch.set(inboxRef, {
        chatId: COMMUNITY_CHAT_ID,
        chatType: 'community',
        title: 'BaatCheet Lounge',
        photoURL: '',
        peerUid: '',
        lastMessageText: 'Welcome to BaatCheet! Say salam or hello.',
        lastMessageSenderId: profile.uid,
        lastMessageSenderName: profile.displayName,
        lastMessageAt: serverTimestamp(),
        unreadCount: 0,
        muted: false,
        pinned: true,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return;
    }

    const memberSnap = await getDoc(memberRef);
    const inboxSnap = await getDoc(inboxRef);
    const chatData = chatSnap.data() as ChatRoom;

    if (!memberSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(memberRef, {
        uid: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        role: 'member',
        joinedAt: serverTimestamp(),
        lastReadAt: serverTimestamp(),
      });
      batch.update(chatRef, {
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      if (!inboxSnap.exists()) {
        batch.set(inboxRef, {
          chatId: COMMUNITY_CHAT_ID,
          chatType: 'community',
          title: chatData.title || 'BaatCheet Lounge',
          photoURL: chatData.photoURL || '',
          peerUid: '',
          lastMessageText: chatData.lastMessageText || 'Welcome to BaatCheet!',
          lastMessageSenderId: chatData.lastMessageSenderId || '',
          lastMessageSenderName: chatData.lastMessageSenderName || '',
          lastMessageAt: chatData.lastMessageAt || serverTimestamp(),
          unreadCount: 1,
          muted: false,
          pinned: true,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } else if (!inboxSnap.exists()) {
      await setDoc(inboxRef, {
        chatId: COMMUNITY_CHAT_ID,
        chatType: 'community',
        title: chatData.title || 'BaatCheet Lounge',
        photoURL: chatData.photoURL || '',
        peerUid: '',
        lastMessageText: chatData.lastMessageText || 'Welcome to BaatCheet!',
        lastMessageSenderId: chatData.lastMessageSenderId || '',
        lastMessageSenderName: chatData.lastMessageSenderName || '',
        lastMessageAt: chatData.lastMessageAt || serverTimestamp(),
        unreadCount: 0,
        muted: false,
        pinned: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${COMMUNITY_CHAT_ID}`);
  }
}

export async function setOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'users_public', uid), {
      isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal on unload/visibility
  }
}

export async function updateMyProfile(
  uid: string,
  displayName: string,
  about: string
): Promise<void> {
  const cleanName = clip(displayName, LIMITS.NAME_MAX);
  const cleanAbout = about.trim().slice(0, LIMITS.ABOUT_MAX);
  if (!cleanName) return;

  try {
    await updateDoc(doc(db, 'users_public', uid), {
      displayName: cleanName,
      about: cleanAbout,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users_public/${uid}`);
  }
}

export function subscribePublicUsers(
  onUpdate: (users: PublicUserProfile[]) => void
): () => void {
  const q = query(collection(db, 'users_public'), orderBy('displayName', 'asc'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const list: PublicUserProfile[] = snap.docs.map((d) => d.data() as PublicUserProfile);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_public');
    }
  );
}

export function subscribeUserInbox(
  uid: string,
  onUpdate: (chats: UserInboxChat[]) => void
): () => void {
  const path = `user_inbox/${uid}/chats`;
  const q = query(collection(db, 'user_inbox', uid, 'chats'), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: UserInboxChat[] = snap.docs.map((d) => d.data() as UserInboxChat);
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeCommunityRoom(
  onUpdate: (room: ChatRoom | null) => void
): () => void {
  const path = `chats/${COMMUNITY_CHAT_ID}`;
  return onSnapshot(
    doc(db, 'chats', COMMUNITY_CHAT_ID),
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as ChatRoom) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeChatMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void
): () => void {
  const path = `chats/${chatId}/messages`;
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => d.data() as ChatMessage);
      onUpdate(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeChatMembers(
  chatId: string,
  onUpdate: (members: ChatMember[]) => void
): () => void {
  const path = `chats/${chatId}/members`;
  return onSnapshot(
    collection(db, 'chats', chatId, 'members'),
    (snap) => {
      const members: ChatMember[] = snap.docs.map((d) => d.data() as ChatMember);
      onUpdate(members);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeChatTyping(
  chatId: string,
  onUpdate: (typingList: TypingStatus[]) => void
): () => void {
  const path = `chats/${chatId}/typing`;
  return onSnapshot(
    collection(db, 'chats', chatId, 'typing'),
    (snap) => {
      const list: TypingStatus[] = snap.docs.map((d) => d.data() as TypingStatus);
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function openOrCreateDirectChat(
  me: PublicUserProfile,
  peer: PublicUserProfile
): Promise<string> {
  const sorted = [me.uid, peer.uid].sort();
  const chatId = `dm_${sorted[0]}_${sorted[1]}`;
  const chatRef = doc(db, 'chats', chatId);

  try {
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      const batch = writeBatch(db);
      batch.set(chatRef, {
        id: chatId,
        type: 'direct',
        title: `${me.displayName} & ${peer.displayName}`.slice(0, LIMITS.TITLE_MAX),
        photoURL: '',
        createdBy: me.uid,
        memberCount: 2,
        lastMessageText: 'Started a new conversation',
        lastMessageSenderId: me.uid,
        lastMessageSenderName: me.displayName,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'chats', chatId, 'members', me.uid), {
        uid: me.uid,
        displayName: me.displayName,
        photoURL: me.photoURL,
        role: 'admin',
        joinedAt: serverTimestamp(),
        lastReadAt: serverTimestamp(),
      });

      batch.set(doc(db, 'chats', chatId, 'members', peer.uid), {
        uid: peer.uid,
        displayName: peer.displayName,
        photoURL: peer.photoURL,
        role: 'member',
        joinedAt: serverTimestamp(),
        lastReadAt: serverTimestamp(),
      });

      batch.set(doc(db, 'user_inbox', me.uid, 'chats', chatId), {
        chatId,
        chatType: 'direct',
        title: peer.displayName.slice(0, LIMITS.TITLE_MAX),
        photoURL: peer.photoURL,
        peerUid: peer.uid,
        lastMessageText: 'Started a new conversation',
        lastMessageSenderId: me.uid,
        lastMessageSenderName: me.displayName,
        lastMessageAt: serverTimestamp(),
        unreadCount: 0,
        muted: false,
        pinned: false,
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'user_inbox', peer.uid, 'chats', chatId), {
        chatId,
        chatType: 'direct',
        title: me.displayName.slice(0, LIMITS.TITLE_MAX),
        photoURL: me.photoURL,
        peerUid: me.uid,
        lastMessageText: 'Started a new conversation',
        lastMessageSenderId: me.uid,
        lastMessageSenderName: me.displayName,
        lastMessageAt: serverTimestamp(),
        unreadCount: 0,
        muted: false,
        pinned: false,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } else {
      // Ensure my inbox entry exists in case it was removed
      const myInboxRef = doc(db, 'user_inbox', me.uid, 'chats', chatId);
      const inboxSnap = await getDoc(myInboxRef);
      if (!inboxSnap.exists()) {
        const room = snap.data() as ChatRoom;
        await setDoc(myInboxRef, {
          chatId,
          chatType: 'direct',
          title: peer.displayName.slice(0, LIMITS.TITLE_MAX),
          photoURL: peer.photoURL,
          peerUid: peer.uid,
          lastMessageText: room.lastMessageText || '',
          lastMessageSenderId: room.lastMessageSenderId || '',
          lastMessageSenderName: room.lastMessageSenderName || '',
          lastMessageAt: room.lastMessageAt || serverTimestamp(),
          unreadCount: 0,
          muted: false,
          pinned: false,
          updatedAt: serverTimestamp(),
        });
      }
    }
    return chatId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
  }
}

export async function createGroupChat(
  me: PublicUserProfile,
  title: string,
  members: PublicUserProfile[]
): Promise<string> {
  const cleanTitle = clip(title, LIMITS.TITLE_MAX) || 'New Group';
  const rand = Math.random().toString(36).slice(2, 8);
  const chatId = `grp_${Date.now()}_${rand}`;
  const chatRef = doc(db, 'chats', chatId);

  const uniquePeers = members.filter((m) => m.uid !== me.uid).slice(0, 48);
  const totalCount = uniquePeers.length + 1;

  try {
    const batch = writeBatch(db);
    batch.set(chatRef, {
      id: chatId,
      type: 'group',
      title: cleanTitle,
      photoURL: '',
      createdBy: me.uid,
      memberCount: totalCount,
      lastMessageText: `${me.displayName} created group "${cleanTitle}"`.slice(0, LIMITS.PREVIEW_MAX),
      lastMessageSenderId: me.uid,
      lastMessageSenderName: me.displayName,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'chats', chatId, 'members', me.uid), {
      uid: me.uid,
      displayName: me.displayName,
      photoURL: me.photoURL,
      role: 'admin',
      joinedAt: serverTimestamp(),
      lastReadAt: serverTimestamp(),
    });

    batch.set(doc(db, 'user_inbox', me.uid, 'chats', chatId), {
      chatId,
      chatType: 'group',
      title: cleanTitle,
      photoURL: '',
      peerUid: '',
      lastMessageText: `${me.displayName} created group "${cleanTitle}"`.slice(0, LIMITS.PREVIEW_MAX),
      lastMessageSenderId: me.uid,
      lastMessageSenderName: me.displayName,
      lastMessageAt: serverTimestamp(),
      unreadCount: 0,
      muted: false,
      pinned: false,
      updatedAt: serverTimestamp(),
    });

    for (const peer of uniquePeers) {
      batch.set(doc(db, 'chats', chatId, 'members', peer.uid), {
        uid: peer.uid,
        displayName: peer.displayName,
        photoURL: peer.photoURL,
        role: 'member',
        joinedAt: serverTimestamp(),
        lastReadAt: serverTimestamp(),
      });

      batch.set(doc(db, 'user_inbox', peer.uid, 'chats', chatId), {
        chatId,
        chatType: 'group',
        title: cleanTitle,
        photoURL: '',
        peerUid: '',
        lastMessageText: `${me.displayName} added you to "${cleanTitle}"`.slice(0, LIMITS.PREVIEW_MAX),
        lastMessageSenderId: me.uid,
        lastMessageSenderName: me.displayName,
        lastMessageAt: serverTimestamp(),
        unreadCount: 1,
        muted: false,
        pinned: false,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return chatId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
  }
}

export async function sendMessage(params: {
  chatId: string;
  chatType: ChatType;
  sender: PublicUserProfile;
  text: string;
  replyTo: ChatMessage | null;
  memberUids: string[];
}): Promise<void> {
  const { chatId, chatType, sender, text, replyTo, memberUids } = params;
  const cleanText = text.trim().slice(0, LIMITS.MESSAGE_MAX);
  if (!cleanText) return;

  const preview = cleanText.replace(/\s+/g, ' ').slice(0, LIMITS.PREVIEW_MAX);
  const msgRef = doc(collection(db, 'chats', chatId, 'messages'));

  try {
    const batch = writeBatch(db);
    batch.set(msgRef, {
      id: msgRef.id,
      chatId,
      senderId: sender.uid,
      senderName: sender.displayName.slice(0, LIMITS.NAME_MAX),
      text: cleanText,
      replyToId: replyTo ? replyTo.id : '',
      replyToText: replyTo ? replyTo.text.slice(0, LIMITS.REPLY_PREVIEW_MAX) : '',
      replyToSender: replyTo ? replyTo.senderName.slice(0, LIMITS.NAME_MAX) : '',
      reactions: {},
      starredBy: {},
      deleted: false,
      edited: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'chats', chatId), {
      lastMessageText: preview,
      lastMessageSenderId: sender.uid,
      lastMessageSenderName: sender.displayName.slice(0, LIMITS.NAME_MAX),
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (chatType === 'community') {
      batch.update(doc(db, 'user_inbox', sender.uid, 'chats', chatId), {
        lastMessageText: preview,
        lastMessageSenderId: sender.uid,
        lastMessageSenderName: sender.displayName.slice(0, LIMITS.NAME_MAX),
        lastMessageAt: serverTimestamp(),
        unreadCount: 0,
        updatedAt: serverTimestamp(),
      });
    } else {
      for (const uid of memberUids) {
        batch.update(doc(db, 'user_inbox', uid, 'chats', chatId), {
          lastMessageText: preview,
          lastMessageSenderId: sender.uid,
          lastMessageSenderName: sender.displayName.slice(0, LIMITS.NAME_MAX),
          lastMessageAt: serverTimestamp(),
          unreadCount: uid === sender.uid ? 0 : increment(1),
          updatedAt: serverTimestamp(),
        });
      }
    }

    batch.set(doc(db, 'chats', chatId, 'typing', sender.uid), {
      uid: sender.uid,
      displayName: sender.displayName.slice(0, LIMITS.NAME_MAX),
      isTyping: false,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
  }
}

export async function markChatAsRead(chatId: string, uid: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'user_inbox', uid, 'chats', chatId), {
      unreadCount: 0,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'chats', chatId, 'members', uid), {
      lastReadAt: serverTimestamp(),
    });
    await batch.commit();
  } catch {
    // Non-fatal if inbox doc wasn't initialized yet
  }
}

export async function editMessage(
  chatId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const clean = newText.trim().slice(0, LIMITS.MESSAGE_MAX);
  if (!clean) return;
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      text: clean,
      edited: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMessageForEveryone(
  chatId: string,
  messageId: string
): Promise<void> {
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      text: '',
      deleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleReaction(
  chatId: string,
  messageId: string,
  uid: string,
  emoji: string,
  currentEmoji: string | undefined
): Promise<void> {
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      [`reactions.${uid}`]: currentEmoji === emoji ? deleteField() : emoji.slice(0, LIMITS.REACTION_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleStarMessage(
  chatId: string,
  messageId: string,
  uid: string,
  currentlyStarred: boolean
): Promise<void> {
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      [`starredBy.${uid}`]: currentlyStarred ? deleteField() : true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function togglePinChat(
  uid: string,
  chatId: string,
  pinned: boolean
): Promise<void> {
  const path = `user_inbox/${uid}/chats/${chatId}`;
  try {
    await updateDoc(doc(db, 'user_inbox', uid, 'chats', chatId), {
      pinned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleMuteChat(
  uid: string,
  chatId: string,
  muted: boolean
): Promise<void> {
  const path = `user_inbox/${uid}/chats/${chatId}`;
  try {
    await updateDoc(doc(db, 'user_inbox', uid, 'chats', chatId), {
      muted,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setTypingStatus(
  chatId: string,
  sender: PublicUserProfile,
  isTyping: boolean
): Promise<void> {
  try {
    await setDoc(doc(db, 'chats', chatId, 'typing', sender.uid), {
      uid: sender.uid,
      displayName: sender.displayName.slice(0, LIMITS.NAME_MAX),
      isTyping,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal ephemeral indicator
  }
}
