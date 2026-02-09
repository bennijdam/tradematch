# Connection Layer: Quick Integration Guide

**For**: Developers integrating the connection layer into existing dashboards  
**Time**: ~30 minutes to wire everything together  
**Difficulty**: Medium (mostly copy-paste with minor edits)  

---

## Step 1: Apply Database Schema

```bash
# 1. Connect to PostgreSQL
psql -U postgres -h localhost -d tradematch

# 2. Load schema
\i backend/database/schema-connection-layer.sql

# 3. Verify tables created
\dt
```

Expected output:
```
               List of relations
 Schema |             Name              | Type  |  Owner
--------+-------------------------------+-------+----------
 public | conversations                 | table | postgres
 public | event_log                     | table | postgres
 public | escrow_accounts               | table | postgres
 public | job_reviews                   | table | postgres
 public | jobs                          | table | postgres
 public | leads                         | table | postgres
 public | messages                      | table | postgres
 public | milestones                    | table | postgres
 public | notification_preferences      | table | postgres
 public | notification_queue            | table | postgres
 public | quotes                        | table | postgres
(11 rows)
```

---

## Step 2: Update server-production.js

Add the event broker and connection layer routes:

```javascript
// At top of server.js (after imports)
const { TradeMatchEventBroker } = require('./services/event-broker.service');
const connectionLayerRouter = require('./routes/connection-layer');

// After mounting existing routes (around line 150)
const eventBroker = new TradeMatchEventBroker(pool);

// Mount connection layer API
app.use('/api/connection', (req, res, next) => {
  req.eventBroker = eventBroker;  // Inject event broker
  next();
}, connectionLayerRouter);

// Start notification processor (background worker)
if (process.env.ENABLE_NOTIFICATIONS !== 'false') {
  const { NotificationDispatcher } = require('./services/event-broker.service');
  const dispatcher = new NotificationDispatcher(pool);
  
  // Process notifications every 5 seconds
  setInterval(() => {
    dispatcher.processQueue().catch(err => {
      console.error('[Notifications] Processing failed:', err.message);
    });
  }, 5000);
  
  console.log('[✓] Notification processor started');
}
```

---

## Step 3: Verify RBAC Middleware is Imported

In `connection-layer.js`, the RBAC module should be at the top:

```javascript
const { 
  checkJobOwnership,
  checkLeadAccess,
  checkConversationAccess,
  checkMessagingEnabled,
  maskLeadPreview
} = require('../middleware/rbac');
```

This is already done in the generated `connection-layer.js`.

---

## Step 4: Test Database Connection

```bash
# Start backend
npm start

# In another terminal, test a connection endpoint
curl -X POST http://localhost:3001/api/connection/jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix leaking tap",
    "trade_category": "Plumbing",
    "budget_min": 50,
    "budget_max": 150,
    "timeframe": "urgent"
  }'
```

Expected response:
```json
{
  "success": true,
  "job_id": "job_xxx",
  "status": "draft",
  "event_id": "evt_xxx"
}
```

---

## Step 5: Wire Frontend Dashboard

### Customer Dashboard (customer-dashboard.html)

In the **Create Job** section:

```javascript
async function createJob(jobData) {
  const response = await fetch('/api/connection/jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: jobData.title,
      trade_category: jobData.category,
      budget_min: jobData.budgetMin,
      budget_max: jobData.budgetMax,
      timeframe: jobData.timeframe,
      description: jobData.description,
      location: jobData.location
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✓ Job created (draft):', result.job_id);
    // Show "Publish" button to customer
    showPublishButton(result.job_id);
  }
}

async function publishJob(jobId) {
  const response = await fetch(`/api/connection/jobs/${jobId}/publish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✓ Job published. Vendors notified:', result.leads_assigned);
    // Show "Vendors Responding" status
    displayVendorResponses(jobId);
  }
}
```

In the **Messages** section:

```javascript
async function getMessages(conversationId) {
  const response = await fetch(
    `/api/connection/conversations/${conversationId}/messages`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );
  
  const result = await response.json();
  
  if (result.success) {
    renderMessages(result.messages);  // Auto-marked as read
  }
}

async function sendMessage(conversationId, body) {
  const response = await fetch(
    `/api/connection/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body })
    }
  );
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✓ Message sent');
    // Refresh messages
    getMessages(conversationId);
  }
}
```

### Vendor Dashboard (vendor-dashboard.html)

In the **Leads** section:

```javascript
async function getOfferedLeads() {
  const response = await fetch('/api/connection/leads', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Leads have masked customer details
    renderLeads(result.leads);
  }
}

async function acceptLead(leadId) {
  const response = await fetch(
    `/api/connection/leads/${leadId}/accept`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}',
        'Content-Type': 'application/json'
      }
    }
  );
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✓ Lead accepted. Conversation created:', result.conversation_id);
    console.log('✓ Messaging is now enabled');
    console.log('✓ Customer details unlocked');
    
    // Show "Send Quote" button
    showSendQuoteButton(result.lead_id);
    
    // Show messaging interface
    showConversation(result.conversation_id);
  } else if (result.error === 'LEAD_NOT_ASSIGNED') {
    alert('This lead is not assigned to you');
  }
}
```

---

## Step 6: Event Monitoring (Optional)

To debug event emission in real-time:

```javascript
// In server.js, after creating eventBroker
eventBroker.on('*', (eventType, eventData) => {
  console.log(`[EVENT] ${eventType}`, {
    actor: eventData.actor_id,
    job: eventData.job_id,
    timestamp: new Date()
  });
});

// Subscribe to specific events
eventBroker.subscribe('LEAD_ACCEPTED', (eventData) => {
  console.log('[EVENT:LEAD_ACCEPTED] Vendor:', eventData.vendor_id);
  console.log('  → Messaging enabled');
  console.log('  → Customer details unlocked');
});

eventBroker.subscribe('QUOTE_SENT', (eventData) => {
  console.log('[EVENT:QUOTE_SENT] Amount:', eventData.quote_amount);
});

eventBroker.subscribe('MILESTONE_APPROVED', (eventData) => {
  console.log('[EVENT:MILESTONE_APPROVED] Releasing £' + eventData.amount);
});
```

---

## Step 7: Notification Preferences

After a user logs in, initialize their notification preferences:

```javascript
async function initializeNotificationPreferences(userId) {
  // Check if preferences exist
  const existing = await pool.query(
    'SELECT * FROM notification_preferences WHERE user_id = $1',
    [userId]
  );
  
  if (existing.rows.length === 0) {
    // Create default preferences
    await pool.query(
      `INSERT INTO notification_preferences (
        user_id, email_enabled, push_enabled, in_app_enabled,
        notify_lead_accepted, notify_quote_received, 
        notify_quote_accepted, notify_message,
        notify_milestone_submitted
      ) VALUES ($1, true, true, true, true, true, true, true, true)`,
      [userId]
    );
  }
}
```

---

## Step 8: Error Handling

Wrap all API calls with proper error handling:

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      // Handle known error codes
      switch (result.code) {
        case 'MESSAGING_DISABLED':
          throw new Error('Messaging is only enabled after vendor accepts');
        case 'LEAD_NOT_ASSIGNED':
          throw new Error('This lead is not assigned to you');
        case 'JOB_NOT_OWNED':
          throw new Error('You do not own this job');
        case 'ESCROW_INSUFFICIENT_BALANCE':
          throw new Error(`Insufficient funds. Need £${result.required}, have £${result.available}`);
        default:
          throw new Error(result.message || result.error);
      }
    }
    
    return result;
  } catch (error) {
    console.error('[API Error]', endpoint, error.message);
    showErrorNotification(error.message);
    throw error;
  }
}
```

---

## Step 9: Real-time Updates (Optional: WebSocket)

For now, use polling. Later, implement WebSocket:

```javascript
// Polling approach (simple, no dependencies)
async function pollForUpdates(jobId, interval = 3000) {
  setInterval(async () => {
    try {
      const job = await apiCall(`/api/connection/jobs/${jobId}`);
      updateJobDisplay(job);
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }, interval);
}

// Start polling when customer views job
onJobView((jobId) => {
  pollForUpdates(jobId);
});
```

---

## Step 10: Testing Checklist

Run these tests to verify integration:

```bash
# Test 1: Customer creates and publishes job
curl -X POST http://localhost:3001/api/connection/jobs \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -d '{"title":"Fix tap","budget_min":50,"budget_max":150,"timeframe":"urgent"}'

# Should return: { success: true, job_id: "job_xxx", status: "draft" }

curl -X PATCH http://localhost:3001/api/connection/jobs/job_xxx/publish \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"

# Should return: { success: true, status: "live", leads_assigned: N }
```

```bash
# Test 2: Vendor views and accepts lead
curl http://localhost:3001/api/connection/leads \
  -H "Authorization: Bearer <VENDOR_TOKEN>"

# Should return: { success: true, leads: [...masked...] }

curl -X POST http://localhost:3001/api/connection/leads/lead_xyz/accept \
  -H "Authorization: Bearer <VENDOR_TOKEN>"

# Should return: { success: true, conversation_id: "conv_xxx" }
```

```bash
# Test 3: Messaging (should fail if lead not accepted)
curl -X POST http://localhost:3001/api/connection/conversations/conv_xxx/messages \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -d '{"body":"Can you start tomorrow?"}'

# Should return: { success: true, message_id: "msg_xxx" }

# Try messaging on different conversation (should fail)
curl -X POST http://localhost:3001/api/connection/conversations/conv_yyy/messages \
  -H "Authorization: Bearer <VENDOR_TOKEN>" \
  -d '{"body":"test"}'

# Should return error: { error: "MESSAGING_DISABLED", code: "MESSAGING_DISABLED" }
```

```bash
# Test 4: View event audit trail
curl http://localhost:3001/api/connection/events/job_xxx \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"

# Should show: JOB_CREATED, JOB_POSTED, LEAD_OFFERED x N, LEAD_ACCEPTED, MESSAGE_SENT, etc.
```

---

## Troubleshooting

### "Event Broker Not Initialized"

```
Error: Cannot call emit on undefined
```

**Fix**: Make sure eventBroker is injected into req:

```javascript
app.use('/api/connection', (req, res, next) => {
  req.eventBroker = eventBroker;  // ← Add this line
  next();
}, connectionLayerRouter);
```

### "MESSAGING_DISABLED"

```
Error: Messaging is disabled until vendor accepts lead
```

**This is working correctly!** Messaging is intentionally locked until `LEAD_ACCEPTED` event.

Verify in the database:
```sql
SELECT lead_id, status, accepted_at FROM leads WHERE vendor_id = 'vendor_xyz';
```

Vendor should have at least one lead with `status = 'accepted'` and `accepted_at IS NOT NULL`.

### "Table Not Found"

```
Error: relation "jobs" does not exist
```

**Fix**: Schema not applied. Run:

```bash
psql -U postgres -d tradematch -f backend/database/schema-connection-layer.sql
```

Verify:
```bash
psql -U postgres -d tradematch -c "\dt"
```

### Events Not Emitting

Add debugging to `connection-layer.js`:

```javascript
router.post('/api/connection/leads/:leadId/accept', async (req, res) => {
  console.log('[DEBUG] eventBroker:', req.eventBroker);
  console.log('[DEBUG] eventBroker methods:', Object.keys(req.eventBroker));
  
  // ... rest of endpoint
});
```

Should output:
```
[DEBUG] eventBroker: TradeMatchEventBroker {...}
[DEBUG] eventBroker methods: [ 'emit', 'persistEvent', 'queueNotifications', ... ]
```

---

## Next Steps

1. **Quotes & Acceptance**: Implement quote acceptance endpoint
2. **Escrow Integration**: Add escrow funding and milestone approval
3. **WebSocket Real-time**: Replace polling with WebSocket
4. **Testing**: Write unit + integration tests
5. **Deployment**: Apply to production database

---

**Integration Complete!** 🚀

Your connection layer is now live. Customers and vendors can:
- Create jobs and get matched with vendors
- Accept leads with messaging unlocked
- Exchange messages in real-time
- Track all changes via audit trail
- Receive notifications for key events

