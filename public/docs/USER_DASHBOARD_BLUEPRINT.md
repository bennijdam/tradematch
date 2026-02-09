# User Dashboard Blueprint — TradeMatch

## 1️⃣ Purpose & Scope
### Purpose
Define the full production-ready architecture for the Customer (homeowner) Dashboard in TradeMatch, covering product scope, backend behavior, data models, integrations, and system rules.

### Scope
- Customer job management (post, track, complete)
- Quote comparison and acceptance
- Messaging with vendors
- Reviews and reputation feedback
- Notifications and alerts
- Stripe payments (user side)
- Integrations with Vendor Dashboard, Admin/Super Admin, Social Signals, Impressions system

---

## 2️⃣ User Types & Permissions
### User Types
- **Customer**: homeowner posting jobs and selecting vendors.
- **Admin (read-only)**: audits and support visibility.
- **Super Admin (read-only)**: compliance and escalations.

### Permissions Matrix
| Feature | Customer | Admin (Read-Only) | Super Admin (Read-Only) |
|---|---|---|---|
| Create job | ✅ | ❌ | ❌ |
| Edit job (pre-quote) | ✅ | ❌ | ❌ |
| View quotes | ✅ | ✅ | ✅ |
| Accept quote | ✅ | ❌ | ❌ |
| Message vendor | ✅ (if unlocked) | ✅ | ✅ |
| Leave review | ✅ (post-completion) | ❌ | ❌ |
| Manage account settings | ✅ | ❌ | ❌ |

---

## 3️⃣ Navigation & Menu Structure
### Left Sidebar Menu
- **Dashboard**
  - Overview widgets, quick actions
- **My Jobs**
  - Active Jobs
  - Completed Jobs
- **Quotes**
  - New Quotes
  - Compared Quotes
- **Messages**
  - Vendor conversations (unlocked only)
- **Saved Trades**
  - Saved vendors list
- **Reviews**
  - Pending reviews, submitted reviews
- **Notifications**
  - Alerts and system messages
- **Account Settings**
  - Profile, security, preferences

### Data & Actions by Menu
- **Dashboard**: latest job status, quote count, pending actions.
- **My Jobs**: view job details, status, and manage lifecycle.
- **Quotes**: compare offers, accept, archive.
- **Messages**: conversation threads for accepted or unlocked quotes.
- **Saved Trades**: save/un-save vendors.
- **Reviews**: submit and view reviews.
- **Notifications**: mark read, filter by type.
- **Account Settings**: update profile, password, notification preferences.

---

## 4️⃣ Dashboard Home (Overview)
### Purpose
Provide a consolidated view of the customer’s active jobs, quotes, and actions.

### Features & Functionality
- Summary counters: active jobs, new quotes, pending reviews.
- Quick actions: post new job, view quotes.
- Alerts: account status, activation, payment reminders.

### User Actions
- Navigate to job or quote detail.
- Post a new job.

### System Behaviour
- Aggregates data across jobs, quotes, notifications.
- Shows warnings if jobs lack quotes for too long.

---

## 5️⃣ Job Lifecycle & States
### Job States
- **Draft**: saved but not submitted.
- **Open**: submitted and available for vendor matching.
- **Quoted**: at least one vendor quote received.
- **Accepted**: customer accepted a quote.
- **In Progress**: job ongoing.
- **Completed**: customer marked completion.
- **Closed**: review submitted or auto-closed.
- **Archived**: historical record.

### State Machine (Text)
```
Draft → Open → Quoted → Accepted → In Progress → Completed → Closed → Archived
```

### System Rules
- Quotes only allowed in Open/Quoted.
- Acceptance locks job to one vendor.
- Completion triggers review request.

---

## 6️⃣ Quote Management System
### Purpose
Allow users to compare vendor quotes and select the best option.

### Features
- Quote list per job.
- Compare by price, timeline, rating, trust badges.
- Accept one quote and close others.

### User Actions
- View details
- Compare
- Accept quote
- Archive/ignore quote

### System Behaviour
- Acceptance updates job state and vendor status.
- Other quotes set to rejected.

### Quote Acceptance Side Effects
- Deduct vendor impressions (already at delivery time).
- Unlock messaging between user and vendor.
- Notify vendor and user.
- Create audit log entry.

---

## 7️⃣ Messaging & Communication Rules
### Purpose
Secure communication between user and vendor.

### Rules for Unlocking Messaging
- Messaging unlocked only after quote acceptance or explicit admin override.
- All messages are stored with audit logging.

### System Behaviour
- Rate-limited per user.
- Supports attachments (optional).

---

## 8️⃣ Reviews & Ratings System
### Purpose
Collect verified feedback after job completion.

### Review Rules
- Only after job marked completed.
- One review per job per vendor.

### Trust Loop
- Review affects vendor rating.
- Ratings update vendor badges.
- Reviews shown on vendor profile and dashboard.

---

## 9️⃣ Notifications Engine
### Purpose
Alert users about quotes, job status, messages, and reviews.

### Behaviour
- Email + in-app notifications.
- Unread count in dashboard.

### Types
- Quote received
- Quote accepted
- Job completed reminder
- Review reminder

---

## 🔁 10️⃣ Vendor Dashboard Integration
### Data Sync Points
- Job leads delivered to vendors.
- Quotes returned to user.
- Acceptance updates vendor pipeline.

### Shared Data Entities
- jobs, quotes, messages, reviews.

---

## 📊 11️⃣ Social Signals Integration
### Purpose
Generate SEO-safe trust signals based on verified activity.

### Social Signal Rules
- Emit on: job created, quote accepted, review submitted.
- Signals stored in `social_events` with anonymized fields.
- Do not expose personal data.

---

## 💳 12️⃣ Payments & Stripe Hooks (User Side)
### Scope
- Optional escrow payments.
- Payment tracking for accepted jobs.

### Stripe Integration
- Checkout sessions for escrow (if enabled).
- Webhook handlers for payment confirmation.
- Payment status updates job state.

---

## 🔐 13️⃣ Security, Privacy & GDPR
- JWT authentication for all dashboard APIs.
- Data isolation by `customer_id`.
- GDPR: export/delete endpoints, audit logs.
- Consent stored for notifications.

---

## 🧠 14️⃣ AI & Smart Enhancements
- Suggested vendors based on job content.
- Smart quote comparison ranking.
- Auto reminder to complete jobs.

---

## 🧪 15️⃣ Seed & Demo Data Strategy
- Seed jobs, quotes, and reviews in staging.
- Use synthetic customer/vendor identities.

---

## 🧭 16️⃣ Admin Read-Only Visibility
- Admins can view all customer jobs/quotes.
- No modification rights.
- All admin views are logged.

---

## ✅ 17️⃣ Success Metrics & KPIs
- Job post to quote rate
- Quote acceptance rate
- Completion → review rate
- User retention (30/90 days)

---

## 🚀 Final Notes
This document is the authoritative blueprint for building and maintaining the TradeMatch Customer Dashboard. All implementations must align with the defined lifecycle, permissions, and integration rules.

---

## SQL Schemas (Mandatory)

### jobs
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  service_key TEXT NOT NULL,
  postcode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
```

### quotes
```sql
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL,
  price INTEGER,
  message TEXT,
  timeline TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quotes_job ON quotes(job_id);
CREATE INDEX idx_quotes_vendor ON quotes(vendor_id);
```

### messages
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_job ON messages(job_id);
```

### reviews
```sql
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_vendor ON reviews(vendor_id);
```

### notifications
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
```

### social_events
```sql
CREATE TABLE social_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  job_id TEXT,
  vendor_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);
CREATE INDEX idx_social_events_type ON social_events(event_type);
```
