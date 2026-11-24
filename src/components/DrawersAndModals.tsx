import React, { useMemo, useState } from 'react';
import { Bell, BellOff, Check, Pin, Search, Star, Users, X } from 'lucide-react';
import { ChatMember, ChatMessage, LIMITS, PublicUserProfile, UserInboxChat } from '../types/chat';
import { Avatar } from './Avatar';

interface NewChatModalProps {
  open: boolean;
  me: PublicUserProfile;
  users: PublicUserProfile[];
  onClose: () => void;
  onSelectUser: (user: PublicUserProfile) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  open,
  me,
  users,
  onClose,
  onSelectUser,
}) => {
  const [search, setSearch] = useState('');

  const contacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.uid !== me.uid)
      .filter((u) => !q || u.displayName.toLowerCase().includes(q) || u.about.toLowerCase().includes(q));
  }, [me.uid, search, users]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#202C33] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 bg-[#008069] dark:bg-[#202C33] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-white dark:text-slate-100">
          <h2 className="text-base font-bold">New Chat</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-100 dark:border-slate-700/70">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F0F2F5] dark:bg-[#111B21] text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto chat-scroll">
          {contacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No other registered users found yet. Invite another account to sign in, or chat in BaatCheet Lounge!
            </div>
          ) : (
            contacts.map((u) => (
              <button
                key={u.uid}
                type="button"
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#F5F6F6] dark:hover:bg-[#2A3942] border-b border-slate-100 dark:border-slate-800/60 transition-colors cursor-pointer"
              >
                <Avatar name={u.displayName} photoURL={u.photoURL} isOnline={u.isOnline} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {u.displayName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {u.about || 'Hey there! I am using BaatCheet.'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface NewGroupModalProps {
  open: boolean;
  me: PublicUserProfile;
  users: PublicUserProfile[];
  onClose: () => void;
  onCreateGroup: (title: string, selected: PublicUserProfile[]) => Promise<void>;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  open,
  me,
  users,
  onClose,
  onCreateGroup,
}) => {
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const peers = useMemo(() => users.filter((u) => u.uid !== me.uid), [me.uid, users]);

  if (!open) return null;

  const toggleUser = (uid: string) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const selectedUsers = peers.filter((u) => selectedIds.includes(u.uid));
      await onCreateGroup(title.trim(), selectedUsers);
      setTitle('');
      setSelectedIds([]);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-[#202C33] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[82vh]"
      >
        <div className="px-5 py-4 bg-[#008069] dark:bg-[#202C33] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-white dark:text-slate-100">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5" />
            <h2 className="text-base font-bold">New Group</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-700/70">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Group Name
            </span>
            <input
              type="text"
              required
              autoFocus
              maxLength={LIMITS.TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend Plans"
              className="h-10 px-3 rounded-lg bg-[#F0F2F5] dark:bg-[#111B21] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#008069]/40"
            />
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Select participants ({selectedIds.length} selected)
          </span>
        </div>

        <div className="flex-1 overflow-y-auto chat-scroll">
          {peers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              You can create a group now and add others once more users sign in.
            </div>
          ) : (
            peers.map((u) => {
              const checked = selectedIds.includes(u.uid);
              return (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => toggleUser(u.uid)}
                  className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#F5F6F6] dark:hover:bg-[#2A3942] border-b border-slate-100 dark:border-slate-800/60 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.displayName} photoURL={u.photoURL} size="sm" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {u.displayName}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      checked
                        ? 'bg-[#008069] dark:bg-[#00A884] border-[#008069] dark:border-[#00A884] text-white dark:text-slate-950'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 bg-[#F0F2F5] dark:bg-[#111B21] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="px-5 py-2 rounded-lg bg-[#008069] hover:bg-[#006d59] dark:bg-[#00A884] dark:hover:bg-[#029676] disabled:opacity-50 text-white dark:text-slate-950 text-sm font-semibold cursor-pointer"
          >
            {submitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  );
};

interface ProfileModalProps {
  open: boolean;
  me: PublicUserProfile;
  onClose: () => void;
  onSave: (displayName: string, about: string) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, me, onClose, onSave }) => {
  const [name, setName] = useState(me.displayName);
  const [about, setAbout] = useState(me.about);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setName(me.displayName);
      setAbout(me.about);
    }
  }, [open, me.displayName, me.about]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(name.trim(), about.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-[#202C33] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col"
      >
        <div className="px-5 py-4 bg-[#008069] dark:bg-[#202C33] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-white dark:text-slate-100">
          <h2 className="text-base font-bold">Profile &amp; Status</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={name || me.displayName} photoURL={me.photoURL} isOnline={true} size="lg" />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Your display name and about status are visible to contacts in BaatCheet.
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Your Name
            </span>
            <input
              type="text"
              required
              maxLength={LIMITS.NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 px-3 rounded-lg bg-[#F0F2F5] dark:bg-[#111B21] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#008069]/40"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              About
            </span>
            <input
              type="text"
              maxLength={LIMITS.ABOUT_MAX}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Hey there! I am using BaatCheet."
              className="h-10 px-3 rounded-lg bg-[#F0F2F5] dark:bg-[#111B21] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#008069]/40"
            />
          </label>
        </div>

        <div className="p-4 bg-[#F0F2F5] dark:bg-[#111B21] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="px-5 py-2 rounded-lg bg-[#008069] hover:bg-[#006d59] dark:bg-[#00A884] dark:hover:bg-[#029676] text-white dark:text-slate-950 text-sm font-semibold cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

interface ChatInfoDrawerProps {
  open: boolean;
  me: PublicUserProfile;
  chat: UserInboxChat | null;
  members: ChatMember[];
  messages: ChatMessage[];
  usersById: Record<string, PublicUserProfile>;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
}

export const ChatInfoDrawer: React.FC<ChatInfoDrawerProps> = ({
  open,
  me,
  chat,
  members,
  messages,
  usersById,
  onClose,
  onTogglePin,
  onToggleMute,
}) => {
  if (!open || !chat) return null;

  const peer = chat.peerUid ? usersById[chat.peerUid] : undefined;
  const title = peer?.displayName || chat.title;
  const photoURL = peer?.photoURL || chat.photoURL;
  const starredMessages = messages.filter((m) => !m.deleted && m.starredBy?.[me.uid]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm h-full bg-[#F0F2F5] dark:bg-[#111B21] border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        <header className="h-16 px-4 bg-[#F0F2F5] dark:bg-[#202C33] border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat info"
            className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {chat.chatType === 'direct' ? 'Contact Info' : 'Group Info'}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto chat-scroll flex flex-col gap-3 p-4">
          {/* Identity Card */}
          <div className="bg-white dark:bg-[#202C33] rounded-xl p-5 flex flex-col items-center text-center gap-2 border border-slate-200/70 dark:border-slate-800">
            <Avatar
              name={title}
              photoURL={photoURL}
              isOnline={Boolean(peer?.isOnline)}
              chatType={chat.chatType}
              size="lg"
            />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {chat.chatType === 'direct'
                ? peer?.about || 'Hey there! I am using BaatCheet.'
                : `${members.length} participants`}
            </p>
          </div>

          {/* Quick Chat Actions */}
          <div className="bg-white dark:bg-[#202C33] rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={onTogglePin}
              className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#2A3942] border-b border-slate-100 dark:border-slate-800 cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Pin className="w-4 h-4 text-slate-500" />
                <span>{chat.pinned ? 'Unpin Chat' : 'Pin Chat'}</span>
              </span>
              <span className="text-xs text-slate-400">{chat.pinned ? 'Pinned' : 'Off'}</span>
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="w-full px-4 py-3 flex items-center justify-between text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#2A3942] cursor-pointer"
            >
              <span className="flex items-center gap-3">
                {chat.muted ? (
                  <BellOff className="w-4 h-4 text-slate-500" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-500" />
                )}
                <span>{chat.muted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
              </span>
              <span className="text-xs text-slate-400">{chat.muted ? 'Muted' : 'Active'}</span>
            </button>
          </div>

          {/* Starred Messages */}
          <div className="bg-white dark:bg-[#202C33] rounded-xl border border-slate-200/70 dark:border-slate-800 p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Starred Messages</span>
              </span>
              <span className="font-mono-num">{starredMessages.length}</span>
            </div>
            {starredMessages.length === 0 ? (
              <p className="text-xs text-slate-400">
                Tap or hover any message and click the star icon to bookmark it here.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto chat-scroll">
                {starredMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-[#F0F2F5] dark:bg-[#111B21] text-xs flex flex-col gap-0.5"
                  >
                    <span className="font-semibold text-[#008069] dark:text-[#00A884]">
                      {m.senderName}
                    </span>
                    <span className="text-slate-700 dark:text-slate-200 break-words">{m.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Participants List */}
          <div className="bg-white dark:bg-[#202C33] rounded-xl border border-slate-200/70 dark:border-slate-800 p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Participants</span>
              <span className="font-mono-num">{members.length}</span>
            </div>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => {
                const live = usersById[m.uid];
                const name = live?.displayName || m.displayName;
                const photo = live?.photoURL || m.photoURL;
                return (
                  <div key={m.uid} className="py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={name} photoURL={photo} isOnline={Boolean(live?.isOnline)} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {m.uid === me.uid ? `${name} (You)` : name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {live?.about || (live?.isOnline ? 'online' : 'member')}
                        </div>
                      </div>
                    </div>
                    {m.role === 'admin' && (
                      <span className="text-[11px] font-semibold text-[#008069] dark:text-[#00A884] shrink-0">
                        Admin
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
