/**
 * Error Logger Service
 * Captures and stores all backend errors for admin review
 * Stores: API errors, database errors, unhandled exceptions
 */

const { Pool } = require('pg');

class ErrorLoggerService {
  constructor(pool) {
    this.pool = pool;
    this.errorQueue = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    this.startFlushTimer();
  }

  /**
   * Log an error to the database
   */
  async logError(errorData) {
    const errorRecord = {
      id: this.generateId(),
      timestamp: new Date(),
      level: errorData.level || 'error',
      message: errorData.message || 'Unknown error',
      stack: errorData.stack || null,
      path: errorData.path || null,
      method: errorData.method || null,
      userId: errorData.userId || null,
      userEmail: errorData.userEmail || null,
      ip: errorData.ip || null,
      userAgent: errorData.userAgent || null,
      requestBody: errorData.requestBody ? JSON.stringify(errorData.requestBody).substring(0, 5000) : null,
      queryParams: errorData.queryParams ? JSON.stringify(errorData.queryParams) : null,
      headers: errorData.headers ? JSON.stringify(errorData.headers).substring(0, 2000) : null,
      statusCode: errorData.statusCode || 500,
      errorType: errorData.errorType || 'Unknown',
      source: errorData.source || 'backend',
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      notes: null
    };

    // Add to queue for batch processing
    this.errorQueue.push(errorRecord);

    // Flush immediately if queue is large
    if (this.errorQueue.length >= this.batchSize) {
      await this.flushQueue();
    }

    // Also log to console for immediate visibility
    console.error(`[ERROR:${errorRecord.id}] ${errorRecord.message}`, {
      path: errorRecord.path,
      userId: errorRecord.userId,
      timestamp: errorRecord.timestamp
    });
  }

  /**
   * Flush error queue to database
   */
  async flushQueue() {
    if (this.errorQueue.length === 0) return;

    const errorsToInsert = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const query = `
        INSERT INTO error_logs (
          id, timestamp, level, message, stack, path, method, 
          user_id, user_email, ip, user_agent, request_body, 
          query_params, headers, status_code, error_type, source,
          resolved, resolved_at, resolved_by, notes
        ) VALUES 
        ${errorsToInsert.map((_, i) => 
          `($${i * 21 + 1}, $${i * 21 + 2}, $${i * 21 + 3}, $${i * 21 + 4}, $${i * 21 + 5}, 
           $${i * 21 + 6}, $${i * 21 + 7}, $${i * 21 + 8}, $${i * 21 + 9}, $${i * 21 + 10}, 
           $${i * 21 + 11}, $${i * 21 + 12}, $${i * 21 + 13}, $${i * 21 + 14}, $${i * 21 + 15}, 
           $${i * 21 + 16}, $${i * 21 + 17}, $${i * 21 + 18}, $${i * 21 + 19}, $${i * 21 + 20}, $${i * 21 + 21})`
        ).join(',')}
        ON CONFLICT (id) DO NOTHING
      `;

      const values = errorsToInsert.flatMap(e => [
        e.id, e.timestamp, e.level, e.message, e.stack, e.path, e.method,
        e.userId, e.userEmail, e.ip, e.userAgent, e.requestBody,
        e.queryParams, e.headers, e.statusCode, e.errorType, e.source,
        e.resolved, e.resolvedAt, e.resolvedBy, e.notes
      ]);

      await this.pool.query(query, values);
      console.log(`✅ Logged ${errorsToInsert.length} errors to database`);
    } catch (err) {
      console.error('❌ Failed to log errors to database:', err);
      // Put errors back in queue to retry
      this.errorQueue.unshift(...errorsToInsert);
    }
  }

  /**
   * Start timer to periodically flush queue
   */
  startFlushTimer() {
    setInterval(() => this.flushQueue(), this.flushInterval);
  }

  /**
   * Generate unique error ID
   */
  generateId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get errors for admin dashboard
   */
  async getErrors(filters = {}) {
    const {
      page = 1,
      limit = 50,
      level,
      resolved,
      errorType,
      source,
      startDate,
      endDate,
      search
    } = filters;

    let query = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (level) {
      query += ` AND level = $${paramIndex++}`;
      params.push(level);
    }

    if (resolved !== undefined) {
      query += ` AND resolved = $${paramIndex++}`;
      params.push(resolved);
    }

    if (errorType) {
      query += ` AND error_type = $${paramIndex++}`;
      params.push(errorType);
    }

    if (source) {
      query += ` AND source = $${paramIndex++}`;
      params.push(source);
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (message ILIKE $${paramIndex} OR stack ILIKE $${paramIndex} OR path ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, (page - 1) * limit);

    const result = await this.pool.query(query, params);

    return {
      errors: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeRange = '24h') {
    const timeMap = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days'
    };

    const interval = timeMap[timeRange] || '24 hours';

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE resolved = false) as unresolved,
        COUNT(*) FILTER (WHERE level = 'error') as errors,
        COUNT(*) FILTER (WHERE level = 'warn') as warnings,
        COUNT(*) FILTER (WHERE level = 'info') as info,
        COUNT(DISTINCT error_type) as unique_types,
        COUNT(DISTINCT path) as affected_endpoints
      FROM error_logs 
      WHERE timestamp >= NOW() - INTERVAL '${interval}'
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }

  /**
   * Get error trends over time
   */
  async getErrorTrends(timeRange = '7d') {
    const timeMap = {
      '24h': { interval: '1 hour', format: 'HH24:00' },
      '7d': { interval: '1 day', format: 'YYYY-MM-DD' },
      '30d': { interval: '1 day', format: 'YYYY-MM-DD' }
    };

    const config = timeMap[timeRange] || timeMap['7d'];

    const query = `
      SELECT 
        DATE_TRUNC('${config.interval}', timestamp) as period,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE level = 'error') as errors,
        COUNT(*) FILTER (WHERE level = 'warn') as warnings
      FROM error_logs 
      WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
      GROUP BY period
      ORDER BY period ASC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId, adminId, notes = '') {
    const query = `
      UPDATE error_logs 
      SET resolved = true, 
          resolved_at = NOW(), 
          resolved_by = $2,
          notes = $3
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [errorId, adminId, notes]);
    return result.rows[0];
  }

  /**
   * Mark multiple errors as resolved
   */
  async resolveMultipleErrors(errorIds, adminId, notes = '') {
    const query = `
      UPDATE error_logs 
      SET resolved = true, 
          resolved_at = NOW(), 
          resolved_by = $2,
          notes = $3
      WHERE id = ANY($1)
      RETURNING *
    `;

    const result = await this.pool.query(query, [errorIds, adminId, notes]);
    return result.rows;
  }

  /**
   * Get top error types
   */
  async getTopErrors(limit = 10) {
    const query = `
      SELECT 
        error_type,
        message,
        COUNT(*) as count,
        MAX(timestamp) as last_occurrence,
        MIN(timestamp) as first_occurrence
      FROM error_logs 
      WHERE resolved = false
      GROUP BY error_type, message
      ORDER BY count DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get error by ID
   */
  async getErrorById(errorId) {
    const query = 'SELECT * FROM error_logs WHERE id = $1';
    const result = await this.pool.query(query, [errorId]);
    return result.rows[0] || null;
  }
}

module.exports = ErrorLoggerService;
