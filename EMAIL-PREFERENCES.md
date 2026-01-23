# Email Preferences & Consent System

## Overview
TradeMatch now includes a comprehensive email preferences system that allows users to control which types of emails they receive. This ensures compliance with email marketing best practices and gives users granular control over their notification settings.

## Features

### Master Email Toggle
- Users can enable/disable ALL email notifications with a single switch
- When disabled, no marketing or engagement emails will be sent
- Critical transactional emails (like activation) bypass this setting

### Granular Preferences
Users can control these email types individually:

**Transaction Notifications:**
- `newBids` - Notifications when receiving new bids (customers)
- `bidAccepted` - Alerts when a bid is accepted (vendors)
- `newQuotes` - New quote opportunities in their area (vendors)
- `paymentConfirmed` - Payment confirmation receipts
- `quoteUpdates` - Quote status change notifications

**Engagement Emails:**
- `reviewReminder` - Prompts to leave reviews after job completion

**Marketing & Updates:**
- `marketing` - Special offers, tips, and platform updates
- `newsletter` - Monthly platform news and tips

## Database Changes

### Migration
Run the migration to add email preference columns to the users table:

```bash
# Using node-pg-migrate
cd backend
npx node-pg-migrate up
```

Or apply manually:
```sql
ALTER TABLE users 
ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN email_preferences JSONB DEFAULT '{
    "newBids": true,
    "bidAccepted": true,
    "newQuotes": true,
    "paymentConfirmed": true,
    "reviewReminder": true,
    "quoteUpdates": true,
    "marketing": false,
    "newsletter": false
}'::jsonb NOT NULL;

CREATE INDEX idx_users_email_notifications ON users(email_notifications_enabled);
```

### Default Behavior
- All new users have `email_notifications_enabled = true`
- All transactional emails default to **enabled**
- Marketing emails default to **disabled** (opt-in)

## API Endpoints

### Get Email Preferences
```http
GET /api/email/preferences/:userId
```

**Response:**
```json
{
  "success": true,
  "emailNotificationsEnabled": true,
  "preferences": {
    "newBids": true,
    "bidAccepted": true,
    "newQuotes": true,
    "paymentConfirmed": true,
    "reviewReminder": true,
    "quoteUpdates": true,
    "marketing": false,
    "newsletter": false
  }
}
```

### Update Email Preferences
```http
PUT /api/email/preferences/:userId
Content-Type: application/json

{
  "emailNotificationsEnabled": true,
  "preferences": {
    "newBids": true,
    "bidAccepted": false,
    "marketing": false
  }
}
```

### Toggle Master Switch
```http
PATCH /api/email/preferences/:userId/toggle
Content-Type: application/json

{
  "enabled": false
}
```

## Frontend Integration

### Email Preferences Page
Users can manage their preferences at:
- Frontend: `/email-preferences.html`
- Accessible from both customer and vendor dashboards

### Features:
- Real-time preference loading
- Master switch with visual feedback
- Individual toggles for each email type
- Success/error messaging
- Automatic save

## Email Sending Logic

All email sending endpoints now check user consent before dispatching:

```javascript
// Example from backend/email-resend.js
const hasConsent = await checkEmailConsent(userId, 'newBids');
if (!hasConsent) {
  return res.json({ 
    success: true, 
    message: 'Email skipped - user opted out', 
    skipped: true 
  });
}
```

### Consent Checking
The `checkEmailConsent()` helper function:
1. Checks if master switch is enabled
2. Checks specific email type preference
3. Defaults to **allowing** emails if check fails (fail-open)
4. Logs when emails are blocked

## Email Types Mapped to Preferences

| Email Trigger | Preference Key | Description |
|--------------|----------------|-------------|
| Quote submitted (customer) | *Always sent* | Confirmation email |
| New quote opportunity (vendor) | `newQuotes` | Vendors notified of new jobs |
| Bid submitted (customer) | `newBids` | Customer gets new bid alert |
| Bid accepted (vendor) | `bidAccepted` | Vendor notified of acceptance |
| Payment confirmed | `paymentConfirmed` | Payment receipt |
| Quote closed | `reviewReminder` | Review reminder sent |
| Quote status changed | `quoteUpdates` | Status change notifications |

## Testing

### Test Email Consent Flow
1. Create user account (defaults: all enabled)
2. Navigate to `/email-preferences.html`
3. Disable specific email type (e.g., "New Bids")
4. Trigger that email type (submit a bid)
5. Verify email is **not sent** (check logs for "Email blocked" message)

### Test Master Switch
1. Go to email preferences
2. Disable "All Email Notifications"
3. Try triggering any transactional email
4. Verify emails are blocked

### Verify Database
```sql
-- Check user preferences
SELECT 
  id, 
  email, 
  email_notifications_enabled, 
  email_preferences 
FROM users 
WHERE email = 'test@example.com';
```

## Logging

Email consent checks log to console:
```
📧 Email blocked: User abc123 has disabled all notifications
📧 Email blocked: User abc123 has disabled 'newBids' notifications
```

## Compliance Notes

- **GDPR Compliant**: Users can opt out of any email type
- **Granular Control**: Separate toggles for transactional vs marketing
- **Default Settings**: Transactional ON, marketing OFF
- **Easy Access**: Preferences page linked in dashboard navigation
- **Fail-Safe**: If preference check fails, email is sent (fail-open to avoid breaking critical notifications)

## Future Enhancements

- [ ] Email frequency controls (daily digest vs real-time)
- [ ] One-click unsubscribe links in emails
- [ ] Email preference center with analytics
- [ ] A/B testing for email engagement
- [ ] Send time optimization
- [ ] Email template customization
