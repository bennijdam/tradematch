# TradeMatch Admin API Documentation

Complete reference for the TradeMatch administrative interface, covering all super admin operations, finance management, audit logging, and platform governance.

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Roles](#authentication--roles)
3. [Dashboard & Analytics](#dashboard--analytics)
4. [User Management](#user-management)
5. [Vendor Management](#vendor-management)
6. [Review Moderation](#review-moderation)
7. [Jobs & Leads](#jobs--leads)
8. [Lead Pricing](#lead-pricing)
9. [Platform Settings](#platform-settings)
10. [Admin Management](#admin-management)
11. [Finance Operations](#finance-operations)
12. [Audit Logging](#audit-logging)
13. [Error Codes](#error-codes)

---

## Overview

The Admin API provides comprehensive platform governance capabilities for TradeMatch super administrators. All endpoints require authentication via JWT tokens and appropriate admin role authorization.

**Base URL:** `/api/admin`
**Finance Base URL:** `/api/admin/finance`

---

## Authentication & Roles

### Admin Role Hierarchy

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all operations |
| `admin` | Full access to all operations |
| `finance_admin` | Financial operations, refunds, credits |
| `trust_safety_admin` | Vendor approval, review moderation, user restrictions |
| `support_admin` | User/vendor support, status changes |
| `read_only_admin` | View-only access to all data |

### Role Constants

```javascript
const ADMIN_READ_ROLES = [
  'admin', 'super_admin', 'finance_admin', 
  'trust_safety_admin', 'support_admin', 'read_only_admin'
];

const ADMIN_WRITE_ROLES = [
  'admin', 'super_admin', 'finance_admin', 
  'trust_safety_admin', 'support_admin'
];

const TRUST_SAFETY_ROLES = [
  'admin', 'super_admin', 'trust_safety_admin', 'support_admin'
];

const FINANCE_ROLES = ['admin', 'super_admin', 'finance_admin'];

const SUPPORT_ROLES = [
  'admin', 'super_admin', 'support_admin', 'trust_safety_admin'
];

const SUPER_ROLES = ['admin', 'super_admin'];
```

### Required Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Dashboard & Analytics

### Get Dashboard Statistics

**Endpoint:** `GET /api/admin/stats`

**Query Parameters:**
- `period` (optional): Time period for stats
  - `7d` - Last 7 days
  - `30d` - Last 30 days (default)
  - `90d` - Last 90 days
  - `1y` - Last year

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": {
      "count": 1250,
      "growth": "12.5"
    },
    "activeVendors": {
      "count": 340,
      "growth": "8.3"
    },
    "totalJobs": {
      "count": 890,
      "growth": "15.2"
    },
    "revenue": {
      "total": 45000.00,
      "period": 5200.00,
      "growth": "18.7"
    },
    "period": "30d"
  }
}
```

### Get Recent Activity

**Endpoint:** `GET /api/admin/activity`

**Query Parameters:**
- `limit` (optional): Number of activities to return (default: 20)

**Response:**
```json
{
  "success": true,
  "activity": [
    {
      "event_type": "user_registered",
      "actor_id": "user-uuid",
      "actor_role": "customer",
      "subject_type": "user",
      "subject_id": "user-uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "metadata": {}
    }
  ]
}
```

### Get Chart Data

**Endpoint:** `GET /api/admin/charts`

**Query Parameters:**
- `period` (optional): Same as `/stats` endpoint

**Response:**
```json
{
  "success": true,
  "charts": {
    "labels": ["Jan 1", "Jan 2", "Jan 3", ...],
    "users": [5, 8, 12, ...],
    "jobs": [3, 5, 7, ...],
    "quotes": [2, 4, 6, ...],
    "revenue": [100, 250, 400, ...],
    "userTypes": {
      "customers": 800,
      "vendors": 340,
      "admins": 5
    }
  }
}
```

---

## User Management

### List All Users

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `search` (optional): Search by email, name, or ID
- `role` (optional): Filter by role (customer, vendor, admin, etc.)
- `status` (optional): Filter by status (active, pending, suspended, banned)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "customer",
      "status": "active",
      "phone": "+44 123 456 7890",
      "email_verified": true,
      "phone_verified": false,
      "created_at": "2024-01-01T00:00:00Z",
      "last_login_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1250,
  "page": 1,
  "limit": 50
}
```

### Get User Details

**Endpoint:** `GET /api/admin/users/:userId`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "customer",
    "status": "active",
    "phone": "+44 123 456 7890",
    "email_verified": true,
    "phone_verified": false,
    "created_at": "2024-01-01T00:00:00Z",
    "last_login_at": "2024-01-15T10:30:00Z",
    "metadata": {}
  },
  "jobs": [...],
  "payments": [...],
  "reviews": [...]
}
```

### Get User Job History

**Endpoint:** `GET /api/admin/users/:userId/jobs`

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job-uuid",
      "title": "Plumbing repair",
      "status": "completed",
      "created_at": "2024-01-10T00:00:00Z",
      "updated_at": "2024-01-12T00:00:00Z"
    }
  ]
}
```

### Get User Messages

**Endpoint:** `GET /api/admin/users/:userId/messages`

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-uuid",
      "conversation_id": "conv-uuid",
      "sender_id": "user-uuid",
      "sender_role": "customer",
      "message_type": "text",
      "body": "Message content",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Update User Status

**Endpoint:** `PATCH /api/admin/users/:userId/status`

**Required Role:** SUPPORT_ROLES

**Request Body:**
```json
{
  "status": "suspended",
  "reason": "Violation of terms"
}
```

**Valid Statuses:**
- `active` - Normal operation
- `suspended` - Temporary suspension
- `banned` - Permanent ban
- `pending` - Awaiting activation

**Response:**
```json
{
  "success": true,
  "message": "User suspended"
}
```

---

## Vendor Management

### List Vendors

**Endpoint:** `GET /api/admin/vendors`

**Query Parameters:**
- `search` (optional): Search by email, name, or ID
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "vendors": [
    {
      "id": "vendor-uuid",
      "email": "vendor@example.com",
      "full_name": "Jane Smith",
      "status": "active",
      "phone": "+44 123 456 7890",
      "created_at": "2024-01-01T00:00:00Z",
      "metadata": {
        "verification_status": "verified",
        "insurance_verified": true
      }
    }
  ],
  "page": 1,
  "limit": 50
}
```

### Get Vendor Details

**Endpoint:** `GET /api/admin/vendors/:vendorId`

**Response:**
```json
{
  "success": true,
  "vendor": {
    "id": "vendor-uuid",
    "email": "vendor@example.com",
    "full_name": "Jane Smith",
    "role": "vendor",
    "status": "active",
    "phone": "+44 123 456 7890",
    "created_at": "2024-01-01T00:00:00Z",
    "metadata": {}
  },
  "credits": {
    "available_credits": 50,
    "total_purchased_credits": 100,
    "total_spent_credits": 50,
    "expires_at": "2024-12-31T23:59:59Z"
  },
  "revenue": {
    "count": 25,
    "total": 12500.00
  }
}
```

### Update Vendor Status

**Endpoint:** `PATCH /api/admin/vendors/:vendorId/status`

**Required Role:** SUPPORT_ROLES

**Request Body:**
```json
{
  "status": "suspended",
  "reason": "Insurance expired"
}
```

**Valid Statuses:**
- `active` - Normal operation
- `suspended` - Temporary suspension
- `restricted` - Limited functionality
- `pending` - Awaiting approval
- `rejected` - Application rejected

### Request Vendor Re-verification

**Endpoint:** `POST /api/admin/vendors/:vendorId/reverify`

**Required Role:** TRUST_SAFETY_ROLES

**Request Body:**
```json
{
  "reason": "Annual compliance check"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor re-verification requested"
}
```

### Get Pending Vendors

**Endpoint:** `GET /api/admin/vendors/pending`

**Response:**
```json
{
  "success": true,
  "vendors": [
    {
      "id": "vendor-uuid",
      "email": "new@vendor.com",
      "full_name": "New Vendor",
      "phone": "+44 123 456 7890",
      "created_at": "2024-01-15T10:30:00Z",
      "metadata": {
        "trade_category": "plumbing",
        "years_experience": 5
      }
    }
  ]
}
```

### Approve Vendor

**Endpoint:** `POST /api/admin/vendors/:vendorId/approve`

**Required Role:** TRUST_SAFETY_ROLES

**Request Body:**
```json
{
  "notes": "All documents verified"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor approved"
}
```

### Reject Vendor

**Endpoint:** `POST /api/admin/vendors/:vendorId/reject`

**Required Role:** TRUST_SAFETY_ROLES

**Request Body:**
```json
{
  "reason": "Insurance documentation incomplete"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vendor rejected"
}
```

---

## Review Moderation

### Get Pending Reviews

**Endpoint:** `GET /api/admin/reviews/pending`

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "review-uuid",
      "rating": 5,
      "comment": "Great service!",
      "created_at": "2024-01-15T10:30:00Z",
      "job_id": "job-uuid",
      "customer_id": "customer-uuid",
      "vendor_id": "vendor-uuid",
      "customer_name": "John Doe",
      "vendor_name": "Jane Smith"
    }
  ]
}
```

### Moderate Review

**Endpoint:** `PATCH /api/admin/reviews/:reviewId/moderate`

**Required Role:** TRUST_SAFETY_ROLES

**Request Body:**
```json
{
  "action": "approve",
  "reason": "Appropriate content"
}
```

**Valid Actions:**
- `approve` - Make review visible
- `hide` - Hide from public view
- `remove` - Delete review permanently

**Response:**
```json
{
  "success": true,
  "message": "Review approved"
}
```

---

## Jobs & Leads

### List Bids

**Endpoint:** `GET /api/admin/bids`

**Query Parameters:**
- `status` (optional): Filter by bid status
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "bids": [
    {
      "id": "bid-uuid",
      "quote_id": "quote-uuid",
      "vendor_id": "vendor-uuid",
      "amount": 500.00,
      "status": "pending",
      "quote_title": "Plumbing repair",
      "service_type": "plumbing",
      "customer_id": "customer-uuid",
      "customer_name": "John Doe",
      "vendor_name": "Jane Smith"
    }
  ]
}
```

### List Jobs

**Endpoint:** `GET /api/admin/jobs`

**Query Parameters:**
- `status` (optional): Filter by job status
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job-uuid",
      "title": "Plumbing repair",
      "status": "open",
      "trade_category": "plumbing",
      "postcode": "SW1A 1AA",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### List Leads

**Endpoint:** `GET /api/admin/leads`

**Query Parameters:**
- `status` (optional): Filter by lead status
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "leads": [
    {
      "id": "lead-uuid",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "job_title": "Plumbing repair",
      "postcode": "SW1A 1AA",
      "vendor_name": "Jane Smith"
    }
  ]
}
```

---

## Lead Pricing

### Get Pricing Tiers

**Endpoint:** `GET /api/admin/lead-pricing/tiers`

**Response:**
```json
{
  "success": true,
  "tiers": [
    {
      "id": 1,
      "tier_name": "Standard",
      "budget_min": 0,
      "budget_max": 500,
      "base_price": 15.00,
      "description": "Standard lead tier"
    },
    {
      "id": 2,
      "tier_name": "Premium",
      "budget_min": 501,
      "budget_max": 2000,
      "base_price": 35.00,
      "description": "Premium lead tier"
    }
  ]
}
```

### Update Pricing Tier

**Endpoint:** `PATCH /api/admin/lead-pricing/tiers/:tierId`

**Required Role:** SUPER_ROLES

**Request Body:**
```json
{
  "base_price": 20.00,
  "budget_min": 0,
  "budget_max": 600,
  "description": "Updated standard tier"
}
```

**Response:**
```json
{
  "success": true,
  "tier": {
    "id": 1,
    "tier_name": "Standard",
    "base_price": 20.00,
    "budget_min": 0,
    "budget_max": 600,
    "description": "Updated standard tier"
  }
}
```

### Get Pricing Rules

**Endpoint:** `GET /api/admin/lead-pricing/rules`

**Response:**
```json
{
  "success": true,
  "rules": [
    {
      "id": 1,
      "category": "plumbing",
      "min_budget": 0,
      "max_budget": 1000,
      "base_credit_cost": 15,
      "urgency_multiplier": 1.5,
      "quality_bonus_min_score": 4.5,
      "quality_bonus_credit_cost": 10,
      "region": "all",
      "active": true
    }
  ]
}
```

### Update Pricing Rule

**Endpoint:** `PATCH /api/admin/lead-pricing/rules/:ruleId`

**Required Role:** SUPER_ROLES

**Request Body:**
```json
{
  "base_credit_cost": 20,
  "urgency_multiplier": 1.8,
  "quality_bonus_min_score": 4.7,
  "quality_bonus_credit_cost": 12,
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "rule": {
    "id": 1,
    "base_credit_cost": 20,
    "urgency_multiplier": 1.8,
    "quality_bonus_min_score": 4.7,
    "quality_bonus_credit_cost": 12,
    "active": true
  }
}
```

---

## Platform Settings

### Get Platform Settings

**Endpoint:** `GET /api/admin/platform/settings`

**Response:**
```json
{
  "success": true,
  "settings": [
    {
      "key": "maintenance_mode",
      "value": "false",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "key": "max_leads_per_vendor",
      "value": "10",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Update Platform Settings

**Endpoint:** `PUT /api/admin/platform/settings`

**Required Role:** SUPER_ROLES

**Request Body:**
```json
{
  "settings": {
    "maintenance_mode": false,
    "max_leads_per_vendor": 15,
    "auto_approve_vendors": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Platform settings updated"
}
```

---

## Admin Management

### List All Admins

**Endpoint:** `GET /api/admin/admins`

**Response:**
```json
{
  "success": true,
  "admins": [
    {
      "id": "admin-uuid",
      "full_name": "Super Admin",
      "email": "admin@tradematch.ukm",
      "role": "super_admin",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Admin

**Endpoint:** `POST /api/admin/admins`

**Required Role:** SUPER_ROLES

**Request Body:**
```json
{
  "full_name": "New Admin",
  "email": "newadmin@tradematch.ukm",
  "temporary_password": "TempPass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin account created successfully",
  "admin_id": "new-admin-uuid"
}
```

### Remove Admin

**Endpoint:** `DELETE /api/admin/admins/:adminId`

**Required Role:** SUPER_ROLES

**Response:**
```json
{
  "success": true,
  "message": "Admin account removed successfully"
}
```

**Note:** Cannot remove your own admin account.

### Change Password

**Endpoint:** `POST /api/admin/change-password`

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Finance Operations

**Base URL:** `/api/admin/finance`

### Get Refund Reason Codes

**Endpoint:** `GET /api/admin/finance/reason-codes`

**Response:**
```json
{
  "success": true,
  "reasons": [
    {
      "code": "duplicate_charge",
      "description": "Duplicate charge",
      "severity": "low"
    },
    {
      "code": "service_not_delivered",
      "description": "Service not delivered",
      "severity": "high"
    },
    {
      "code": "quality_issue",
      "description": "Quality issue",
      "severity": "medium"
    },
    {
      "code": "fraud_suspected",
      "description": "Fraud suspected",
      "severity": "critical"
    },
    {
      "code": "goodwill",
      "description": "Goodwill gesture",
      "severity": "low"
    },
    {
      "code": "pricing_error",
      "description": "Pricing error",
      "severity": "medium"
    },
    {
      "code": "vendor_dispute",
      "description": "Vendor dispute",
      "severity": "high"
    },
    {
      "code": "other",
      "description": "Other",
      "severity": "low"
    }
  ]
}
```

### Process Refund

**Endpoint:** `POST /api/admin/finance/refunds`

**Required Role:** FINANCE_ROLES

**Headers:**
- `Idempotency-Key` (optional): Prevent duplicate refunds

**Request Body:**
```json
{
  "paymentId": "payment-uuid",
  "stripePaymentIntentId": "pi_1234567890",
  "amount": 50.00,
  "reasonCode": "service_not_delivered",
  "memo": "Customer complaint resolved"
}
```

**Response:**
```json
{
  "success": true,
  "refundId": "refund-uuid",
  "stripeRefundId": "re_1234567890"
}
```

### Issue Vendor Credits

**Endpoint:** `POST /api/admin/finance/credits`

**Required Role:** FINANCE_ROLES

**Request Body:**
```json
{
  "vendorId": "vendor-uuid",
  "amount": 100.00,
  "origin": "goodwill",
  "expiresAt": "2024-12-31T23:59:59Z",
  "memo": "Apology for service disruption"
}
```

**Response:**
```json
{
  "success": true,
  "creditId": "credit-uuid"
}
```

### Consume Vendor Credits

**Endpoint:** `POST /api/admin/finance/credits/consume`

**Required Role:** FINANCE_ROLES

**Request Body:**
```json
{
  "vendorId": "vendor-uuid",
  "amount": 25.00,
  "usedFor": "lead_purchase"
}
```

**Response:**
```json
{
  "success": true,
  "requested": 2500,
  "consumed": 2500,
  "remaining": 0
}
```

### Expire Credits

**Endpoint:** `POST /api/admin/finance/credits/expire`

**Required Role:** FINANCE_ROLES

**Response:**
```json
{
  "success": true,
  "expiredCount": 5
}
```

### Query Ledger

**Endpoint:** `GET /api/admin/finance/ledger`

**Query Parameters:**
- `userId` (optional): Filter by user
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "entries": [
    {
      "id": "entry-uuid",
      "related_stripe_object": "pi_1234567890",
      "user_id": "user-uuid",
      "amount_cents": 5000,
      "currency": "GBP",
      "entry_type": "refund_succeeded",
      "reason_code": "service_not_delivered",
      "created_by": "admin-uuid",
      "idempotency_key": "idem-key-uuid",
      "metadata": {},
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Basic Reconciliation

**Endpoint:** `GET /api/admin/finance/reconciliation`

**Query Parameters:**
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter

**Response:**
```json
{
  "success": true,
  "ledgerTotalCents": 125000
}
```

### Reconciliation Report

**Endpoint:** `GET /api/admin/finance/reconciliation/report`

**Query Parameters:**
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter

**Response:**
```json
{
  "success": true,
  "ledger": {
    "charges": 150000,
    "refunds": -25000,
    "net": 125000
  },
  "unresolvedRefunds": [
    {
      "id": "refund-uuid",
      "stripe_payment_intent_id": "pi_1234567890",
      "amount_cents": 5000,
      "status": "pending",
      "reason_code": "service_not_delivered",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Transaction-Level Reconciliation

**Endpoint:** `GET /api/admin/finance/reconciliation/transactions`

**Query Parameters:**
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `limit` (optional): Number of results (default: 100)

**Response:**
```json
{
  "success": true,
  "unmatchedStripe": [...],
  "ledgerMissingStripe": [...],
  "stripeCount": 150,
  "ledgerMatchedCount": 148
}
```

### Payment-Level Reconciliation

**Endpoint:** `GET /api/admin/finance/reconciliation/payments`

**Response:**
```json
{
  "success": true,
  "paymentsMissingLedger": [...],
  "ledgerOrphans": [...],
  "paymentCount": 200,
  "ledgerMatchedCount": 198
}
```

### Stripe Data

**Endpoint:** `GET /api/admin/finance/stripe/payments`

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "pi_1234567890",
      "amount": 5000,
      "currency": "gbp",
      "status": "succeeded",
      "created": 1705312200,
      "customer": "cus_1234567890",
      "description": "Lead purchase"
    }
  ]
}
```

**Endpoint:** `GET /api/admin/finance/stripe/subscriptions`

**Response:**
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": "sub_1234567890",
      "status": "active",
      "customer": "cus_1234567890",
      "current_period_start": 1705312200,
      "current_period_end": 1707988200,
      "created": 1705312200
    }
  ]
}
```

**Endpoint:** `GET /api/admin/finance/stripe/refunds`

**Response:**
```json
{
  "success": true,
  "refunds": [
    {
      "id": "re_1234567890",
      "amount": 5000,
      "currency": "gbp",
      "status": "succeeded",
      "payment_intent": "pi_1234567890",
      "created": 1705312200
    }
  ]
}
```

---

## Audit Logging

### Get Audit Log

**Endpoint:** `GET /api/admin/audit`

**Query Parameters:**
- `days` (optional): Number of days to retrieve (default: 30)
- `action` (optional): Filter by action type
- `target_type` (optional): Filter by target type
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "audit-uuid",
      "admin_id": "admin-uuid",
      "action": "vendor_approved",
      "target_type": "user",
      "target_id": "vendor-uuid",
      "details": {
        "notes": "All documents verified"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "admin_email": "admin@tradematch.ukm"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 20
}
```

### Actions Tracked

The following actions are automatically logged:

| Action | Description | Target Type |
|--------|-------------|-------------|
| `user_status_change` | User status updated | user |
| `vendor_status_change` | Vendor status updated | vendor |
| `vendor_reverify_requested` | Re-verification requested | vendor |
| `vendor_approved` | Vendor application approved | user |
| `vendor_rejected` | Vendor application rejected | user |
| `review_moderated` | Review approved/hidden/removed | review |
| `lead_pricing_tier_updated` | Pricing tier modified | lead_pricing_tier |
| `lead_pricing_rule_updated` | Pricing rule modified | lead_pricing_rule |
| `platform_settings_updated` | Platform settings changed | platform_settings |
| `admin_created` | New admin account created | admin |
| `admin_removed` | Admin account removed | admin |
| `password_changed` | Admin password changed | admin |
| `finance_refund_requested` | Refund initiated | payment |
| `finance_credit_issued` | Credits issued to vendor | vendor |
| `finance_credit_consumed` | Credits consumed | vendor |
| `finance_credit_expired` | Credits expired | credit_lot |

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error |

### Common Error Responses

```json
{
  "error": "Failed to fetch stats",
  "code": "DB_ERROR"
}
```

```json
{
  "error": "Invalid status",
  "code": "VALIDATION_ERROR"
}
```

```json
{
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

```json
{
  "error": "Cannot remove your own admin account",
  "code": "FORBIDDEN"
}
```

---

## Database Schema

### admin_audit_log Table

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at);
```

### finance_ledger_entries Table

```sql
CREATE TABLE finance_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_stripe_object VARCHAR(255),
  user_id UUID REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  entry_type VARCHAR(50) NOT NULL,
  reason_code VARCHAR(100),
  created_by UUID REFERENCES users(id),
  idempotency_key VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### finance_credit_lots Table

```sql
CREATE TABLE finance_credit_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  remaining_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  origin VARCHAR(100) NOT NULL,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  memo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### finance_refunds Table

```sql
CREATE TABLE finance_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id),
  stripe_payment_intent_id VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  status VARCHAR(50) NOT NULL,
  reason_code VARCHAR(100),
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  memo TEXT,
  idempotency_key VARCHAR(255),
  stripe_refund_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Best Practices

### Security

1. **Always use HTTPS** in production
2. **Implement MFA** for all admin accounts
3. **Rotate passwords** regularly
4. **Review audit logs** weekly
5. **Limit super_admin** accounts to essential personnel only

### Performance

1. Use pagination for all list endpoints
2. Cache dashboard stats for 5 minutes
3. Use filters to reduce data transfer
4. Implement rate limiting on sensitive operations

### Compliance

1. Log all administrative actions
2. Include reason codes for all status changes
3. Maintain immutable audit trails
4. Regular reconciliation of financial data
5. GDPR compliance for user data export/deletion

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**API Version:** v1
