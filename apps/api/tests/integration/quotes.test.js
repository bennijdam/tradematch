const request = require('supertest');
const express = require('express');
const quotesRouter = require('../../routes/quotes');

describe('Quotes API Integration', () => {
  let app;
  let pool;
  let authToken;
  let testUserId;

  beforeAll(async () => {
    pool = global.testPool;
    app = express();
    app.use(express.json());
    
    // Mock auth middleware for testing
    app.use((req, res, next) => {
      if (req.headers.authorization) {
        req.user = { userId: testUserId, role: 'customer' };
      }
      next();
    });
    
    quotesRouter.setPool(pool);
    app.use('/api/quotes', quotesRouter);

    // Create test user
    const user = await global.testHelpers.createTestUser({
      email: 'quote_test@example.com',
      user_type: 'customer'
    });
    testUserId = user.id;
    authToken = global.testHelpers.generateAuthToken(testUserId, 'customer');
  });

  describe('POST /api/quotes', () => {
    it('should create a new quote with valid data', async () => {
      const quoteData = {
        serviceType: 'Plumbing',
        title: 'Fix leaking pipe',
        description: 'Kitchen sink pipe is leaking',
        postcode: 'SW1A 1AA',
        budgetMin: 100,
        budgetMax: 300
      };

      const response = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quoteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.quote).toBeDefined();
      expect(response.body.quote.title).toBe(quoteData.title);
      expect(response.body.quote.service_type).toBe(quoteData.serviceType);
      expect(response.body.quote.status).toBe('open');
    });

    it('should reject quote creation without required fields', async () => {
      const response = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Incomplete quote'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject quote creation without authentication', async () => {
      const response = await request(app)
        .post('/api/quotes')
        .send({
          serviceType: 'Plumbing',
          title: 'Test quote'
        })
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should validate postcode format', async () => {
      const response = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceType: 'Plumbing',
          title: 'Test',
          description: 'Test',
          postcode: 'INVALID'
        })
        .expect(400);

      expect(response.body.error).toContain('Validation');
    });
  });

  describe('GET /api/quotes', () => {
    beforeEach(async () => {
      // Create test quotes
      await global.testHelpers.createTestQuote(testUserId, {
        title: 'Quote 1',
        service_type: 'Plumbing',
        status: 'open'
      });
      await global.testHelpers.createTestQuote(testUserId, {
        title: 'Quote 2',
        service_type: 'Electrical',
        status: 'open'
      });
    });

    it('should return list of quotes for authenticated user', async () => {
      const response = await request(app)
        .get('/api/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.quotes)).toBe(true);
      expect(response.body.quotes.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter quotes by service type', async () => {
      const response = await request(app)
        .get('/api/quotes?serviceType=Plumbing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.quotes.every(q => q.service_type === 'Plumbing')).toBe(true);
    });

    it('should filter quotes by status', async () => {
      const response = await request(app)
        .get('/api/quotes?status=open')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.quotes.every(q => q.status === 'open')).toBe(true);
    });
  });

  describe('GET /api/quotes/:id', () => {
    let testQuote;

    beforeEach(async () => {
      testQuote = await global.testHelpers.createTestQuote(testUserId, {
        title: 'Single Quote Test',
        service_type: 'Plumbing'
      });
    });

    it('should return specific quote by ID', async () => {
      const response = await request(app)
        .get(`/api/quotes/${testQuote.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testQuote.id);
      expect(response.body.title).toBe(testQuote.title);
    });

    it('should return 404 for non-existent quote', async () => {
      const response = await request(app)
        .get('/api/quotes/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/quotes/:id', () => {
    let testQuote;

    beforeEach(async () => {
      testQuote = await global.testHelpers.createTestQuote(testUserId, {
        title: 'Original Title',
        status: 'open'
      });
    });

    it('should update quote with valid data', async () => {
      const response = await request(app)
        .put(`/api/quotes/${testQuote.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.quote.title).toBe('Updated Title');
    });

    it('should prevent updating closed quote', async () => {
      // Close the quote first
      await pool.query(
        "UPDATE quotes SET status = 'closed' WHERE id = $1",
        [testQuote.id]
      );

      const response = await request(app)
        .put(`/api/quotes/${testQuote.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Title' })
        .expect(409);

      expect(response.body.error).toContain('closed');
    });
  });

  describe('DELETE /api/quotes/:id', () => {
    let testQuote;

    beforeEach(async () => {
      testQuote = await global.testHelpers.createTestQuote(testUserId, {
        status: 'open'
      });
    });

    it('should delete open quote', async () => {
      const response = await request(app)
        .delete(`/api/quotes/${testQuote.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const check = await pool.query(
        'SELECT * FROM quotes WHERE id = $1',
        [testQuote.id]
      );
      expect(check.rows.length).toBe(0);
    });

    it('should not delete quote with bids', async () => {
      // Add a bid
      await pool.query(
        `INSERT INTO bids (id, quote_id, vendor_id, price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [`bid_${Date.now()}`, testQuote.id, 'vendor_123', 100, 'pending']
      );

      const response = await request(app)
        .delete(`/api/quotes/${testQuote.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.error).toContain('bids');
    });
  });
});
