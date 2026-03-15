# TradeMatch API Documentation

## Overview

The TradeMatch API provides RESTful endpoints for managing tradespeople marketplace operations including user authentication, quote management, bidding, payments, and real-time messaging.

**Base URL**: `https://api.tradematch.uk/api`

**WebSocket URL**: `wss://api.tradematch.uk`

## Authentication

All API requests (except public endpoints) require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### JWT Token

Tokens expire after 7 days. Use the `/auth/refresh` endpoint to get a new token before expiration.

## Rate Limiting

- General: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- Quote creation: 10 requests per hour
- File uploads: 20 requests per hour

## WebSocket Real-Time Updates

Connect to WebSocket for instant notifications:

```javascript
const ws = new WebSocket('wss://api.tradematch.uk?token=<your-token>');

ws.onopen = () => console.log('Connected');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch(data.type) {
    case 'new_message':
      // Handle new message
      break;
    case 'stats_update':
      // Handle dashboard stats update
      break;
    case 'new_lead':
      // Handle new lead for vendor
      break;
    case 'notification':
      // Handle notification
      break;
  }
};
```

## Endpoints

### Authentication

#### POST `/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Smith",
  "userType": "customer" // or "vendor"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Smith",
    "userType": "customer"
  }
}
```

#### POST `/auth/login`
Authenticate user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### POST `/auth/refresh`
Refresh JWT token.

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "7d"
}
```

### Quotes (Customer)

#### GET `/customer/quotes`
Get all quotes for authenticated customer.

**Query Parameters:**
- `status` (optional): Filter by status (open, pending, accepted, completed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "quotes": [
    {
      "id": "qte_123",
      "title": "Fix leaking pipe",
      "description": "Kitchen sink pipe is leaking",
      "serviceType": "Plumbing",
      "budgetMin": 100,
      "budgetMax": 300,
      "status": "open",
      "createdAt": "2024-01-15T10:30:00Z",
      "bids": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### POST `/customer/quotes`
Create a new quote.

**Request Body:**
```json
{
  "serviceType": "Plumbing",
  "title": "Fix leaking pipe",
  "description": "Kitchen sink pipe is leaking",
  "postcode": "SW1A 1AA",
  "budgetMin": 100,
  "budgetMax": 300,
  "urgency": "within_week"
}
```

#### POST `/customer/accept-bid`
Accept a vendor's bid.

**Request Body:**
```json
{
  "bidId": "bid_456"
}
```

### Bidding (Vendor)

#### GET `/vendor/quotes`
Get available quotes for vendors to bid on.

**Query Parameters:**
- `serviceType` (optional): Filter by service type
- `postcode` (optional): Filter by location
- `page` (optional): Page number
- `limit` (optional): Items per page

#### POST `/bids`
Submit a bid on a quote.

**Request Body:**
```json
{
  "quoteId": "qte_123",
  "price": 200,
  "message": "I can fix this within 2 days. Includes parts and labor.",
  "estimatedDuration": "2-3 hours",
  "availability": "Available weekdays 9am-5pm"
}
```

### Leads (Vendor)

#### GET `/leads/offered`
Get leads offered to the authenticated vendor.

**Response:**
```json
{
  "success": true,
  "leads": [
    {
      "id": "ld_123",
      "quoteId": "qte_456",
      "serviceType": "Electrical",
      "location": "SW1",
      "budget": "£200-£400",
      "leadCost": 15,
      "expiresAt": "2024-01-16T10:30:00Z",
      "status": "offered"
    }
  ]
}
```

#### POST `/leads/:quoteId/accept`
Accept a lead (charges credits).

#### POST `/leads/:quoteId/decline`
Decline a lead (no charge).

### Messaging

#### GET `/messaging/conversations`
Get all conversations for the authenticated user.

#### POST `/messaging/conversations`
Create a new conversation.

**Request Body:**
```json
{
  "participantIds": ["usr_123", "usr_456"],
  "type": "job",
  "quoteId": "qte_789"
}
```

#### GET `/messaging/conversations/:id/messages`
Get messages for a conversation.

**Query Parameters:**
- `page`: Page number
- `limit`: Messages per page (default: 50)

#### POST `/messaging/conversations/:id/messages`
Send a message in a conversation.

**Request Body:**
```json
{
  "body": "Hello, when can you start?",
  "messageType": "text",
  "attachments": []
}
```

### Payments

#### POST `/payments/create-intent`
Create a Stripe payment intent.

**Request Body:**
```json
{
  "quoteId": "qte_123",
  "amount": 200,
  "currency": "GBP"
}
```

#### POST `/payments/confirm`
Confirm payment after Stripe checkout.

**Request Body:**
```json
{
  "paymentIntentId": "pi_123",
  "quoteId": "qte_123"
}
```

#### POST `/payments/release-escrow`
Release escrow payment to vendor.

**Request Body:**
```json
{
  "quoteId": "qte_123",
  "milestoneId": "ml_456"
}
```

### Analytics

#### GET `/analytics/dashboard`
Get vendor dashboard analytics.

**Query Parameters:**
- `period`: Days to include (default: 30)

**Response:**
```json
{
  "success": true,
  "period": "Last 30 days",
  "metrics": {
    "quotesViewed": 45,
    "bidsSubmitted": 12,
    "jobsWon": 8,
    "revenue": 2400.00,
    "winRate": 66.67
  },
  "charts": {
    "revenueByMonth": [...],
    "serviceStats": [...]
  }
}
```

### Admin

#### GET `/admin/stats`
Get platform statistics.

#### GET `/admin/users`
List all users.

#### GET `/admin/vendors`
List all vendors.

#### POST `/admin/vendors/:id/approve`
Approve a vendor.

#### POST `/admin/vendors/:id/reject`
Reject a vendor.

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common Error Codes

- `NO_TOKEN` - Missing authentication token
- `INVALID_TOKEN` - Invalid or expired token
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `FORBIDDEN` - Access denied
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `DB_ERROR` - Database error

## WebSocket Events

### Client to Server

- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a message
- `typing` - Send typing indicator
- `mark_read` - Mark messages as read
- `ping` - Keep connection alive

### Server to Client

- `new_message` - New message received
- `typing` - User is typing
- `message_read` - Message was read
- `stats_update` - Dashboard stats updated
- `new_lead` - New lead available
- `quote_update` - Quote status changed
- `bid_update` - Bid status changed
- `notification` - New notification
- `user_joined` / `user_left` - Presence events

## File Uploads

### POST `/uploads/presign`
Get presigned URL for S3 upload.

**Request Body:**
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "folder": "documents"
}
```

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://s3.amazonaws.com/...",
  "key": "documents/uuid_filename.pdf",
  "url": "https://bucket.s3.region.amazonaws.com/documents/uuid_filename.pdf"
}
```

Upload file directly to S3 using the presigned URL, then notify the API.

## Testing

### Health Check

```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### Test Credentials

For testing purposes:
- Test Customer: `test.customer@example.com` / `TestPass123!`
- Test Vendor: `test.vendor@example.com` / `TestPass123!`

## SDKs

### JavaScript

```javascript
// Install: npm install tradematch-sdk

import { TradeMatchClient } from 'tradematch-sdk';

const client = new TradeMatchClient({
  apiUrl: 'https://api.tradematch.uk',
  token: 'your-jwt-token'
});

// Get quotes
const quotes = await client.quotes.list();

// Create quote
const quote = await client.quotes.create({
  serviceType: 'Plumbing',
  title: 'Fix leak',
  description: '...',
  postcode: 'SW1A 1AA',
  budgetMin: 100,
  budgetMax: 300
});

// Connect to WebSocket
const ws = client.connectWebSocket();
ws.on('newMessage', (msg) => console.log(msg));
```

## Support

- API Issues: api-support@tradematch.uk
- Documentation: docs.tradematch.uk
- Status Page: status.tradematch.uk
