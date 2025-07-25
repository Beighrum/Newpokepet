/**
 * Express middleware for automatic request sanitization
 * Provides comprehensive sanitization for incoming requests
 */

const serverSanitizationService = require('../services/sanitization-service');
const serverSecurityEventLogger = require('../services/security-event-logger');

/**
 * Middleware to sanitize request body fields
 * @param {Array} fields - Fields to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware function
 */
function sanitizeBody(fields = [], options = {}) {
  return async (req, res, next) => {
    try {
      const { contentType = 'defaultPolicy', logViolations = true } = options;
      const userId = req.user?.uid || req.body?.userId || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;
      
      // Check rate limiting for users with repeated violations
      if (userId) {
        const rateLimitInfo = await serverSecurityEventLogger.checkRateLimit(userId);
        if (rateLimitInfo.isExceeded) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many security violations detected. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            resetTime: rateLimitInfo.resetTime,
            violationCount: rateLimitInfo.violationCount
          });
        }
      }
      
      // Sanitize specified fields
      for (const field of fields) {
        if (req.body && req.body[field]) {
          const result = await serverSanitizationService.sanitizeHTMLAsync(req.body[field], {
            contentType,
            userId,
            ipAddress
          });
          
          req.body[field] = result.sanitizedContent;
          
          // Add sanitization metadata to request
          if (!req.sanitizationResults) {
            req.sanitizationResults = {};
          }
          req.sanitizationResults[field] = result;
          
          // Block request if critical violations found
          if (result.securityViolations.some(v => v.severity === 'critical')) {
            return res.status(400).json({
              error: 'Content blocked',
              message: 'Content contains dangerous elements and has been blocked.',
              field: field,
              violations: result.securityViolations.length,
              code: 'CONTENT_BLOCKED'
            });
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Sanitization middleware error:', error);
      res.status(500).json({
        error: 'Sanitization failed',
        message: 'An error occurred while processing your request.',
        code: 'SANITIZATION_ERROR'
      });
    }
  };
}

/**
 * Middleware to sanitize query parameters
 * @param {Array} fields - Query fields to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware function
 */
function sanitizeQuery(fields = [], options = {}) {
  return async (req, res, next) => {
    try {
      const { contentType = 'defaultPolicy' } = options;
      const userId = req.user?.uid || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;
      
      // Sanitize specified query fields
      for (const field of fields) {
        if (req.query && req.query[field]) {
          const result = await serverSanitizationService.sanitizeHTMLAsync(req.query[field], {
            contentType,
            userId,
            ipAddress
          });
          
          req.query[field] = result.sanitizedContent;
          
          // Add sanitization metadata to request
          if (!req.sanitizationResults) {
            req.sanitizationResults = {};
          }
          req.sanitizationResults[`query_${field}`] = result;
        }
      }
      
      next();
    } catch (error) {
      console.error('Query sanitization middleware error:', error);
      next(); // Continue processing even if query sanitization fails
    }
  };
}

/**
 * Middleware for comprehensive request sanitization
 * Automatically detects and sanitizes common fields
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware function
 */
function autoSanitize(options = {}) {
  const {
    bodyFields = ['name', 'description', 'bio', 'displayName', 'petName', 'breed', 'comment', 'message'],
    queryFields = ['search', 'filter', 'name'],
    contentType = 'defaultPolicy',
    blockCritical = true
  } = options;
  
  return async (req, res, next) => {
    try {
      const userId = req.user?.uid || req.body?.userId || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;
      
      // Initialize sanitization results
      req.sanitizationResults = {};
      
      // Check rate limiting
      if (userId) {
        const rateLimitInfo = await serverSecurityEventLogger.checkRateLimit(userId);
        if (rateLimitInfo.isExceeded) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many security violations detected. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            resetTime: rateLimitInfo.resetTime,
            violationCount: rateLimitInfo.violationCount
          });
        }
      }
      
      // Sanitize body fields
      for (const field of bodyFields) {
        if (req.body && req.body[field] && typeof req.body[field] === 'string') {
          const result = await serverSanitizationService.sanitizeHTMLAsync(req.body[field], {
            contentType,
            userId,
            ipAddress
          });
          
          req.body[field] = result.sanitizedContent;
          req.sanitizationResults[field] = result;
          
          // Block request if critical violations found and blocking is enabled
          if (blockCritical && result.securityViolations.some(v => v.severity === 'critical')) {
            return res.status(400).json({
              error: 'Content blocked',
              message: 'Content contains dangerous elements and has been blocked.',
              field: field,
              violations: result.securityViolations.length,
              code: 'CONTENT_BLOCKED'
            });
          }
        }
      }
      
      // Sanitize query fields
      for (const field of queryFields) {
        if (req.query && req.query[field] && typeof req.query[field] === 'string') {
          const result = await serverSanitizationService.sanitizeHTMLAsync(req.query[field], {
            contentType,
            userId,
            ipAddress
          });
          
          req.query[field] = result.sanitizedContent;
          req.sanitizationResults[`query_${field}`] = result;
        }
      }
      
      // Log sanitization summary
      const totalViolations = Object.values(req.sanitizationResults)
        .reduce((sum, result) => sum + result.securityViolations.length, 0);
      
      if (totalViolations > 0) {
        console.log(`Sanitized request from user ${userId}: ${totalViolations} violations found`);
      }
      
      next();
    } catch (error) {
      console.error('Auto-sanitization middleware error:', error);
      res.status(500).json({
        error: 'Sanitization failed',
        message: 'An error occurred while processing your request.',
        code: 'SANITIZATION_ERROR'
      });
    }
  };
}

/**
 * Middleware to log security events
 * @param {Object} options - Logging options
 * @returns {Function} Express middleware function
 */
function logSecurityEvents(options = {}) {
  return async (req, res, next) => {
    try {
      const { logAllRequests = false, logViolationsOnly = true } = options;
      
      // Log security events after sanitization
      if (req.sanitizationResults) {
        const violations = Object.values(req.sanitizationResults)
          .flatMap(result => result.securityViolations);
        
        if (violations.length > 0 || logAllRequests) {
          // Create security event context
          const context = {
            userId: req.user?.uid || req.body?.userId || null,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            endpoint: req.path,
            contentType: 'general',
            sessionId: req.sessionID || null,
            requestId: req.id || null,
            metadata: {
              method: req.method,
              violationCount: violations.length,
              sanitizedFields: Object.keys(req.sanitizationResults)
            }
          };

          // Log security events if violations found
          if (violations.length > 0) {
            await serverSecurityEventLogger.logSecurityEventWithContext(violations, context);
          }

          // Create audit log for all requests (if enabled) or violation requests
          if (logAllRequests || violations.length > 0) {
            const action = violations.length > 0 ? 'sanitize' : 'allow';
            let riskLevel = 'low';
            
            if (violations.length > 0) {
              const criticalViolations = violations.filter(v => v.severity === 'critical');
              const highViolations = violations.filter(v => v.severity === 'high');
              
              if (criticalViolations.length > 0) {
                riskLevel = 'critical';
              } else if (highViolations.length > 0) {
                riskLevel = 'high';
              } else {
                riskLevel = 'medium';
              }
            }

            await serverSecurityEventLogger.logSanitizationAction(
              action,
              context,
              violations,
              0, // Processing time not available at middleware level
              riskLevel
            );
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Security logging middleware error:', error);
      next(); // Continue processing even if logging fails
    }
  };
}

/**
 * Middleware to add security headers
 * @param {Object} options - Security header options
 * @returns {Function} Express middleware function
 */
function addSecurityHeaders(options = {}) {
  return (req, res, next) => {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add CSP header if specified
    if (options.contentSecurityPolicy) {
      res.setHeader('Content-Security-Policy', options.contentSecurityPolicy);
    }
    
    next();
  };
}

/**
 * Complete sanitization middleware stack
 * Combines all sanitization middleware for easy use
 * @param {Object} options - Combined options
 * @returns {Array} Array of middleware functions
 */
function createSanitizationStack(options = {}) {
  return [
    addSecurityHeaders(options.security || {}),
    autoSanitize(options.sanitization || {}),
    logSecurityEvents(options.logging || {})
  ];
}

module.exports = {
  sanitizeBody,
  sanitizeQuery,
  autoSanitize,
  logSecurityEvents,
  addSecurityHeaders,
  createSanitizationStack
};