const { authenticate, requireVendor, requireCustomer, requireAdmin } = require('../../middleware/auth');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('authenticate', () => {
    it('should reject request with no token', async () => {
      await authenticate(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      mockReq.headers.authorization = 'InvalidFormat';
      
      await authenticate(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'usr_123', role: 'customer' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );
      mockReq.headers.authorization = `Bearer ${expiredToken}`;
      
      await authenticate(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        })
      );
    });

    it('should accept valid token and set user', async () => {
      const validToken = jwt.sign(
        { userId: 'usr_123', role: 'customer', email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;
      
      await authenticate(mockReq, mockRes, nextFunction);
      
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.userId).toBe('usr_123');
      expect(mockReq.user.role).toBe('customer');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireVendor', () => {
    it('should reject non-vendor users', () => {
      mockReq.user = { userId: 'usr_123', role: 'customer' };
      
      requireVendor(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Vendor access required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow vendor users', () => {
      mockReq.user = { userId: 'usr_123', role: 'vendor' };
      
      requireVendor(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireCustomer', () => {
    it('should reject non-customer users', () => {
      mockReq.user = { userId: 'usr_123', role: 'vendor' };
      
      requireCustomer(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Customer access required'
      });
    });

    it('should allow customer users', () => {
      mockReq.user = { userId: 'usr_123', role: 'customer' };
      
      requireCustomer(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should reject non-admin users', () => {
      mockReq.user = { userId: 'usr_123', role: 'customer' };
      
      requireAdmin(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Admin access required'
      });
    });

    it('should allow admin users', () => {
      mockReq.user = { userId: 'usr_123', role: 'admin' };
      
      requireAdmin(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow super_admin users', () => {
      mockReq.user = { userId: 'usr_123', role: 'super_admin' };
      
      requireAdmin(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
