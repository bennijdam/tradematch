const { Pool } = require('pg');

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'tradematch_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

// Global test pool
let testPool;

beforeAll(async () => {
  testPool = new Pool(testDbConfig);
  global.testPool = testPool;
});

afterAll(async () => {
  if (testPool) {
    await testPool.end();
  }
});

// Reset database state between tests
beforeEach(async () => {
  // Clear test data but keep structure
  await testPool.query(`
    TRUNCATE TABLE 
      analytics_events, 
      bid_views, 
      bids, 
      contract_audit, 
      contract_disputes, 
      contract_milestones, 
      contracts, 
      conversation_participants, 
      conversation_tags, 
      conversations, 
      credit_transactions, 
      dispute_evidence, 
      dispute_notes, 
      invoices, 
      lead_analytics_daily, 
      lead_distributions, 
      lead_qualification_scores, 
      messages, 
      notifications, 
      payment_milestones, 
      payments, 
      quotes, 
      reviews, 
      saved_trades, 
      system_events, 
      vendor_credits, 
      vendor_insurance, 
      vendor_lead_preferences, 
      vendor_performance_metrics, 
      vendor_spend_limits, 
      vendor_trade_registrations,
      vendors
    CASCADE
  `);
});

// Helper functions
global.testHelpers = {
  createTestUser: async (userData = {}) => {
    const defaults = {
      email: `test_${Date.now()}@example.com`,
      name: 'Test User',
      password: 'hashedPassword123',
      user_type: 'customer',
      status: 'active'
    };
    const user = { ...defaults, ...userData };
    const result = await testPool.query(
      `INSERT INTO users (id, email, name, password, user_type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [`usr_${Date.now()}`, user.email, user.name, user.password, user.user_type, user.status]
    );
    return result.rows[0];
  },

  createTestVendor: async (vendorData = {}) => {
    const user = await global.testHelpers.createTestUser({
      user_type: 'vendor',
      ...vendorData.user
    });
    
    const defaults = {
      company_name: 'Test Company',
      services: ['Plumbing', 'Electrical'],
      postcode: 'SW1A 1AA'
    };
    const vendor = { ...defaults, ...vendorData.vendor };
    
    await testPool.query(
      `INSERT INTO vendors (id, user_id, company_name, services, postcode, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [`vnd_${Date.now()}`, user.id, vendor.company_name, JSON.stringify(vendor.services), vendor.postcode]
    );
    
    return user;
  },

  createTestQuote: async (customerId, quoteData = {}) => {
    const defaults = {
      title: 'Test Job',
      description: 'Test description',
      service_type: 'Plumbing',
      postcode: 'SW1A 1AA',
      budget_min: 100,
      budget_max: 500,
      status: 'open'
    };
    const quote = { ...defaults, ...quoteData };
    const result = await testPool.query(
      `INSERT INTO quotes (id, customer_id, title, description, service_type, postcode, budget_min, budget_max, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [`qte_${Date.now()}`, customerId, quote.title, quote.description, quote.service_type, 
       quote.postcode, quote.budget_min, quote.budget_max, quote.status]
    );
    return result.rows[0];
  },

  generateAuthToken: (userId, role = 'customer') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
  }
};
