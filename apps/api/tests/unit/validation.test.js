const { validate, validators, handleValidationErrors } = require('../../middleware/validation');
const { validationResult } = require('express-validator');

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('handleValidationErrors', () => {
    it('should call next if no validation errors', () => {
      // Mock validationResult to return empty array
      jest.spyOn(require('express-validator'), 'validationResult').mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      handleValidationErrors(mockReq, mockRes, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors if validation fails', () => {
      const errors = [
        { path: 'email', msg: 'Valid email is required', value: 'invalid' },
        { path: 'password', msg: 'Password must be at least 8 characters', value: 'short' }
      ];

      jest.spyOn(require('express-validator'), 'validationResult').mockReturnValue({
        isEmpty: () => false,
        array: () => errors
      });

      handleValidationErrors(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.map(e => ({
          field: e.path,
          message: e.msg,
          value: e.value
        }))
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('validators', () => {
    describe('email validator', () => {
      it('should accept valid email', async () => {
        mockReq.body = { email: 'test@example.com' };
        await validators.email.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(true);
      });

      it('should reject invalid email', async () => {
        mockReq.body = { email: 'invalid-email' };
        await validators.email.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(false);
        expect(result.array()[0].msg).toBe('Valid email is required');
      });
    });

    describe('password validator', () => {
      it('should accept password with 8+ characters', async () => {
        mockReq.body = { password: 'securePass123' };
        await validators.password.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(true);
      });

      it('should reject short password', async () => {
        mockReq.body = { password: 'short' };
        await validators.password.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(false);
        expect(result.array()[0].msg).toBe('Password must be at least 8 characters');
      });
    });

    describe('postcode validator', () => {
      it('should accept valid UK postcode', async () => {
        mockReq.body = { postcode: 'SW1A 1AA' };
        await validators.postcode.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(true);
      });

      it('should accept lowercase postcode and normalize', async () => {
        mockReq.body = { postcode: 'sw1a 1aa' };
        await validators.postcode.run(mockReq);
        
        expect(mockReq.body.postcode).toBe('SW1A 1AA');
      });

      it('should reject invalid postcode', async () => {
        mockReq.body = { postcode: 'INVALID' };
        await validators.postcode.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(false);
      });
    });

    describe('companyName validator', () => {
      it('should accept valid company name', async () => {
        mockReq.body = { company_name: 'Test Company Ltd' };
        await validators.companyName.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(true);
      });

      it('should reject very short company name', async () => {
        mockReq.body = { company_name: 'A' };
        await validators.companyName.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(false);
        expect(result.array()[0].msg).toContain('2-100 characters');
      });

      it('should sanitize HTML characters', async () => {
        mockReq.body = { company_name: '<script>alert("xss")</script>Test' };
        await validators.companyName.run(mockReq);
        
        expect(mockReq.body.company_name).not.toContain('<');
        expect(mockReq.body.company_name).not.toContain('>');
      });
    });

    describe('bidAmount validator', () => {
      it('should accept valid bid amount', async () => {
        mockReq.body = { price: 150.50 };
        await validators.bidAmount.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(true);
      });

      it('should reject negative amount', async () => {
        mockReq.body = { price: -100 };
        await validators.bidAmount.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(false);
      });

      it('should reject amount over limit', async () => {
        mockReq.body = { price: 150000 };
        await validators.bidAmount.run(mockReq);
        
        const result = validationResult(mockReq);
        expect(result.isEmpty()).toBe(false);
      });
    });
  });

  describe('validate shortcuts', () => {
    it('should have all expected validation chains', () => {
      expect(validate.vendorProfile).toBeDefined();
      expect(validate.customerProfile).toBeDefined();
      expect(validate.bidSubmission).toBeDefined();
      expect(validate.reviewSubmission).toBeDefined();
      expect(validate.messageSend).toBeDefined();
      expect(validate.pagination).toBeDefined();
    });
  });
});
