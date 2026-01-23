# Super Admin Panel - TradeMatch

## 🎯 Overview

The TradeMatch Super Admin Panel provides comprehensive administrative controls for managing users, vendors, reviews, payments, and platform analytics.

## 🚀 Features

### Dashboard
- **Real-time Statistics**: Total users, active vendors, jobs, revenue
- **Activity Feed**: Recent platform events and actions
- **Analytics Charts**: User growth, revenue trends, vendor performance
- **System Health**: API status, database connections, notification queue

### User Management
- View all users with advanced filtering
- Search by email, name, or ID
- Suspend, ban, or reinstate user accounts
- View user activity history and payment records
- Export user data to CSV

### Vendor Management
- Approve or reject vendor applications
- View pending vendor queue
- Monitor vendor performance metrics
- Manage vendor verification status
- Handle vendor disputes

### Review Moderation
- Approve, hide, or remove customer reviews
- Flag inappropriate content
- View review moderation queue
- Audit review history

### Audit Logging
- Track all administrative actions
- View detailed action logs with timestamps
- Filter by admin, action type, or date range
- IP address and user agent tracking

## 📁 Files

```
tradematch-super-admin-panel/
├── admin-login.html          # Super admin authentication
├── admin-dashboard.html      # Main dashboard with stats
├── admin-users.html          # User management interface
├── admin-vendors.html        # Vendor approval queue
├── admin-api.js              # API client and utilities
└── README.md                 # This file
```

## 🔐 Authentication

### Default Login Credentials

**Email:** `admin@tradematch.com`  
**Password:** `ChangeMe123!`

⚠️ **IMPORTANT:** Change the default password immediately after first login!

### Security Features

- JWT token-based authentication
- Role-based access control (super_admin only)
- Session management with optional "Remember Me"
- Automatic token expiration
- Audit logging of all admin actions

## 🛠️ Setup Instructions

### 1. Run Database Migration

```bash
cd backend
node scripts/setup-super-admin.js
```

This will:
- Add `super_admin` role to users table
- Create `admin_audit_log` table for action tracking
- Add moderation fields to `job_reviews` table
- Add `status` and `metadata` fields to `users` table
- Create default super admin user account

### 2. Start the Backend Server

```bash
cd backend
node server-production.js
```

The admin API routes will be mounted at `/api/admin/`

### 3. Access the Super Admin Panel

#### For Local Development:
Open `tradematch-super-admin-panel/admin-login.html` in your browser

#### For Production:
1. Copy all HTML files to your web server
2. Update API_BASE in `admin-api.js`:
   ```javascript
   const API_BASE = 'https://your-production-api.com';
   ```
3. Access via your domain: `https://admin.tradematch.com/admin-login.html`

## 📡 API Endpoints

### Stats & Analytics
- `GET /api/admin/stats?period=30d` - Dashboard statistics
- `GET /api/admin/activity?limit=20` - Recent platform activity

### User Management
- `GET /api/admin/users` - List all users with filters
- `GET /api/admin/users/:userId` - Get user details
- `PATCH /api/admin/users/:userId/status` - Update user status

### Vendor Management
- `GET /api/admin/vendors/pending` - Get pending vendor applications
- `POST /api/admin/vendors/:vendorId/approve` - Approve vendor
- `POST /api/admin/vendors/:vendorId/reject` - Reject vendor

### Review Moderation
- `GET /api/admin/reviews/pending` - Get pending reviews
- `PATCH /api/admin/reviews/:reviewId/moderate` - Moderate review

All endpoints require:
- `Authorization: Bearer <token>` header
- `super_admin` role

## 🎨 UI Features

### Glassmorphism Design
- Frosted glass panels with backdrop blur
- Emerald (#10b981) color scheme matching TradeMatch branding
- Animated floating orbs background
- Smooth transitions and hover effects

### Responsive Layout
- Sidebar navigation
- Stats cards with growth indicators
- Data tables with search and filters
- Pagination for large datasets
- Modal dialogs for actions

### Charts Integration
- User growth trends (Chart.js)
- Revenue analytics
- Vendor performance metrics
- Activity heatmaps

## 🔧 Configuration

### API Configuration (`admin-api.js`)

```javascript
const API_CONFIG = {
    BASE_URL: 'http://localhost:3001', // Update for production
    ENDPOINTS: { ... }
};
```

### Environment Detection

The API client automatically detects the environment:
- **localhost**: Uses `http://localhost:3001`
- **production**: Uses `https://tradematch-api.onrender.com`

## 📊 User Actions

### Suspend User
```javascript
await api.updateUserStatus(userId, 'suspended', 'Violating terms of service');
```

### Ban User
```javascript
await api.updateUserStatus(userId, 'banned', 'Fraudulent activity');
```

### Approve Vendor
```javascript
await api.approveVendor(vendorId, 'All documentation verified');
```

### Moderate Review
```javascript
await api.moderateReview(reviewId, 'hide', 'Inappropriate language');
```

## 🔍 Filtering & Search

### User Filters
- **Search**: Email, name, or user ID
- **Role**: Customer, vendor, admin, super_admin
- **Status**: Active, pending, suspended, banned
- **Pagination**: 50 users per page

### Date Ranges
- Last 7 days
- Last 30 days (default)
- Last 90 days
- Last year

## 📈 Monitoring

### Dashboard Metrics

- **Total Users**: All registered accounts
- **Active Vendors**: Approved vendors with active status
- **Total Jobs**: All jobs created
- **Revenue MTD**: Month-to-date revenue from payments

### Growth Indicators

Each metric shows:
- Current count/amount
- Growth percentage vs. previous period
- Visual up/down arrow indicator

### Activity Feed

Real-time feed showing:
- User registrations
- Vendor applications
- Job creations
- Quote submissions
- Payment transactions
- Review submissions

## 🔒 Security Best Practices

1. **Change Default Password**
   - Login immediately and change password
   - Use strong password (12+ characters, mixed case, numbers, symbols)

2. **IP Allowlisting** (Recommended)
   - Restrict admin panel access to specific IP addresses
   - Configure in backend middleware

3. **HTTPS Only**
   - Never use admin panel over HTTP in production
   - Ensure SSL certificate is valid

4. **Regular Audits**
   - Review admin_audit_log regularly
   - Monitor for suspicious activity
   - Set up alerts for critical actions

5. **Session Management**
   - Don't use "Remember Me" on shared computers
   - Logout after each session
   - Tokens expire after 24 hours

## 🐛 Troubleshooting

### Login Fails
- Verify backend server is running
- Check API_BASE URL in admin-api.js
- Ensure super admin user exists in database
- Check browser console for errors

### API Errors
- Verify JWT_SECRET is set in backend .env
- Check CORS configuration allows admin panel domain
- Ensure database migration completed successfully

### Stats Not Loading
- Check /api/admin/stats endpoint is accessible
- Verify token is valid (not expired)
- Check database has data to aggregate

## 📝 Customization

### Branding
Update logo and colors in HTML files:
```css
:root {
    --emerald-500: #10b981;  /* Primary color */
    --slate-900: #0f172a;    /* Background */
}
```

### Add Custom Metrics
1. Create new endpoint in `backend/routes/admin.js`
2. Add API method to `admin-api.js`
3. Update dashboard HTML to display metric

### Add Custom Actions
1. Define action in `backend/routes/admin.js`
2. Add button/modal to HTML interface
3. Wire up with JavaScript event handler

## 🔄 Integration with Customer/Vendor Dashboards

### Shared Features
- Same authentication system (JWT)
- Unified user database
- Consistent API structure
- Matching design language

### Cross-Dashboard Links

From Super Admin Panel:
- View user's customer dashboard (if customer)
- View vendor's vendor dashboard (if vendor)
- Impersonate user for support (with audit logging)

From Customer/Vendor Dashboards:
- "Contact Support" button creates admin notification
- Dispute/appeal flows routed to admin queue

## 📚 Additional Resources

- [API Reference](../API-REFERENCE.md)
- [Database Schema](../database/schema-connection-layer.sql)
- [Authentication Docs](../backend/middleware/auth.js)
- [Event System](../CONNECTION-LAYER-ARCHITECTURE.md)

## 🤝 Support

For issues or questions:
1. Check this documentation
2. Review backend logs
3. Check admin_audit_log table
4. Contact technical support

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Maintained by:** TradeMatch Development Team
