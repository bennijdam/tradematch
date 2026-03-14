/**
 * Error Logger Middleware
 * Automatically captures all errors from API routes
 * and logs them to the database for admin review
 */

const ErrorLoggerService = require('../services/error-logger.service');

// Singleton instance
let errorLogger = null;

/**
 * Initialize the error logger with database pool
 */
function initErrorLogger(pool) {
  if (!errorLogger && pool) {
    errorLogger = new ErrorLoggerService(pool);
  }
  return errorLogger;
}

/**
 * Get error logger instance
 */
function getErrorLogger() {
  return errorLogger;
}

/**
 * Middleware to log errors automatically
 * Usage: app.use(errorLoggerMiddleware);
 */
function errorLoggerMiddleware(err, req, res, next) {
  if (!errorLogger) {
    console.error('Error logger not initialized');
    return next(err);
  }

  // Skip logging authentication errors to prevent log loops
  // These are expected behaviors, not system errors
  const skipStatuses = [401, 403];
  const skipPaths = ['/api/admin/errors', '/api/auth'];
  
  if (skipStatuses.includes(err.statusCode) || skipStatuses.includes(err.status)) {
    // Still log to console but don't store in database
    console.warn(`[AUTH] ${err.statusCode || err.status}: ${err.message} - ${req.path}`);
    return next(err);
  }
  
  // Skip if this is the admin errors endpoint itself (prevents recursion)
  if (skipPaths.some(path => req.path.startsWith(path))) {
    // Only skip if it's an expected auth error, not a system error
    if (err.statusCode < 500) {
      return next(err);
    }
  }

  // Determine error level
  const level = err.statusCode >= 500 ? 'error' : 
                err.statusCode >= 400 ? 'warn' : 'info';

  // Determine error type
  let errorType = 'Unknown';
  if (err.code === '23505') errorType = 'DatabaseConstraint';
  else if (err.code === 'ECONNREFUSED') errorType = 'ConnectionError';
  else if (err.name === 'ValidationError') errorType = 'Validation';
  else if (err.name === 'JsonWebTokenError') errorType = 'Auth';
  else if (err.name === 'TokenExpiredError') errorType = 'AuthExpired';
  else if (err.message && err.message.includes('timeout')) errorType = 'Timeout';
  else if (err.message && err.message.includes('memory')) errorType = 'Memory';
  else errorType = err.name || 'Error';

  // Log the error asynchronously (don't block response)
  errorLogger.logError({
    level,
    message: err.message || 'Unknown error',
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId || req.user?.id || null,
    userEmail: req.user?.email || null,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    requestBody: req.body,
    queryParams: req.query,
    headers: {
      'content-type': req.get('content-type'),
      'authorization': req.get('authorization') ? '[REDACTED]' : undefined,
      'x-request-id': req.get('x-request-id'),
      'x-idempotency-key': req.get('x-idempotency-key')
    },
    statusCode: err.statusCode || err.status || 500,
    errorType,
    source: 'backend'
  }).catch(logError => {
    // If logging fails, just console.error it
    console.error('Failed to log error:', logError);
  });

  // Continue to next error handler
  next(err);
}

/**
 * Middleware to log successful requests (for debugging)
 * Usage: app.use(requestLoggerMiddleware);
 */
function requestLoggerMiddleware(req, res, next) {
  // Log slow requests (> 1 second)
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000 && errorLogger) {
      errorLogger.logError({
        level: 'warn',
        message: `Slow request: ${req.method} ${req.path} took ${duration}ms`,
        path: req.path,
        method: req.method,
        userId: req.user?.userId || null,
        statusCode: res.statusCode,
        errorType: 'SlowRequest',
        source: 'backend'
      }).catch(() => {});
    }
  });

  next();
}

/**
 * Helper to manually log an error from any route
 * Usage: logApiError(req, new Error('Something went wrong'));
 */
function logApiError(req, error, options = {}) {
  if (!errorLogger) {
    console.error('Error logger not initialized:', error);
    return;
  }

  errorLogger.logError({
    level: options.level || 'error',
    message: error.message || 'Unknown error',
    stack: error.stack,
    path: req?.path || 'unknown',
    method: req?.method || 'unknown',
    userId: req?.user?.userId || null,
    userEmail: req?.user?.email || null,
    ip: req?.ip,
    userAgent: req?.get?.('user-agent'),
    requestBody: options.includeBody ? req?.body : undefined,
    statusCode: options.statusCode || 500,
    errorType: options.errorType || error.name || 'Error',
    source: options.source || 'backend',
    ...options
  }).catch(() => {});
}

/**
 * Wrap async route handlers to catch errors
 * Usage: router.get('/path', catchAsync(async (req, res) => { ... }));
 */
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  initErrorLogger,
  getErrorLogger,
  errorLoggerMiddleware,
  requestLoggerMiddleware,
  logApiError,
  catchAsync
};
