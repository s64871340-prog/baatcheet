import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Info,
  MessageSquare,
  Pencil,
  Reply,
  Search,
  Send,
  Smile,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import {
  ChatMember,
  ChatMessage,
  LIMITS,
  PublicUserProfile,
  TypingStatus,
  UserInboxChat,
} from '../types/chat';
import { Avatar } from './Avatar';

interface ChatWindowProps {
  me: PublicUserProfile;
  chat: UserInboxChat | null;
  messages: ChatMessage[];
  members: ChatMember[];
  typingList: TypingStatus[];
  usersById: Record<string, PublicUserProfile>;
  onBackMobile: () => void;
  onOpenInfo: () => void;
  onOpenNewChat: () => void;
  onSendMessage: (text: string, replyTo: ChatMessage | null) => Promise<void>;
  onEditMessage: (messageId: string, newText: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string, currentEmoji: string | undefined) => Promise<void>;
  onToggleStar: (messageId: string, currentlyStarred: boolean) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const EMOJI_PALETTE = [
  '😀', '😂', '🥹', '😍', '🤩', '😎', '🤔', '😅',
  '🙌', '👏', '👍', '👎', '❤️', '🔥', '✨', '🎉',
  '🙏', '🤝', '💯', '✅', '⚡', '🌟', '☕', '🚀',
  '😭', '🤯', '😴', '🤗', '🥳', '🫡', '💬', '📍',
];

function formatMsgTime(ts: Timestamp | null): string {
  if (!ts) return '...';
  return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(ts: Timestamp | null): string {
  if (!ts) return 'Today';
  const d = ts.toDate();
  const now = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (isSameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatLastSeen(ts: Timestamp | null): string {
  if (!ts) return 'offline';
  const d = ts.toDate();
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `last seen today at ${timeStr}`;
  return `last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  me,
  chat,
  messages,
  members,
  typingList,
  usersById,
  onBackMobile,
  onOpenInfo,
  onOpenNewChat,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onToggleStar,
  onTypingChange,
}) => {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingSentRef = useRef(false);

  // Reset composer state when switching chats
  useEffect(() => {
    setDraft('');
    setReplyTo(null);
    setEditingMsg(null);
    setShowEmoji(false);
    setShowSearch(false);
    setSearchQuery('');
    setActiveActionMsgId(null);
    isTypingSentRef.current = false;
  }, [chat?.chatId]);

  // Auto-scroll to bottom on new messages if user is near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
    if (nearBottom || messages.length <= 20) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, chat?.chatId]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distFromBottom > 240);
  };

  const activeTypers = useMemo(() => {
    const now = Date.now();
    return typingList.filter((t) => {
      if (t.uid === me.uid || !t.isTyping) return false;
      const updated = t.updatedAt?.toMillis() ?? 0;
      return now - updated < 8000;
    });
  }, [typingList, me.uid]);

  const peer = chat?.peerUid ? usersById[chat.peerUid] : undefined;
  const headerTitle = peer?.displayName || chat?.title || '';
  const headerPhoto = peer?.photoURL || chat?.photoURL || '';

  const headerSubtitle = useMemo(() => {
    if (!chat) return '';
    if (activeTypers.length > 0) {
      if (chat.chatType === 'direct') return 'typing...';
      if (activeTypers.length === 1) return `${activeTypers[0].displayName} is typing...`;
      return `${activeTypers.length} people are typing...`;
    }
    if (chat.chatType === 'direct') {
      if (peer?.isOnline) return 'online';
      return formatLastSeen(peer?.lastSeen || null);
    }
    if (members.length > 0) {
      return `${members.length} ${members.length === 1 ? 'member' : 'members'}`;
    }
    return chat.chatType === 'community' ? 'Open community room' : 'Group chat';
  }, [activeTypers, chat, members.length, peer]);

  // Compute max lastReadAt among other chat members for double-blue-tick read receipts
  const otherMembersMaxReadMs = useMemo(() => {
    let maxMs = 0;
    for (const m of members) {
      if (m.uid === me.uid) continue;
      const ms = m.lastReadAt?.toMillis() ?? 0;
      if (ms > maxMs) maxMs = ms;
    }
    return maxMs;
  }, [members, me.uid]);

  const visibleMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) => !m.deleted && (m.text.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  const handleInputChange = (value: string) => {
    setDraft(value.slice(0, LIMITS.MESSAGE_MAX));

    if (!editingMsg && chat) {
      if (!isTypingSentRef.current && value.trim().length > 0) {
        isTypingSentRef.current = true;
        onTypingChange(true);
      }
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        if (isTypingSentRef.current) {
          isTypingSentRef.current = false;
          onTypingChange(false);
        }
      }, 2200);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = draft.trim();
    if (!clean || !chat) return;

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    isTypingSentRef.current = false;

    if (editingMsg) {
      const targetId = editingMsg.id;
      setEditingMsg(null);
      setDraft('');
      await onEditMessage(targetId, clean);
      return;
    }

    const currentReply = replyTo;
    setReplyTo(null);
    setDraft('');
    setShowEmoji(false);
    await onSendMessage(clean, currentReply);
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startEdit = (msg: ChatMessage) => {
    setReplyTo(null);
    setEditingMsg(msg);
    setDraft(msg.text);
    setActiveActionMsgId(null);
    inputRef.current?.focus();
  };

  const startReply = (msg: ChatMessage) => {
    setEditingMsg(null);
    setReplyTo(msg);
    setActiveActionMsgId(null);
    inputRef.current?.focus();
  };

  const handleCopy = (msg: ChatMessage) => {
    navigator.clipboard?.writeText(msg.text).catch(() => {});
    setCopiedId(msg.id);
    setActiveActionMsgId(null);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const jumpToMessage = (id: string) => {
    const target = document.getElementById(`msg-${id}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-2', 'ring-[#00A884]');
      window.setTimeout(() => {
        target.classList.remove('ring-2', 'ring-[#00A884]');
      }, 1200);
    }
  };

  if (!chat) {
    return (
      <section className="hidden md:flex flex-1 h-full flex-col items-center justify-center bg-[#F0F2F5] dark:bg-[#222E35] border-b-[6px] border-[#00A884] p-8 text-center">
        <div className="max-w-md flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#008069]/10 dark:bg-[#00A884]/15 text-[#008069] dark:text-[#00A884] flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            BaatCheet Web
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Select a conversation from the left sidebar or start a new 1:1 chat or group conversation. All messages sync live in real time.
          </p>
          <button
            type="button"
            onClick={onOpenNewChat}
            className="mt-2 px-5 py-2.5 rounded-xl bg-[#008069] hover:bg-[#006d59] dark:bg-[#00A884] dark:hover:bg-[#029676] text-white dark:text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
          >
            Start a Conversation
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 h-full flex flex-col min-w-0 relative bg-[#EFEAE2] dark:bg-[#0B141A]">
      {/* Chat Header */}
      <header className="h-16 px-3 sm:px-4 bg-[#F0F2F5] dark:bg-[#202C33] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackMobile}
            aria-label="Back to chats"
            className="md:hidden min-w-[44px] min-h-[44px] -ml-1 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenInfo}
            className="flex items-center gap-3 min-w-0 text-left cursor-pointer py-1 pr-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Avatar
              name={headerTitle}
              photoURL={headerPhoto}
              isOnline={Boolean(peer?.isOnline)}
              chatType={chat.chatType}
              size="sm"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                {headerTitle}
              </span>
              <span
                className={`text-xs truncate ${
                  activeTypers.length > 0 || (chat.chatType === 'direct' && peer?.isOnline)
                    ? 'text-[#008069] dark:text-[#00A884] font-medium'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {headerSubtitle}
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowSearch((s) => !s);
              setSearchQuery('');
            }}
            aria-label="Search in conversation"
            className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              showSearch
                ? 'bg-black/10 dark:bg-white/15 text-[#008069] dark:text-[#00A884]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenInfo}
            aria-label="Chat details"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-white dark:bg-[#111B21] border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages in this chat..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scrollable Wallpaper Message Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={() => setActiveActionMsgId(null)}
        className="flex-1 overflow-y-auto chat-wallpaper chat-scroll px-3 sm:px-8 lg:px-14 py-4 flex flex-col gap-1.5"
      >
        {visibleMessages.length === 0 ? (
          <div className="my-auto self-center max-w-sm bg-white/90 dark:bg-[#202C33]/95 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-5 py-4 text-center shadow-xs">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {searchQuery
                ? 'No messages match your search.'
                : 'Send a message below to start the conversation.'}
            </p>
          </div>
        ) : (
          visibleMessages.map((msg, idx) => {
            const prev = idx > 0 ? visibleMessages[idx - 1] : null;
            const currentLabel = formatDateLabel(msg.createdAt);
            const prevLabel = prev ? formatDateLabel(prev.createdAt) : null;
            const showDateChip = currentLabel !== prevLabel;

            const isMine = msg.senderId === me.uid;
            const isFirstInRun = !prev || prev.senderId !== msg.senderId || showDateChip;
            const myReaction = msg.reactions?.[me.uid];
            const isStarred = Boolean(msg.starredBy?.[me.uid]);
            const msgMs = msg.createdAt?.toMillis() ?? 0;
            const isRead = isMine && msgMs > 0 && otherMembersMaxReadMs >= msgMs;

            // Aggregate reaction counts
            const reactionGroups = Object.entries(msg.reactions || {}).reduce<Record<string, number>>(
              (acc, [, em]) => {
                acc[em] = (acc[em] || 0) + 1;
                return acc;
              },
              {}
            );
            const reactionEntries = Object.entries(reactionGroups);

            return (
              <React.Fragment key={msg.id}>
                {showDateChip && (
                  <div className="self-center my-2 px-3 py-1 rounded-lg bg-white/90 dark:bg-[#182229] text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-xs">
                    {currentLabel}
                  </div>
                )}

                <div
                  id={`msg-${msg.id}`}
                  className={`group relative flex flex-col ${isMine ? 'items-end' : 'items-start'} ${
                    isFirstInRun ? 'mt-2' : 'mt-0.5'
                  } transition-all rounded-xl`}
                >
                  {/* Quick Hover/Tap Action Bar */}
                  {!msg.deleted && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute -top-8 z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white dark:bg-[#233138] border border-slate-200 dark:border-slate-700 shadow-md transition-opacity ${
                        activeActionMsgId === msg.id
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
                      } ${isMine ? 'right-0' : 'left-0'}`}
                    >
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onToggleReaction(msg.id, emoji, myReaction);
                            setActiveActionMsgId(null);
                          }}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-transform hover:scale-110 cursor-pointer ${
                            myReaction === emoji ? 'bg-emerald-50 dark:bg-emerald-900/40' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => startReply(msg)}
                        title="Reply"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleStar(msg.id, isStarred);
                          setActiveActionMsgId(null);
                        }}
                        title={isStarred ? 'Unstar' : 'Star'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${
                          isStarred ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" fill={isStarred ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg)}
                        title="Copy"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {isMine && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(msg)}
                            title="Edit"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMessage(msg.id);
                              setActiveActionMsgId(null);
                            }}
                            title="Delete for everyone"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!msg.deleted) {
                        setActiveActionMsgId((curr) => (curr === msg.id ? null : msg.id));
                      }
                    }}
                    className={`relative max-w-[85%] sm:max-w-[70%] lg:max-w-[62%] px-3 py-2 rounded-xl shadow-xs cursor-pointer ${
                      isMine
                        ? 'bg-[#D9FDD3] dark:bg-[#005C4B] text-slate-900 dark:text-slate-100 rounded-tr-xs'
                        : 'bg-white dark:bg-[#202C33] text-slate-900 dark:text-slate-100 rounded-tl-xs'
                    }`}
                  >
                    {/* Sender Name in Groups / Community */}
                    {!isMine && chat.chatType !== 'direct' && isFirstInRun && (
                      <div className="text-xs font-bold text-[#008069] dark:text-[#00A884] mb-0.5">
                        {msg.senderName}
                      </div>
                    )}

                    {/* Quoted Reply Preview */}
                    {msg.replyToId && !msg.deleted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          jumpToMessage(msg.replyToId);
                        }}
                        className="w-full text-left mb-1.5 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-black/25 border-l-[3px] border-[#00A884] flex flex-col gap-0.5 cursor-pointer"
                      >
                        <span className="text-[11px] font-bold text-[#008069] dark:text-[#00A884] truncate">
                          {msg.replyToSender}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {msg.replyToText}
                        </span>
                      </button>
                    )}

                    {/* Message Body */}
                    {msg.deleted ? (
                      <div className="flex items-center gap-1.5 text-xs italic text-slate-500 dark:text-slate-400 pr-2">
                        <Ban className="w-3.5 h-3.5 shrink-0" />
                        <span>This message was deleted</span>
                      </div>
                    ) : (
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    )}

                    {/* Timestamp, Edited, Star, Read Receipts */}
                    <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 select-none">
                      {isStarred && !msg.deleted && (
                        <Star className="w-3 h-3 text-amber-500" fill="currentColor" />
                      )}
                      {msg.edited && !msg.deleted && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          edited
                        </span>
                      )}
                      <span className="font-mono-num text-[10px] text-slate-500 dark:text-slate-300/80">
                        {formatMsgTime(msg.createdAt)}
                      </span>
                      {isMine && !msg.deleted && (
                        isRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" aria-label="Read" />
                        ) : (
                          <CheckCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-label="Delivered" />
                        )
                      )}
                    </div>
                  </div>

                  {/* Reaction Badges Below Bubble */}
                  {reactionEntries.length > 0 && !msg.deleted && (
                    <div className="flex flex-wrap items-center gap-1 -mt-1.5 z-10 px-1">
                      {reactionEntries.map(([emoji, count]) => {
                        const mine = myReaction === emoji;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleReaction(msg.id, emoji, myReaction);
                            }}
                            className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 shadow-xs border cursor-pointer transition-transform hover:scale-105 ${
                              mine
                                ? 'bg-[#E7FCE3] dark:bg-[#0A332C] border-[#00A884] text-slate-900 dark:text-slate-100'
                                : 'bg-white dark:bg-[#202C33] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="font-mono-num text-[10px] font-bold">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Live Typing Bubble */}
        {activeTypers.length > 0 && (
          <div className="self-start mt-2 px-3.5 py-2.5 rounded-xl rounded-tl-xs bg-white dark:bg-[#202C33] shadow-xs flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {activeTypers.map((t) => t.displayName).join(', ')} typing
            </span>
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollDown && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest messages"
          className="absolute right-5 bottom-20 z-20 w-10 h-10 rounded-full bg-white dark:bg-[#202C33] border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Emoji Picker Popover */}
      {showEmoji && (
        <div className="absolute left-3 sm:left-6 bottom-[74px] z-30 w-72 bg-white dark:bg-[#233138] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">Emojis</span>
            <button
              type="button"
              onClick={() => setShowEmoji(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setDraft((d) => (d + emoji).slice(0, LIMITS.MESSAGE_MAX));
                  inputRef.current?.focus();
                }}
                className="w-8 h-8 rounded-lg text-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reply / Edit Banner */}
      {(replyTo || editingMsg) && (
        <div className="px-4 py-2 bg-[#F0F2F5] dark:bg-[#202C33] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-0 pl-3 border-l-[3px] border-[#00A884]">
            <div className="text-xs font-bold text-[#008069] dark:text-[#00A884]">
              {editingMsg ? 'Editing message' : `Replying to ${replyTo?.senderName}`}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
              {editingMsg ? editingMsg.text : replyTo?.text}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setReplyTo(null);
              if (editingMsg) {
                setEditingMsg(null);
                setDraft('');
              }
            }}
            aria-label="Cancel reply or edit"
            className="min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Composer */}
      <form
        onSubmit={handleSubmit}
        className="px-3 sm:px-4 py-2.5 bg-[#F0F2F5] dark:bg-[#202C33] border-t border-slate-200/70 dark:border-slate-800 flex items-end gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          aria-label="Toggle emoji picker"
          className={`min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            showEmoji
              ? 'text-[#008069] dark:text-[#00A884] bg-black/5 dark:bg-white/10'
              : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          <Smile className="w-5 h-5" />
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={editingMsg ? 'Update your message...' : 'Type a message'}
          className="flex-1 max-h-32 min-h-[44px] py-2.5 px-4 rounded-xl bg-white dark:bg-[#2A3942] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#008069]/35 dark:focus:ring-[#00A884]/35"
        />

        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send message"
          className="min-w-[44px] min-h-[44px] rounded-full bg-[#008069] hover:bg-[#006d59] dark:bg-[#00A884] dark:hover:bg-[#029676] disabled:opacity-40 text-white dark:text-slate-950 flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:cursor-default"
        >
          {editingMsg ? <Check className="w-5 h-5" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </section>
  );
};
