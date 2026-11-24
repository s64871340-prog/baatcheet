# Security Specification — BaatCheet Real-Time Chat

## 1. Data Invariants
1. **PII Isolation**: User email addresses reside exclusively in `/users_private/{userId}` and are readable/writable only by `userId`. `/users_public/{userId}` contains zero PII.
2. **Membership Gate**: Every read or write to `/chats/{chatId}/messages/{messageId}`, `/chats/{chatId}/members/{memberId}`, and `/chats/{chatId}/typing/{memberId}` requires the caller to be a verified member of `/chats/{chatId}` (via `/chats/{chatId}/members/{uid}`).
3. **Inbox Isolation**: Users may only list their own `/user_inbox/{userId}/chats` collection. Another chat member may update a peer's inbox summary (`lastMessageText`, `lastMessageAt`, `unreadCount`, `updatedAt`) only when both caller and recipient exist in `/chats/{chatId}/members/`.
4. **Sender Integrity & Immutability**: Messages can only be created with `senderId == request.auth.uid` and `createdAt == request.time`. `senderId`, `chatId`, `id`, and `createdAt` are immutable after creation.
5. **Scoped Reactions & Stars**: Any chat member may react to or star a message, but rules enforce `affectedKeys().hasOnly([request.auth.uid])` on the `reactions` or `starredBy` map so no user can tamper with another user's reaction or star.
6. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated read of `/users_public/u1`**: No auth token -> Denied.
2. **PII Leak on `/users_private/u2` by `u1`**: Authenticated `u1` tries `get` on `u2`'s private doc -> Denied.
3. **Self-assigned shadow field on `/users_public/u1`**: `{ ..., isAdmin: true }` -> Rejected by `hasOnly(...)`.
4. **Identity spoofing on message create**: `u1` creates message in chat with `senderId: "u2"` -> Rejected (`senderId == request.auth.uid`).
5. **Non-member reading `/chats/dm_u2_u3/messages`**: `u1` tries to read/list messages in a chat they are not a member of -> Denied.
6. **Non-member sending message to `/chats/dm_u2_u3/messages`**: `u1` tries to inject a message -> Denied.
7. **Forged server timestamp on message create**: `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> Denied.
8. **Oversized message payload (>2000 chars)**: `text` of 5000 chars -> Denied by `.size() <= 2000`.
9. **ID poisoning**: Document ID `chatId` containing invalid characters (`../evil` or 200 chars) -> Denied by `isValidId()`.
10. **Editing another user's message text**: `u2` tries to update `text` on a message sent by `u1` -> Denied.
11. **Tampering with another user's reaction**: `u2` sends `reactions: { u1: "💩" }` -> Denied by map diff check.
12. **Unverified email write**: Token with `email_verified: false` tries to create a message -> Denied.
