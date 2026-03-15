const winston = require('winston');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'tradematch-api' },
    transports: [
        // Write all logs with importance level of `error` or less to error.log
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Write all logs to combined.log
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// If not in production, log to console with color and simple format
if (process.env.NODE_ENV !== 'production') {
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    handleExceptions: true,
    handleRejections: true,
    silent: false
  });
  
  // Handle EPIPE and other transport errors gracefully
  consoleTransport.on('error', (err) => {
    // Ignore EPIPE errors (console closed) but log other errors
    if (err.code !== 'EPIPE') {
      console.error('Logger transport error:', err.message);
    }
    // Silently ignore EPIPE - it's not critical
  });
  
  logger.add(consoleTransport);
} else {
  // In production, also log to console but without colors
  const consoleTransport = new winston.transports.Console({
    format: winston.format.simple(),
    handleExceptions: true,
    handleRejections: true,
    silent: false
  });
  
  // Handle EPIPE and other transport errors gracefully
  consoleTransport.on('error', (err) => {
    // Ignore EPIPE errors (console closed) but log other errors
    if (err.code !== 'EPIPE') {
      // Use console.error directly since logger itself might be failing
      console.error(`[${new Date().toISOString()}] Logger transport error: ${err.message}`);
    }
  });
  
  logger.add(consoleTransport);
}

// Create a stream object for morgan HTTP logger
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

module.exports = logger;
