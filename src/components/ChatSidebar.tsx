import React, { useMemo, useState } from 'react';
import {
  CheckCheck,
  LogOut,
  MessageSquarePlus,
  Moon,
  Pin,
  Search,
  Sun,
  Users,
  Volume2,
  VolumeX,
  BellOff,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { PublicUserProfile, UserInboxChat } from '../types/chat';
import { Avatar } from './Avatar';

interface ChatSidebarProps {
  me: PublicUserProfile;
  chats: UserInboxChat[];
  usersById: Record<string, PublicUserProfile>;
  activeChatId: string | null;
  darkMode: boolean;
  mutedSounds: boolean;
  onSelectChat: (chatId: string) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenProfile: () => void;
  onToggleDark: () => void;
  onToggleSound: () => void;
  onSignOut: () => void;
}

type InboxFilter = 'all' | 'unread' | 'groups';

function formatSidebarTime(ts: Timestamp | null): string {
  if (!ts) return '';
  const date = ts.toDate();
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  me,
  chats,
  usersById,
  activeChatId,
  darkMode,
  mutedSounds,
  onSelectChat,
  onOpenNewChat,
  onOpenNewGroup,
  onOpenProfile,
  onToggleDark,
  onToggleSound,
  onSignOut,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...chats].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const ta = a.lastMessageAt?.toMillis() ?? 0;
      const tb = b.lastMessageAt?.toMillis() ?? 0;
      return tb - ta;
    });

    return sorted.filter((chat) => {
      if (filter === 'unread' && chat.unreadCount <= 0) return false;
      if (filter === 'groups' && chat.chatType === 'direct') return false;
      if (!q) return true;
      const peer = chat.peerUid ? usersById[chat.peerUid] : undefined;
      const displayTitle = (peer?.displayName || chat.title).toLowerCase();
      return (
        displayTitle.includes(q) ||
        chat.lastMessageText.toLowerCase().includes(q)
      );
    });
  }, [chats, filter, search, usersById]);

  const totalUnread = useMemo(
    () => chats.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0),
    [chats]
  );

  return (
    <aside className="w-full md:w-[370px] lg:w-[400px] shrink-0 h-full flex flex-col bg-white dark:bg-[#111B21] border-r border-slate-200 dark:border-slate-800">
      {/* Top Action Header */}
      <header className="h-16 px-4 bg-[#F0F2F5] dark:bg-[#202C33] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-3 min-w-0 py-1 pr-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="Edit Profile & Status"
        >
          <Avatar name={me.displayName} photoURL={me.photoURL} isOnline={true} size="sm" />
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[125px]">
              {me.displayName}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[125px]">
              {me.about || 'Available'}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onOpenNewChat}
            aria-label="New Chat"
            title="New Chat"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenNewGroup}
            aria-label="New Group"
            title="New Group"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={mutedSounds ? 'Unmute notifications' : 'Mute notifications'}
            title={mutedSounds ? 'Unmute sounds' : 'Mute sounds'}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mutedSounds ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Search & Filter Strip */}
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#F0F2F5] dark:bg-[#202C33] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008069]/40 dark:focus:ring-[#00A884]/40"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unread', label: totalUnread > 0 ? `Unread (${totalUnread})` : 'Unread' },
              { id: 'groups', label: 'Groups' },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#E7FCE3] text-[#008069] dark:bg-[#0A332C] dark:text-[#00A884]'
                    : 'bg-[#F0F2F5] text-slate-600 hover:bg-slate-200/70 dark:bg-[#202C33] dark:text-slate-300 dark:hover:bg-slate-700/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Chat List */}
      <div className="flex-1 overflow-y-auto chat-scroll">
        {filteredChats.length === 0 ? (
          <div className="px-6 py-12 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {search ? 'No matching chats found.' : 'No conversations in this view yet.'}
            </p>
            <button
              type="button"
              onClick={onOpenNewChat}
              className="px-4 py-2 rounded-lg bg-[#008069] dark:bg-[#00A884] text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Start a Chat
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const peer = chat.peerUid ? usersById[chat.peerUid] : undefined;
            const title = peer?.displayName || chat.title;
            const photoURL = peer?.photoURL || chat.photoURL;
            const isOnline = Boolean(peer?.isOnline);
            const selected = chat.chatId === activeChatId;
            const sentByMe = chat.lastMessageSenderId === me.uid;

            return (
              <button
                key={chat.chatId}
                type="button"
                onClick={() => onSelectChat(chat.chatId)}
                className={`w-full px-3.5 py-3 flex items-center gap-3 text-left transition-colors border-b border-slate-100 dark:border-slate-800/60 cursor-pointer ${
                  selected
                    ? 'bg-[#F0F2F5] dark:bg-[#2A3942]'
                    : 'hover:bg-[#F5F6F6] dark:hover:bg-[#202C33]/70'
                }`}
              >
                <Avatar
                  name={title}
                  photoURL={photoURL}
                  isOnline={isOnline}
                  chatType={chat.chatType}
                />

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {title}
                    </span>
                    <span
                      className={`font-mono-num text-[11px] shrink-0 ${
                        chat.unreadCount > 0
                          ? 'font-semibold text-[#008069] dark:text-[#00A884]'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {formatSidebarTime(chat.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0 text-xs text-slate-600 dark:text-slate-400">
                      {sentByMe && (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] shrink-0" />
                      )}
                      <span className="truncate">
                        {chat.chatType !== 'direct' && chat.lastMessageSenderName && !sentByMe
                          ? `${chat.lastMessageSenderName}: `
                          : ''}
                        {chat.lastMessageText || 'No messages yet'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {chat.muted && (
                        <BellOff className="w-3.5 h-3.5 text-slate-400" aria-label="Muted" />
                      )}
                      {chat.pinned && (
                        <Pin className="w-3.5 h-3.5 text-slate-400" aria-label="Pinned" />
                      )}
                      {chat.unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#25D366] dark:bg-[#00A884] text-white dark:text-slate-950 font-mono-num text-[11px] font-bold flex items-center justify-center">
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
