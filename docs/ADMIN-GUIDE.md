# TradeMatch Admin Guide

## Table of Contents

1. [Admin Roles](#admin-roles)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Vendor Verification](#vendor-verification)
5. [Dispute Resolution](#dispute-resolution)
6. [Financial Management](#financial-management)
7. [Content Moderation](#content-moderation)
8. [System Configuration](#system-configuration)
9. [Reporting & Analytics](#reporting--analytics)
10. [Troubleshooting](#troubleshooting)

## Admin Roles

### Role Hierarchy

1. **Super Admin**: Full system access
2. **Admin**: Standard admin operations
3. **Finance Admin**: Payment and billing operations
4. **Trust & Safety Admin**: Dispute and content moderation
5. **Support Admin**: User support and basic operations
6. **Read-Only Admin**: View access only

### Permissions Matrix

| Feature | Super Admin | Admin | Finance | Trust & Safety | Support | Read-Only |
|---------|------------|-------|---------|----------------|---------|-----------|
| User Management | ✅ | ✅ | ❌ | ❌ | ✅ (view) | ✅ (view) |
| Vendor Verification | ✅ | ✅ | ❌ | ✅ | ✅ (view) | ✅ (view) |
| Dispute Resolution | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ (view) |
| Financial Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (view) |
| System Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Content Moderation | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ (view) |
| Admin Audit Logs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Dashboard Overview

### Accessing Admin Dashboard

1. Navigate to: `https://www.tradematch.uk/super-admin-dashboard`
2. Login with admin credentials
3. 2FA verification required (if enabled)

### Dashboard Sections

**Top Navigation:**
- Platform Stats (real-time)
- Notifications (system alerts)
- Quick Actions
- User Search

**Main Dashboard:**
- User Activity Chart
- Revenue Graph
- Pending Verifications Queue
- Open Disputes
- System Health

**Sidebar Menu:**
- Users
- Vendors
- Quotes & Jobs
- Payments
- Disputes
- Reports
- Settings
- Audit Logs

## User Management

### Searching Users

1. Go to "Users" in sidebar
2. Use search bar to find by:
   - Name
   - Email
   - User ID
   - Phone
3. Filter by:
   - User type (Customer/Vendor)
   - Status (Active/Suspended/Banned)
   - Registration date
   - Last activity

### Managing User Status

**Suspend User:**
1. Click user profile
2. Click "Actions" > "Suspend"
3. Select reason:
   - Terms violation
   - Fraudulent activity
   - Spam
   - Other (specify)
4. Set duration (temporary/permanent)
5. Add notes

**Reactivate User:**
1. Go to suspended users list
2. Find user
3. Click "Reactivate"
4. Confirm action

**Ban User (Permanent):**
1. Click user profile
2. Click "Actions" > "Ban"
3. Select reason
4. This action is irreversible

### Viewing User Details

Complete profile view includes:
- Basic information
- Activity history
- Job/posting history
- Payment transactions
- Disputes filed
- Messages sent
- Login history
- Device information

## Vendor Verification

### Verification Queue

Access: `Admin > Vendor Verification > Queue`

**Queue Columns:**
- Vendor name
- Trade type
- Submitted date
- Documents uploaded
- Vetting score
- Risk level
- Actions

### Verification Process

**Step 1: Review Documents**
1. Click vendor name
2. Review uploaded documents:
   - Trade certificate
   - Insurance
   - ID verification
   - Company registration
3. Check document validity
4. Verify authenticity

**Step 2: Identity Check**
1. Review GOV.UK One Login results
2. Confirm name matches
3. Check verification date

**Step 3: Trade Registration**
1. Verify with trade bodies:
   - Gas Safe Register (gas work)
   - NICEIC/NAPIT (electrical)
   - FMB/CSCS (building)
2. Check registration numbers
3. Confirm status is active

**Step 4: Decision**

**Approve:**
- Click "Verify" button
- Select verified trades
- Add verification notes
- Set verification expiry
- Vendor receives notification

**Reject:**
- Click "Reject" button
- Select reason:
  - Documents unclear
  - Expired certificates
  - Fraudulent documents
  - Incomplete application
- Request resubmission if applicable
- Vendor receives email with reason

**Request More Info:**
- Select specific documents needed
- Add custom message
- Vendor receives notification

### Bulk Operations

**Approve Multiple:**
1. Select checkbox next to each vendor
2. Click "Bulk Actions" > "Verify Selected"
3. Confirm action

**Export Queue:**
1. Click "Export" button
2. Select format (CSV/Excel)
3. Download file

## Dispute Resolution

### Dispute Queue

Access: `Admin > Disputes`

**Columns:**
- Dispute ID
- Customer
- Vendor
- Quote ID
- Reason
- Amount
- Status
- Created date
- Actions

### Handling Disputes

**Step 1: Review Case**
1. Click dispute ID
2. Review:
   - Customer complaint
   - Vendor response
   - Job details
   - Payment history
   - Message thread
   - Evidence submitted

**Step 2: Communication**
1. Use internal notes
2. Contact parties if needed
3. Request additional evidence
4. Set deadline for responses

**Step 3: Resolution**

**In favor of Customer:**
1. Select "Customer Wins"
2. Choose resolution:
   - Full refund
   - Partial refund
   - Job redo required
3. Process refund if applicable
4. Update dispute status

**In favor of Vendor:**
1. Select "Vendor Wins"
2. Release payment if held
3. Close dispute

**Compromise:**
1. Propose settlement
2. Both parties must agree
3. Process accordingly

**Step 4: Documentation**
1. Add resolution notes
2. Save all evidence
3. Update audit log

### Dispute Analytics

View statistics:
- Total disputes by month
- Resolution time average
- Win rate by party
- Most common reasons
- High-risk users

## Financial Management

### Stripe Reconciliation

Access: `Admin > Finance > Stripe Reconciliation`

**Daily Reconciliation:**
1. View Stripe totals
2. Compare with internal ledger
3. Identify discrepancies
4. Investigate anomalies

**Manual Reconciliation:**
1. Select date range
2. Click "Reconcile"
3. Review unmatched transactions
4. Mark as reconciled or investigate

### Processing Refunds

1. Go to `Admin > Finance > Refunds`
2. Search transaction
3. Click "Process Refund"
4. Enter amount (partial or full)
5. Select reason
6. Confirm Stripe refund
7. Update internal records

### Vendor Payouts

**View Pending Payouts:**
Access: `Admin > Finance > Payouts`

**Manual Payout:**
1. Find vendor
2. Click "Process Payout"
3. Verify amount
4. Confirm transfer

**Bulk Payout:**
1. Select multiple vendors
2. Click "Bulk Process"
3. Review total
4. Confirm

### Financial Reports

**Generate Reports:**
1. Select report type:
   - Revenue by period
   - Vendor payouts
   - Refunds
   - Platform fees
   - Tax summary
2. Select date range
3. Choose format (PDF/CSV)
4. Download

**Scheduled Reports:**
1. Go to `Admin > Finance > Scheduled Reports`
2. Click "Create Schedule"
3. Configure:
   - Report type
   - Frequency (daily/weekly/monthly)
   - Recipients
   - Format
4. Save

## Content Moderation

### Reviewing Reviews

Access: `Admin > Moderation > Reviews`

**Queue Filters:**
- Pending approval
- Reported
- All reviews
- By rating
- By date

**Actions:**
- **Approve**: Make visible
- **Hide**: Keep but hide from public
- **Remove**: Delete permanently
- **Request Edit**: Ask user to modify

### Moderating Messages

**Flagged Messages:**
1. Review flagged content
2. Check context
3. Actions:
   - Approve (no action)
   - Warn user
   - Delete message
   - Suspend user

### Banned Words

Manage: `Admin > Settings > Content Filters`

**Add Banned Word:**
1. Click "Add Filter"
2. Enter word/phrase
3. Set severity:
   - Block (message rejected)
   - Flag (message held for review)
   - Replace (censor with ***)
4. Save

## System Configuration

### Platform Settings

Access: `Admin > Settings > Platform`

**General Settings:**
- Site name
- Contact email
- Support phone
- Social media links

**Email Configuration:**
- SMTP settings
- Sender addresses
- Email templates
- Notification preferences

**Payment Settings:**
- Stripe configuration
- Platform fee percentage
- Minimum payout
- Escrow settings

**Lead Settings:**
- Credits cost
- Max vendors per lead
- Lead expiry time
- Auto-accept threshold

### Feature Flags

Access: `Admin > Settings > Features`

Toggle features:
- Payments (enable/disable)
- Messaging (enable/disable)
- File uploads (enable/disable)
- Email notifications (enable/disable)
- WebSocket real-time (enable/disable)
- Vetting system (enable/disable)

### Maintenance Mode

1. Go to `Admin > Settings > Maintenance`
2. Toggle "Maintenance Mode"
3. Set message for users
4. Allow admin access (yes/no)
5. Save

## Reporting & Analytics

### Platform Analytics

**Dashboard:**
- Active users (today/week/month)
- New registrations
- Jobs posted
- Bids submitted
- Revenue generated
- Disputes opened

**Charts:**
- User growth over time
- Revenue by month
- Service popularity
- Geographic distribution

### Custom Reports

**Create Report:**
1. Go to `Admin > Reports > Create`
2. Select metrics:
   - User metrics
   - Financial metrics
   - Job metrics
   - Vendor metrics
3. Set filters:
   - Date range
   - User type
   - Status
   - Location
4. Generate report
5. Export (PDF/Excel/CSV)

### Audit Logs

Access: `Admin > Audit Logs`

**Log Entries:**
- Timestamp
- Admin user
- Action taken
- Target user/resource
- IP address
- Before/after state

**Search:**
- By admin
- By action type
- By date range
- By target

**Export:**
1. Select entries
2. Click "Export"
3. Choose format
4. Download

## Troubleshooting

### Common Issues

**User Can't Login**
1. Check user status (active/suspended)
2. Verify email is confirmed
3. Check for IP blocks
4. Reset password if needed

**Payment Failed**
1. Check Stripe account status
2. Verify vendor onboarding complete
3. Check for insufficient funds
4. Review error logs

**Message Not Sending**
1. Check conversation not locked
2. Verify user is participant
3. Check WebSocket connection
4. Review rate limits

**Lead Not Distributing**
1. Check vendor preferences
2. Verify vendor has credits
3. Check vendor availability
4. Review matching algorithm logs

### System Health Checks

**API Health:**
```bash
curl https://api.tradematch.uk/api/health
```

**Database Status:**
- Connection pool usage
- Slow query log
- Table sizes

**WebSocket Status:**
- Connected clients
- Message throughput
- Error rates

### Emergency Procedures

**System Down:**
1. Check status page: status.tradematch.uk
2. Review error logs
3. Check infrastructure (Render/Vercel)
4. Contact hosting provider if needed
5. Post incident report

**Data Breach:**
1. Immediately revoke affected tokens
2. Reset passwords for affected users
3. Review access logs
4. Document incident
5. Notify affected users
6. Report to authorities if required

**Payment Issues:**
1. Check Stripe status
2. Verify webhook endpoints
3. Review failed transactions
4. Contact Stripe support if needed

## Best Practices

### Security

- Never share admin credentials
- Use strong passwords
- Enable 2FA
- Log out when done
- Review audit logs regularly
- Report suspicious activity

### Efficiency

- Use bulk actions when possible
- Set up scheduled reports
- Use filters to find data quickly
- Bookmark frequently used pages
- Use keyboard shortcuts

### Communication

- Be professional in all interactions
- Document all decisions
- Provide clear explanations
- Follow up on disputes promptly
- Keep users informed of actions

## Support Resources

- **Internal Wiki**: wiki.tradematch.uk
- **API Docs**: api.tradematch.uk/docs
- **Status Page**: status.tradematch.uk
- **Slack**: tradematch-admins.slack.com
- **Emergency**: admin-emergency@tradematch.uk

---

**Document Version**: 2.0  
**Last Updated**: January 2024  
**For**: TradeMatch Admin Team
