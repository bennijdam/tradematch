# TradeMatch Messaging System

Production-ready messaging system for TradeMatch with job-linked conversations, quote cards, attachments, moderation, and admin oversight.

## Architecture (Express + Postgres)

- REST API with polling fallback for real-time updates.
- Typing indicators via `conversation_typing` table (10s TTL).
- Message reads via `message_reads` (read receipts).
- Admin + finance read-only views.
- Anti-off-platform protection enforced in API before job award.

## Conversation Types

- `job` (default)
- `pre_quote`
- `post_award`
- `dispute`
- `system` (read-only, admin only)

Each conversation is linked to: `job_id`, `customer_id`, `vendor_id`, `status`.

## Core Tables

- `conversations`
- `conversation_participants`
- `messages`
- `message_attachments`
- `message_reads`
- `system_events`
- `moderation_flags`
- `message_audit`
- `conversation_typing`
- `user_notifications`

Schema migration: [backend/migrations/1739000000000_create-messaging-system.js](backend/migrations/1739000000000_create-messaging-system.js)

## Permission Logic

- Customer/Vendor must be participants for normal access.
- Admin/Super Admin can view all conversations, lock, export, flag.
- Finance Admin: read-only disputes via `/api/messaging/finance/conversations`.
- Conversation locked/archived → read-only for non-admins.

## Anti-Off-Platform Protection

Before job award (`contact_allowed=false` and not `post_award`/`dispute`):

- Email, phone, WhatsApp, URLs are blocked.
- Replaced with: `[Contact details hidden for safety]`.

Contact details are allowed after quote acceptance (conversation becomes `post_award`).

## API Routes (Key)

### Conversations

- `GET /api/messaging/conversations`
- `POST /api/messaging/conversations`
- `GET /api/messaging/conversations/:conversationId`

### Messages

- `GET /api/messaging/conversations/:conversationId/messages`
- `POST /api/messaging/conversations/:conversationId/messages`
- `PUT /api/messaging/messages/:messageId` (edit within 5 minutes)
- `DELETE /api/messaging/messages/:messageId` (soft delete)

### Quote Cards

- `POST /api/messaging/conversations/:conversationId/messages` with `message_type=quote_card`
- `POST /api/messaging/messages/:messageId/quote-action` (accept/reject/revise)

### Typing Indicators

- `POST /api/messaging/conversations/:conversationId/typing`
- `GET /api/messaging/conversations/:conversationId/typing`

### Notifications

- `GET /api/messaging/notifications`
- `POST /api/messaging/notifications/read`

### Admin/Moderation

- `GET /api/messaging/admin/conversations`
- `POST /api/messaging/admin/conversations/:conversationId/lock`
- `POST /api/messaging/admin/conversations/:conversationId/join`
- `POST /api/messaging/admin/messages/:messageId/flag`
- `GET /api/messaging/admin/export?conversation_id=...`
- `POST /api/messaging/admin/gdpr/anonymize/:userId`

### Finance Read-Only

- `GET /api/messaging/finance/conversations`

## Quote Card Payload

```
{
  "message_type": "quote_card",
  "quote": {
    "price": 500,
    "scope": "Full kitchen refit",
    "timeline": "2 weeks",
    "validity_days": 14
  },
  "metadata": { "currency": "GBP" }
}
```

## Message Edit / Delete Audit

- `message_audit` records edits and deletions.
- Soft deletes set `is_deleted=true`, `deleted_at` and preserve audit.

## Real-Time Guidance (Pseudocode)

```
onMessageSend(conversationId, payload):
  save message
  emit websocket event "message:sent"
  notify recipient

onTyping(conversationId, userId):
  upsert conversation_typing with last_seen_at
  broadcast typing indicator
```

## Notes for Extension

- Integrate WebSocket (Socket.IO or ws) to push `message:sent` and `typing` events.
- Add file upload service (S3) to generate secure attachment URLs.
- Add rate limits per conversation if needed.
