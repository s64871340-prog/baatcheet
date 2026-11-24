import { Timestamp } from 'firebase/firestore';

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const LIMITS = {
  ID_MAX: 128,
  NAME_MAX: 60,
  TITLE_MAX: 80,
  ABOUT_MAX: 140,
  PHOTO_MAX: 500,
  PREVIEW_MAX: 300,
  MESSAGE_MAX: 2000,
  REPLY_PREVIEW_MAX: 200,
  REACTION_MAX: 16,
} as const;

export const COMMUNITY_CHAT_ID = 'community-lounge';

export type ChatType = 'direct' | 'group' | 'community';

export interface PublicUserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  about: string;
  isOnline: boolean;
  lastSeen: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserInboxChat {
  chatId: string;
  chatType: ChatType;
  title: string;
  photoURL: string;
  peerUid: string;
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageSenderName: string;
  lastMessageAt: Timestamp | null;
  unreadCount: number;
  muted: boolean;
  pinned: boolean;
  updatedAt: Timestamp | null;
}

export interface ChatRoom {
  id: string;
  type: ChatType;
  title: string;
  photoURL: string;
  createdBy: string;
  memberCount: number;
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageSenderName: string;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ChatMember {
  uid: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'member';
  joinedAt: Timestamp | null;
  lastReadAt: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  replyToId: string;
  replyToText: string;
  replyToSender: string;
  reactions: Record<string, string>;
  starredBy: Record<string, boolean>;
  deleted: boolean;
  edited: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface TypingStatus {
  uid: string;
  displayName: string;
  isTyping: boolean;
  updatedAt: Timestamp | null;
}
