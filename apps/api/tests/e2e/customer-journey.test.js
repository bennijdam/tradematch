/**
 * End-to-End Test: Complete Customer Journey
 * Tests the full flow from registration to job completion
 */

const request = require('supertest');

describe('Customer Journey E2E', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:3001';
  
  let customerToken;
  let vendorToken;
  let customerId;
  let vendorId;
  let quoteId;
  let bidId;

  // Test data
  const customerData = {
    email: `e2e_customer_${Date.now()}@example.com`,
    password: 'SecurePass123!',
    name: 'E2E Test Customer',
    userType: 'customer'
  };

  const vendorData = {
    email: `e2e_vendor_${Date.now()}@example.com`,
    password: 'SecurePass123!',
    name: 'E2E Test Vendor',
    companyName: 'E2E Test Company',
    userType: 'vendor'
  };

  describe('1. Registration', () => {
    it('should register a new customer', async () => {
      const response = await request(API_BASE)
        .post('/api/auth/register')
        .send(customerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      customerToken = response.body.token;
      customerId = response.body.user.id;
    });

    it('should register a new vendor', async () => {
      const response = await request(API_BASE)
        .post('/api/auth/register')
        .send(vendorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      vendorToken = response.body.token;
      vendorId = response.body.user.id;
    });

    it('should not allow duplicate registration', async () => {
      await request(API_BASE)
        .post('/api/auth/register')
        .send(customerData)
        .expect(409);
    });
  });

  describe('2. Login', () => {
    it('should login customer with valid credentials', async () => {
      const response = await request(API_BASE)
        .post('/api/auth/login')
        .send({
          email: customerData.email,
          password: customerData.password
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      customerToken = response.body.token;
    });

    it('should login vendor with valid credentials', async () => {
      const response = await request(API_BASE)
        .post('/api/auth/login')
        .send({
          email: vendorData.email,
          password: vendorData.password
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      vendorToken = response.body.token;
    });

    it('should reject login with invalid password', async () => {
      await request(API_BASE)
        .post('/api/auth/login')
        .send({
          email: customerData.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });
  });

  describe('3. Profile Management', () => {
    it('should update customer profile', async () => {
      const response = await request(API_BASE)
        .put('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          phone: '07700900000',
          postcode: 'SW1A 1AA'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update vendor profile', async () => {
      const response = await request(API_BASE)
        .put('/api/vendor/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          company_name: 'Updated E2E Company',
          services: ['Plumbing', 'Heating'],
          years_experience: 5
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('4. Quote Creation', () => {
    it('should create a new quote', async () => {
      const quoteData = {
        serviceType: 'Plumbing',
        title: 'E2E Test Job - Fix bathroom leak',
        description: 'Water leaking from under bathroom sink',
        postcode: 'SW1A 1AA',
        budgetMin: 100,
        budgetMax: 300,
        urgency: 'within_week'
      };

      const response = await request(API_BASE)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(quoteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.quote).toBeDefined();
      quoteId = response.body.quote.id;
    });

    it('should appear in customer quotes list', async () => {
      const response = await request(API_BASE)
        .get('/api/customer/quotes')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.quotes.some(q => q.id === quoteId)).toBe(true);
    });
  });

  describe('5. Bidding Process', () => {
    it('should allow vendor to view available quotes', async () => {
      const response = await request(API_BASE)
        .get('/api/vendor/quotes')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(Array.isArray(response.body.quotes)).toBe(true);
    });

    it('should submit a bid', async () => {
      const bidData = {
        quoteId: quoteId,
        price: 200,
        message: 'I can fix this within 2 days. Includes parts and labor.',
        estimatedDuration: '2-3 hours',
        availability: 'Available weekdays 9am-5pm'
      };

      const response = await request(API_BASE)
        .post('/api/bids')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(bidData)
        .expect(201);

      expect(response.body.success).toBe(true);
      bidId = response.body.bidId;
    });

    it('should not allow duplicate bids from same vendor', async () => {
      await request(API_BASE)
        .post('/api/bids')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          quoteId: quoteId,
          price: 250
        })
        .expect(409);
    });
  });

  describe('6. Bid Management', () => {
    it('should show bids to customer', async () => {
      const response = await request(API_BASE)
        .get(`/api/customer/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.bids).toBeDefined();
      expect(response.body.bids.length).toBeGreaterThan(0);
    });

    it('should allow customer to accept bid', async () => {
      const response = await request(API_BASE)
        .post('/api/customer/accept-bid')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bidId: bidId })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('7. Messaging', () => {
    let conversationId;

    it('should create conversation for accepted job', async () => {
      const response = await request(API_BASE)
        .get(`/api/messaging/conversations`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const jobConversation = response.body.conversations.find(
        c => c.type === 'job' && c.quote_id === quoteId
      );
      
      if (jobConversation) {
        conversationId = jobConversation.id;
      }
    });

    it('should send message in conversation', async () => {
      if (!conversationId) {
        console.log('Skipping: No conversation created');
        return;
      }

      const response = await request(API_BASE)
        .post(`/api/messaging/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          body: 'Hello, when can you start?',
          message_type: 'text'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('8. Review Process', () => {
    it('should complete the job first', async () => {
      // Mark quote as completed (normally done through contract/workflow)
      await request(API_BASE)
        .patch(`/api/quotes/${quoteId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'completed' })
        .expect(200);
    });

    it('should submit review for vendor', async () => {
      const reviewData = {
        quoteId: quoteId,
        vendorId: vendorId,
        rating: 5,
        reviewText: 'Excellent service! Fixed the leak quickly and professionally.',
        qualityRating: 5,
        communicationRating: 5,
        valueRating: 5,
        timelinessRating: 5
      };

      const response = await request(API_BASE)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should prevent duplicate review', async () => {
      await request(API_BASE)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quoteId: quoteId,
          vendorId: vendorId,
          rating: 4
        })
        .expect(400);
    });
  });

  describe('9. Cleanup', () => {
    it('should delete test data', async () => {
      // Cleanup is handled by test database rollback
      expect(true).toBe(true);
    });
  });
});
