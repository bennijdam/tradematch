# Messaging System Report

Generated: 2026-01-25

## Overview
The messaging system supports customer↔vendor conversations with privacy controls, moderation tooling, typing indicators, and notification delivery. It provides admin and finance views, audit logging for edits/deletes, and quote card workflows.

## Core Features
- **Conversations** with status, locking, dispute flags, and contact sharing controls.
- **Messages** with multiple types (`text`, `image`, `document`, `quote_card`, `system`).
- **Attachments** (images/documents) with URL validation.
- **Read receipts** automatically recorded on message retrieval.
- **Typing indicators** for real-time UX.
- **Notifications** for new messages with mute handling.
- **Admin tooling** for moderation, exports, and GDPR anonymization.

## Access & Privacy
- Participant-only access enforced for all conversation/message endpoints.
- Admin, super admin, and finance admin have elevated access.
- Contact detail masking unless the conversation allows contact sharing (e.g., post-award/dispute).

## Conversation APIs
- `GET /api/messaging/conversations`
  - List conversations with unread counts.
- `POST /api/messaging/conversations`
  - Create or reuse a conversation by job/customer/vendor/type.
- `GET /api/messaging/conversations/:conversationId`
  - Fetch conversation details.

## Message APIs
- `GET /api/messaging/conversations/:conversationId/messages`
  - Fetch messages (auto-mark read).
- `POST /api/messaging/conversations/:conversationId/messages`
  - Send message; supports attachments and quote cards.
- `PUT /api/messaging/messages/:messageId`
  - Edit message within 5 minutes; audit logged.
- `DELETE /api/messaging/messages/:messageId`
  - Soft delete; audit logged.

## Quote Card Workflow
- `POST /api/messaging/messages/:messageId/quote-action`
  - Customer can accept/reject/revise.
  - Creates system message and updates conversation for accepted quotes.

## Typing Indicators
- `POST /api/messaging/conversations/:conversationId/typing`
  - Start/stop typing updates.
- `GET /api/messaging/conversations/:conversationId/typing`
  - Fetch active typers (last 10s).

## Notifications
- `GET /api/messaging/notifications`
  - List recent notifications for the user.
- `POST /api/messaging/notifications/read`
  - Mark all notifications as read.

## Admin & Moderation
- `GET /api/messaging/admin/conversations`
  - Filter by status/type/job.
- `POST /api/messaging/admin/conversations/:conversationId/lock`
  - Lock/unlock conversation.
- `POST /api/messaging/admin/conversations/:conversationId/join`
  - Join as admin participant.
- `POST /api/messaging/admin/messages/:messageId/flag`
  - Flag message with reason.
- `GET /api/messaging/admin/export`
  - Export conversation with messages and system events.
- `POST /api/messaging/admin/gdpr/anonymize/:userId`
  - Anonymize all messages for a user.

## Finance Views
- `GET /api/messaging/finance/conversations`
  - Read-only list of disputed conversations.

## UI Surfaces
- Main messaging UI: `frontend/messaging-system.html`
- Legacy messages UI: `frontend/messages.html`

## Recent Fixes & Notes
- Read receipt insert now generates a fixed-length ID to satisfy schema constraints.
- Messaging roundtrip test confirms customer→vendor and vendor→customer messages succeed.

## Suggested Enhancements
- Real-time updates (WebSocket or SSE) for messages and typing.
- Attachment upload pipeline with storage integration.
- Per-message read receipts (timestamps per recipient).
- Rate limiting and spam detection.
- Message search and filtering in the UI.
