const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
        value: e.value
      }))
    });
  }
  next();
};

const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[<>]/g, '');
};

const validators = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  companyName: body('company_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be 2-100 characters')
    .customSanitizer(sanitizeString),

  phone: body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]{7,20}$/)
    .withMessage('Valid phone number required'),

  postcode: body('postcode')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}$/i)
    .withMessage('Valid UK postcode required'),

  description: body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description max 500 characters')
    .customSanitizer(sanitizeString),

  serviceAreas: body('service_areas')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Service areas max 500 characters'),

  services: body('services')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Max 20 services allowed'),

  yearsExperience: body('years_experience')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Years experience must be 0-100'),

  fullName: body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2-100 characters')
    .customSanitizer(sanitizeString),

  bidAmount: body('price')
    .isFloat({ min: 1, max: 100000 })
    .withMessage('Bid price must be between £1 and £100,000'),

  bidDescription: body('message')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message max 2000 characters')
    .customSanitizer(sanitizeString),

  reviewRating: body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be 1-5'),

  reviewComment: body('reviewText')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review text max 1000 characters')
    .customSanitizer(sanitizeString),

  messageBody: body('body')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be 1-2000 characters')
    .customSanitizer(sanitizeString),

  quoteId: param('quoteId')
    .isInt({ min: 1 })
    .withMessage('Invalid quote ID'),

  userId: param('userId')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID'),

  vendorId: param('vendorId')
    .isInt({ min: 1 })
    .withMessage('Invalid vendor ID'),

  bidId: param('bidId')
    .isInt({ min: 1 })
    .withMessage('Invalid bid ID'),

  reviewId: param('reviewId')
    .isInt({ min: 1 })
    .withMessage('Invalid review ID'),

  conversationId: param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID'),

  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),

  status: query('status')
    .optional()
    .isIn(['pending', 'active', 'completed', 'cancelled', 'open', 'closed'])
    .withMessage('Invalid status value'),

  amount: body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  currency: body('currency')
    .optional()
    .isIn(['GBP', 'USD', 'EUR'])
    .withMessage('Invalid currency'),

  title: body('title')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be 2-200 characters')
    .customSanitizer(sanitizeString),

  disputeReason: body('reason')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be 10-1000 characters')
    .customSanitizer(sanitizeString),

  searchQuery: query('q')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be 2-100 characters')
    .customSanitizer(sanitizeString),
};

const validate = {
  vendorProfile: [
    validators.companyName,
    validators.phone,
    validators.postcode,
    validators.description,
    validators.serviceAreas,
    validators.services,
    validators.yearsExperience,
    handleValidationErrors
  ],

  customerProfile: [
    validators.fullName,
    validators.phone,
    validators.postcode,
    handleValidationErrors
  ],

  bidSubmission: [
    validators.bidAmount,
    validators.bidDescription,
    handleValidationErrors
  ],

  bidUpdate: [
    validators.bidId,
    validators.bidAmount.optional(),
    validators.bidDescription.optional(),
    handleValidationErrors
  ],

  reviewSubmission: [
    validators.reviewRating,
    validators.reviewComment,
    handleValidationErrors
  ],

  reviewUpdate: [
    validators.reviewId,
    validators.reviewComment,
    handleValidationErrors
  ],

  messageSend: [
    validators.conversationId,
    validators.messageBody,
    handleValidationErrors
  ],

  payment: [
    validators.amount,
    validators.currency,
    handleValidationErrors
  ],

  dispute: [
    validators.quoteId,
    validators.disputeReason,
    handleValidationErrors
  ],

  pagination: [
    validators.page,
    validators.limit,
    handleValidationErrors
  ],

  userUpdate: [
    validators.userId,
    validators.fullName.optional(),
    validators.email.optional(),
    validators.phone.optional(),
    handleValidationErrors
  ],

  vendorAction: [
    validators.vendorId,
    handleValidationErrors
  ],

  search: [
    validators.searchQuery,
    handleValidationErrors
  ],

  archiveBid: [
    validators.bidId,
    handleValidationErrors
  ],

  acceptBid: [
    body('bidId').isInt({ min: 1 }).withMessage('Invalid bid ID'),
    handleValidationErrors
  ],

  updateAvailability: [
    body('is_available').isBoolean().withMessage('is_available must be boolean'),
    handleValidationErrors
  ],

  upload: [
    body('filename').optional().trim().isLength({ max: 255 }),
    body('fileType').optional().isIn(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    handleValidationErrors
  ],

  idParam: (paramName) => [
    param(paramName).isInt({ min: 1 }).withMessage(`Invalid ${paramName}`),
    handleValidationErrors
  ],

  custom: (validationChain) => [...validationChain, handleValidationErrors]
};

module.exports = {
  validate,
  validators,
  handleValidationErrors,
  sanitizeString
};
