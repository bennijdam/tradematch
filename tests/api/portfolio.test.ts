import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

/**
 * TradeMatch API: Portfolio Integration Template
 * @description Use this for all Controller and Route testing.
 * Guidelines:
 * 1. Mock External APIs (e.g., Price Feeders).
 * 2. Test for both "Authorized" and "Unauthorized" states.
 * 3. Validate the Shape of the JSON response.
 */

describe('API: GET /api/v1/portfolio', () => {
  let mockToken: string;

  beforeAll(async () => {
    // Setup: Create a test user and generate a JWT
    // This ensures Kimi always considers Auth logic.
    mockToken = 'bearer_token_here';
  });

  test('Success: Retrieve user portfolio with calculated totals', async () => {
    const response = await request(app)
      .get('/api/v1/portfolio')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(response.status).toBe(200);

    // Schema Validation: Ensure Kimi follows the TradeMatch data contract
    expect(response.body).toMatchObject({
      userId: expect.any(String),
      totalValue: expect.any(Number),
      holdings: expect.arrayContaining([
        expect.objectContaining({
          symbol: expect.any(String),
          quantity: expect.any(Number)
        })
      ])
    });
  });

  test('Security: Reject request without valid JWT', async () => {
    const response = await request(app).get('/api/v1/portfolio');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/unauthorized/i);
  });

  test('Edge Case: Handle empty portfolio gracefully', async () => {
    // Scenario: User exists but has no trades
    const response = await request(app)
      .get('/api/v1/portfolio')
      .set('Authorization', `Bearer ${mockToken}`);

    if (response.body.holdings.length === 0) {
      expect(response.body.totalValue).toBe(0);
    }
  });
});
