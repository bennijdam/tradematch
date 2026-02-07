# TradeMatch Connection Layer: System Architecture & Integration Guide

**Date**: January 23, 2026  
**Version**: 1.0.0-Alpha  
**Status**: ✅ Specification Complete | Implementation In Progress  

---

## 🎯 Overview

The **Connection Layer** is the orchestration backbone connecting the Customer and Vendor dashboards. It ensures:

✅ **Data Synchronization**: Real-time state changes propagate instantly  
✅ **Privacy Enforcement**: Strict RBAC prevents data leakage  
✅ **Trust & Safety**: Immutable audit trail, transactional consistency  
✅ **Fair Competition**: Vendors never see competitors; customers never see lead prices  
✅ **Seamless UX**: Messaging, quotes, milestones all work transparently  

---

## 📊 System Architecture

### Layers

```
┌─────────────────────────────────────────────────────────────┐
│                   Customer Dashboard                         │
│  (Jobs, Quotes, Reviews, Escrow, Messaging)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────▼────────────┐
         │  Connection Layer API   │
         │  (Role-Based Routes)    │
         └───────────┬────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
  ┌────────┐  ┌──────────┐  ┌────────────┐
  │ Event  │  │RBAC &    │  │ Transaction│
  │Broker  │  │Access    │  │ Manager    │
  │Service │  │Control   │  │(Postgres)  │
  └────────┘  └──────────┘  └────────────┘
      │              │              │
      └──────────────┼──────────────┘
                     │
         ┌───────────▼────────────┐
         │   Core Data Model      │
         │  (Shared Entities)     │
         └────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
┌─────────────┐ ┌──────────┐ ┌────────────┐
│Job & Lead   │ │Messaging │ │Payment &   │
│Management   │ │System    │ │Escrow      │
└─────────────┘ └──────────┘ └────────────┘
      │              │              │
      └──────────────┼──────────────┘
                     │
┌────────────────────▼────────────────────┐
│        Vendor Dashboard                 │
│  (Leads, Quotes, Milestones, Reviews)   │
└─────────────────────────────────────────┘
```

### Core Components

1. **Shared Data Model** (`schema-connection-layer.sql`)
   - Jobs, Leads, Quotes, Conversations, Messages
   - Milestones, Escrow, Reviews, Event Log
   - Immutable audit trail with triggers

2. **RBAC Middleware** (`middleware/rbac.js`)
   - `checkJobOwnership` – Customer can only access own jobs
   - `checkLeadAccess` – Vendor can only access assigned leads
   - `checkConversationAccess` – Only participants can message
   - `checkMessagingEnabled` – Messaging ONLY after lead acceptance
   - `maskLeadPreview` – Hide customer details until accepted
   - `maskVendorLeadPrice` – Hide lead prices from customers

3. **Event Broker** (`services/event-broker.service.js`)
   - Emits events (lead_accepted, quote_sent, etc.)
   - Persists to immutable event_log
   - Queues notifications (email, push, in-app)
   - Supports event replay for recovery

4. **Connection API** (`routes/connection-layer.js`)
   - Unified endpoints for both dashboards
   - Transactional consistency (BEGIN/COMMIT/ROLLBACK)
   - Idempotency keys prevent duplicates
   - Response includes event_id for tracing

---

## 🔐 Permission & Data Visibility Matrix

### Customer (User) Access

| Resource | Can View | Can Edit | Visibility Rules |
|----------|----------|----------|------------------|
| Own Jobs | ✅ | ✅ (draft only) | Full job details |
| Own Quotes | ✅ | ❌ | Quotes for their jobs |
| Own Reviews | ✅ | ❌ (after posted) | Can respond to vendor responses |
| Vendor Profiles | ✅ (limited) | ❌ | Name, rating, distance, badges |
| Vendor Quotes | ✅ | ✅ (accept/reject) | Amount, description, availability |
| Messaging | ✅ (post-accept) | ✅ (send only) | Locked until lead acceptance |
| Own Escrow | ✅ | ✅ (fund/approve) | Can approve milestones |
| Other Customers | ❌ | ❌ | NO CROSS-CUSTOMER ACCESS |

### Vendor (Tradesperson) Access

| Resource | Can View | Can Edit | Visibility Rules |
|----------|----------|----------|------------------|
| Assigned Leads | ✅ (masked) | ✅ (accept) | Customer details HIDDEN until acceptance |
| Own Quotes | ✅ | ✅ (pending only) | Can send, edit, withdraw |
| Accepted Leads | ✅ (full) | ✅ (status updates) | Full customer details, messaging enabled |
| Messaging | ✅ (post-accept) | ✅ (send only) | Locked until they accept lead |
| Milestones | ✅ | ✅ (submit) | Can submit, not modify after |
| Escrow | ✅ (read-only) | ❌ | Can view balances but not modify |
| Competing Vendors | ❌ | ❌ | NO VISIBILITY TO OTHER VENDORS |
| Lead Pricing | ❌ | ❌ | NEVER SEE LEAD COSTS |
| Other Vendors | ❌ | ❌ | NO CROSS-VENDOR ACCESS |

### Admin Access (Future)

| Resource | Can View | Can Edit | Notes |
|----------|----------|----------|-------|
| All Entities | ✅ | ✅ | Full audit trail visibility |
| Event Log | ✅ | ❌ | Immutable, for debugging |
| Disputes | ✅ | ✅ | Can resolve conflicts |

---

## 🔄 Job & Lead Lifecycle Synchronization

### State Machine: Job Status

```
draft ──(customer confirms)──→ live
  ↓
  └──(customer cancels)──→ cancelled

live ──(vendor accepts quote)──→ in_progress
  ↓
  └──(no interest)──→ expired (auto-expire at 72h)

in_progress ──(work complete, escrow released)──→ completed
  ↓
  └──(dispute)──→ disputed (frozen until resolved)

completed ──(customer leaves review)──→ closed (archived)
```

### State Machine: Lead Status

```
offered ──(vendor accepts)──→ accepted
  ├──(vendor declines)──→ declined
  └──(auto-expire at 72h)──→ expired

accepted ──(vendor sends quote)──→ quote_sent
  ├──(customer accepts quote)──→ LEAD LOCKED (no other vendor can accept)
  └──(customer rejects)──→ lead available for other vendors

quote_sent ──(customer accepts)──→ quote_accepted (transitions job to in_progress)
  └──(customer declines)──→ lead still active for vendor
```

### Event Propagation

When a **Vendor accepts a Lead**:

1. **Database Transaction**:
   ```sql
   BEGIN;
     UPDATE leads SET status = 'accepted', accepted_at = NOW() WHERE id = ? AND vendor_id = ?;
     INSERT INTO conversations (...) VALUES (...);  -- Created by trigger
     INSERT INTO messages (type='system') VALUES ('Lead accepted...');
   COMMIT;
   ```

2. **Event Emission**:
   ```javascript
   await eventBroker.emit('LEAD_ACCEPTED', {
     actor_id: vendorId,
     job_id: jobId,
     metadata: { customer_id, customer_name, ... }
   });
   ```

3. **Notification Queueing**:
   ```sql
   INSERT INTO notification_queue
     (user_id, title, body, event_type)
   VALUES
     (customerId, 'Lead Accepted', 'Vendor accepted your job', 'LEAD_ACCEPTED'),
     (vendorId, 'Lead Accepted', 'Messaging now enabled', 'LEAD_ACCEPTED');
   ```

4. **Customer Dashboard Updates**:
   - Real-time refresh (polling or WebSocket)
   - Shows "Vendor accepted your job"
   - Unlocks messaging with that vendor
   - Can now view vendor's contact details

5. **Vendor Dashboard Updates**:
   - Shows "Lead accepted"
   - Unlocks customer contact details
   - Enables messaging
   - Can now send quote

---

## 💬 Messaging System & Privacy

### Messaging Rules

**Disabled by Default**: Messages are LOCKED until vendor accepts lead.

```javascript
// Enforce: Check lead status before allowing message send/receive
async function checkMessagingEnabled(conversationId) {
    const lead = await pool.query(
        `SELECT status FROM leads
         WHERE job_id = (SELECT job_id FROM conversations WHERE id = $1)
         AND vendor_id = (SELECT vendor_id FROM conversations WHERE id = $1)`,
        [conversationId]
    );
    
    if (lead.status !== 'accepted') {
        throw new Error('MESSAGING_DISABLED: Lead must be accepted first');
    }
}
```

### Message Types

| Type | Example | Auto-Created |
|------|---------|--------------|
| `text` | "I can do this for £500" | No, vendor-sent |
| `system` | "Lead accepted. Messaging enabled." | Yes, on LEAD_ACCEPTED |
| `attachment` | Photo of completed work | No, vendor/customer-sent |
| `quote_reference` | Links to quote #123 | Yes, on QUOTE_SENT |

### Immutability

Messages CANNOT be edited or deleted. Immutability is enforced at database level:

```sql
-- Trigger prevents updates to created_at (ensures immutability)
CONSTRAINT message_immutable CHECK (created_at IS NOT NULL)
```

### Conversation Lifecycle

```
open ──(job cancelled)──→ locked (read-only)
  │
  └──(job completed)──→ archived (read-only)
```

---

## 💳 Escrow & Payment Integration

### Payment State Machine

```
pending ──(customer deposits funds)──→ held
  │
  ├──(vendor submits milestone)──→ (awaiting approval)
  │
  ├──(customer approves milestone)──→ partial_released (some funds released)
  │
  ├──(all milestones approved)──→ released (full amount released)
  │
  └──(dispute raised)──→ disputed (frozen)
        │
        └──(resolved)──→ held or released
```

### Milestone Submission Flow

**Vendor submits milestone**:
```javascript
POST /api/connection/milestones/:milestoneId/submit
{
  "completion_evidence": {
    "photos": ["url1", "url2"],
    "description": "Tap fixed, tested and working"
  }
}
```

**Event emitted**: `MILESTONE_SUBMITTED`
- Customer notified: "Vendor submitted milestone for approval"
- Message auto-created: "System: Milestone submitted for approval"
- Button appears: "Approve Milestone"

**Customer approves**:
```javascript
PATCH /api/connection/milestones/:milestoneId/approve
```

**Event emitted**: `MILESTONE_APPROVED`
- Vendor notified: "Milestone approved. Payment releasing..."
- Escrow state transitions: `held` → `partial_released`
- Funds transferred to vendor wallet (async)

---

## 🎓 Core API Endpoints

### Job Management

```
POST   /api/connection/jobs              Create job (draft)
PATCH  /api/connection/jobs/:jobId/publish  Publish job (live)
PATCH  /api/connection/jobs/:jobId/cancel    Cancel job
GET    /api/connection/jobs/:jobId           View job details
```

### Lead Management

```
GET    /api/connection/leads              List offered leads (vendor)
POST   /api/connection/leads/:leadId/accept   Accept lead (unlock details)
POST   /api/connection/leads/:leadId/decline  Decline lead
```

### Messaging

```
GET    /api/connection/conversations/:conversationId/messages      Get messages
POST   /api/connection/conversations/:conversationId/messages      Send message
PATCH  /api/connection/conversations/:conversationId/mark-read     Mark as read
```

### Quotes

```
POST   /api/connection/quotes             Vendor sends quote
PATCH  /api/connection/quotes/:quoteId/accept    Customer accepts quote
PATCH  /api/connection/quotes/:quoteId/reject    Customer rejects quote
```

### Milestones

```
POST   /api/connection/milestones/:milestoneId/submit  Submit milestone
PATCH  /api/connection/milestones/:milestoneId/approve Approve milestone
```

### Reviews

```
POST   /api/connection/reviews            Leave review (post-completion)
PATCH  /api/connection/reviews/:reviewId/respond  Vendor responds to review
```

### Events & Audit

```
GET    /api/connection/events/:jobId      Get event history (audit trail)
```

---

## 🚨 Error Handling & Safeguards

### Transaction-Level Locking

All critical operations are wrapped in database transactions:

```javascript
const client = await pool.connect();
try {
    await client.query('BEGIN');
    
    // Atomic updates
    await client.query('UPDATE leads SET status = ? WHERE id = ?');
    await client.query('INSERT INTO conversations ...');
    await client.query('INSERT INTO messages ...');
    
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
}
```

### Double-Accept Prevention

```sql
-- Unique constraint prevents two vendors accepting same job
UNIQUE (job_id, vendor_id)

-- Lead status constraint ensures valid transitions
CONSTRAINT lead_valid_transition CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL) OR
    (status IN ('offered', 'declined', 'expired'))
)
```

### Idempotency Keys

All mutations accept optional `idempotency_key`:

```javascript
POST /api/connection/leads/:leadId/accept
{
    "idempotency_key": "550e8400-e29b-41d4-a716-446655440000"
}
```

Prevents duplicate processing if request is retried:

```sql
INSERT INTO event_log (...) 
  idempotency_key = ?
ON CONFLICT (idempotency_key) DO NOTHING
```

### Graceful Rollback

If escrow funding fails mid-transaction:

```javascript
// Automatic rollback
try {
    await client.query('BEGIN');
    await chargeEscrow(...);     // Fails - insufficient funds
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');  // Automatic
    res.status(402).json({
        error: 'Insufficient funds',
        code: 'ESCROW_INSUFFICIENT_BALANCE',
        required: 500,
        available: 300
    });
}
```

---

## 📋 Implementation Checklist

### Phase 1: Core Data & RBAC (Current)
- [x] Schema: Jobs, Leads, Conversations, Messages
- [x] RBAC middleware: ownership & access checks
- [x] Privacy masking: lead previews, vendor competitors
- [ ] Schema migrations (apply SQL)
- [ ] Database tests

### Phase 2: Event System & Notifications
- [x] Event broker service
- [x] Event emitter & persistence
- [x] Notification queueing
- [ ] Email service integration
- [ ] Push notification service
- [ ] WebSocket real-time updates

### Phase 3: API Routes & Orchestration
- [x] Connection layer routes
- [x] Job lifecycle endpoints
- [x] Lead management endpoints
- [x] Messaging endpoints
- [ ] Quote acceptance flow
- [ ] Escrow integration
- [ ] Review system

### Phase 4: Testing & Validation
- [ ] Unit tests (RBAC, masking)
- [ ] Integration tests (event propagation)
- [ ] End-to-end tests (customer→vendor→customer flows)
- [ ] Security tests (data leakage, RBAC bypass)
- [ ] Load tests (concurrent leads, messaging)

### Phase 5: Deployment & Monitoring
- [ ] Database migrations (production)
- [ ] Event broker deployment
- [ ] API monitoring (event lag, error rates)
- [ ] Audit trail compliance
- [ ] Incident response procedures

---

## 🧪 Example: Complete Customer→Vendor→Customer Flow

### 1. Customer Creates Job

```bash
POST /api/connection/jobs
{
  "title": "Fix leaking kitchen tap",
  "trade_category": "Plumbing",
  "budget_min": 50,
  "budget_max": 150,
  "timeframe": "urgent"
}

Response:
{
  "job_id": "job_1234567_abcd",
  "status": "draft",
  "event_id": "evt_1234567_xyz"
}
```

**Event emitted**: `JOB_CREATED` → Logged to `event_log`

### 2. Customer Publishes Job

```bash
PATCH /api/connection/jobs/job_1234567_abcd/publish
{}

Response:
{
  "status": "live",
  "leads_assigned": 5,
  "message": "Job published. 5 vendors notified."
}
```

**Events emitted**: 
- `JOB_POSTED` (job.status: draft→live)
- `LEAD_OFFERED` x 5 (one per vendor)

**Notifications queued**:
- 5 vendors receive "New lead: Fix leaking..."

**Vendor Dashboard**:
- Shows new lead in inbox (customer details masked)

### 3. Vendor Accepts Lead

```bash
POST /api/connection/leads/lead_xyz/accept
{
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000"
}

Response:
{
  "lead_id": "lead_xyz",
  "conversation_id": "conv_1234567_abc",
  "event_id": "evt_1234567_xyz",
  "message": "Lead accepted. Customer contact details now visible."
}
```

**Database transaction**:
```sql
BEGIN;
  UPDATE leads SET status = 'accepted', accepted_at = NOW();
  INSERT INTO conversations (job_id, customer_id, vendor_id) VALUES (...);
  INSERT INTO messages (type='system') VALUES ('Lead accepted...');
COMMIT;
```

**Event emitted**: `LEAD_ACCEPTED`

**Notifications queued**:
- Customer: "Vendor accepted your job"
- Vendor: "Lead accepted. Messaging enabled."

**Data unlocked**:
- Vendor now sees: customer name, phone, email, full postcode
- Customer sees: vendor contact details
- Messaging: ENABLED for both parties

### 4. Vendor Sends Quote

```bash
POST /api/connection/quotes
{
  "job_id": "job_1234567_abcd",
  "amount": 120,
  "description": "New washer installed, tested",
  "estimated_duration": "2 hours"
}

Response:
{
  "quote_id": "quote_1234567_qwer",
  "event_id": "evt_1234567_abc"
}
```

**Event emitted**: `QUOTE_SENT`

**System message auto-created**:
```
[System] Vendor sent quote: £120
Estimated duration: 2 hours
Message: New washer installed, tested
```

**Notification**: Customer receives "Quote received: £120"

**Customer Dashboard**:
- Shows quote in job details
- Can "Accept" or "Reject"

### 5. Customer & Vendor Exchange Messages

```bash
POST /api/connection/conversations/conv_1234567_abc/messages
{
  "body": "Can you confirm the exact timing?"
}

Response:
{
  "message_id": "msg_1234567_msg",
  "event_id": "evt_1234567_msg"
}
```

**Event emitted**: `MESSAGE_SENT`

**Both dashboards**:
- Message appears instantly (or within polling interval)
- Marked as read when other party views

### 6. Customer Accepts Quote

```bash
PATCH /api/connection/quotes/quote_1234567_qwer/accept
{}

Response:
{
  "quote_id": "quote_1234567_qwer",
  "job_id": "job_1234567_abcd",
  "event_id": "evt_1234567_xyz",
  "message": "Quote accepted! Job is now in progress."
}
```

**Database transaction**:
```sql
BEGIN;
  UPDATE quotes SET status = 'accepted', accepted_at = NOW();
  UPDATE jobs SET status = 'in_progress';
  UPDATE leads SET status = 'quote_accepted';  -- Lock to this vendor
  UPDATE leads SET status = 'declined' WHERE job_id = ? AND vendor_id != ?;  -- Decline others
  INSERT INTO escrow_accounts (job_id, customer_id, vendor_id, total_amount);
  INSERT INTO messages (type='system') VALUES ('Quote accepted. Job in progress.');
COMMIT;
```

**Events emitted**:
- `QUOTE_ACCEPTED`
- `JOB_IN_PROGRESS`
- `ESCROW_CREATED`

**Notifications**:
- Vendor: "Your quote was accepted! £120 job starts now."
- Other vendors: "This job is no longer available"

**Data locked**:
- Only this vendor can message about this job
- All other leads for this job expire
- Escrow account created for payment

### 7. Vendor Submits Milestone

```bash
POST /api/connection/milestones/milestone_123/submit
{
  "completion_evidence": {
    "photos": ["https://...image1.jpg", "https://...image2.jpg"],
    "description": "Tap installed and tested. Works perfectly."
  }
}
```

**Event emitted**: `MILESTONE_SUBMITTED`

**System message**: "Vendor submitted milestone for approval"

**Customer Dashboard**: "Approve" button appears

### 8. Customer Approves Milestone

```bash
PATCH /api/connection/milestones/milestone_123/approve
{}
```

**Event emitted**: `MILESTONE_APPROVED`

**Payment flow**:
- Escrow: `held` → `partial_released`
- Vendor wallet credited (background job)

**System message**: "Milestone approved. Payment releasing."

### 9. Customer Leaves Review

```bash
POST /api/connection/reviews
{
  "rating": 5,
  "feedback": "Great work, quick and professional!",
  "recommend_yes_no": true
}
```

**Event emitted**: `REVIEW_POSTED`

**System message**: "Review posted"

**Vendor Dashboard**:
- New review shows (subject to moderation)
- Can respond publicly

---

## 📚 Supporting Documentation

- **`database/schema-connection-layer.sql`**: Full schema with triggers, views, constraints
- **`backend/middleware/rbac.js`**: Permission middleware with masking helpers
- **`backend/services/event-broker.service.js`**: Event emitter, persistence, notifications
- **`backend/routes/connection-layer.js`**: All API endpoints with comments
- **`CUSTOMER-DASHBOARD-SPEC.md`**: Customer-facing features
- **`VENDOR-DASHBOARD-COMPLETE.md`**: Vendor-facing features

---

## ✅ Success Criteria

- [ ] All core entities sync correctly between dashboards
- [ ] RBAC prevents all data leakage (security audit)
- [ ] Messaging locked until lead acceptance
- [ ] Vendor never sees lead pricing or competitors
- [ ] Customer never sees vendor lead pricing
- [ ] Event log is immutable (audit compliance)
- [ ] Notification delivery > 99% success rate
- [ ] Message delivery latency < 100ms
- [ ] Escrow transactions atomic (no partial failures)
- [ ] All operations idempotent (safe to retry)

---

## 🚀 Deployment

1. **Database**: Apply `schema-connection-layer.sql` migrations
2. **Backend**: Mount `connection-layer.js` router on `/api/connection`
3. **Event Broker**: Initialize `TradeMatchEventBroker` with pool
4. **Notifications**: Start `NotificationDispatcher.processQueue()` loop
5. **Testing**: Run integration tests for all critical paths
6. **Monitoring**: Track event lag, notification delivery, RBAC violations

---

**Last Updated**: January 23, 2026  
**Status**: ✅ Ready for Implementation  
**Next**: Apply database schema, test integration flow  
