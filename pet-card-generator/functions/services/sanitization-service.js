/**
 * Server-side sanitization service for Firebase Functions
 * Provides comprehensive HTML sanitization with security monitoring
 */

const { sanitizeHTML, validateContent, getSecurityPolicy } = require('../config/sanitization-config');
const admin = require('firebase-admin');
const serverSecurityEventLogger = require('./security-event-logger');
const serverSanitizationCache = require('./sanitization-cache');

class ServerSanitizationService {
  constructor() {
    this.db = admin.firestore();
    this.performanceMetrics = {
      totalSanitizations: 0,
      totalViolations: 0,
      averageProcessingTime: 0,
      processingTimes: []
    };
  }

  /**
   * Sanitize HTML content asynchronously with caching
   * @param {string} content - HTML content to sanitize
   * @param {Object} options - Sanitization options
   * @returns {Promise<Object>} Sanitization result
   */
  async sanitizeHTMLAsync(content, options = {}) {
    const { 
      contentType = 'defaultPolicy', 
      userId = null, 
      ipAddress = 'unknown',
      userAgent = 'unknown',
      endpoint = 'sanitize',
      sessionId = null,
      requestId = null
    } = options;
    
    return new Promise(async (resolve) => {
      // Use setTimeout to make it truly async and prevent blocking
      setTimeout(async () => {
        const startTime = Date.now();
        
        // Check cache first
        const cachedResult = serverSanitizationCache.get(content, options, contentType);
        
        if (cachedResult) {
          // Update processing time to include cache lookup time
          const cacheResult = {
            ...cachedResult,
            processingTime: Date.now() - startTime
          };

          // Update performance metrics
          this.updatePerformanceMetrics(cacheResult);
          
          // Create security event context
          const context = {
            userId,
            ipAddress,
            userAgent,
            endpoint,
            contentType,
            originalContent: content,
            sanitizedContent: cacheResult.sanitizedContent,
            sessionId,
            requestId
          };

          // Still log security violations if any (for audit trail)
          if (cacheResult.securityViolations.length > 0) {
            await serverSecurityEventLogger.logSecurityEventWithContext(
              cacheResult.securityViolations,
              context
            );
          }

          // Log sanitization action for audit trail
          const action = cacheResult.isValid ? 'sanitize' : 'block';
          let riskLevel = 'low';
          
          if (cacheResult.securityViolations.length > 0) {
            const criticalViolations = cacheResult.securityViolations.filter(v => v.severity === 'critical');
            const highViolations = cacheResult.securityViolations.filter(v => v.severity === 'high');
            
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
            cacheResult.securityViolations,
            cacheResult.processingTime,
            riskLevel
          );
          
          resolve(cacheResult);
          return;
        }

        // Perform sanitization if not cached
        const result = sanitizeHTML(content, contentType);
        
        // Cache the result
        serverSanitizationCache.set(content, result, options, contentType);
        
        // Update performance metrics
        this.updatePerformanceMetrics(result);
        
        // Create security event context
        const context = {
          userId,
          ipAddress,
          userAgent,
          endpoint,
          contentType,
          originalContent: content,
          sanitizedContent: result.sanitizedContent,
          sessionId,
          requestId
        };

        // Log security violations if any
        if (result.securityViolations.length > 0) {
          await serverSecurityEventLogger.logSecurityEventWithContext(
            result.securityViolations,
            context
          );
        }

        // Log sanitization action for audit trail
        const action = result.isValid ? 'sanitize' : 'block';
        let riskLevel = 'low';
        
        if (result.securityViolations.length > 0) {
          const criticalViolations = result.securityViolations.filter(v => v.severity === 'critical');
          const highViolations = result.securityViolations.filter(v => v.severity === 'high');
          
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
          result.securityViolations,
          result.processingTime,
          riskLevel
        );
        
        resolve(result);
      }, 0);
    });
  }

  /**
   * Validate content asynchronously
   * @param {string} content - Content to validate
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateContentAsync(content, options = {}) {
    const { contentType = 'defaultPolicy', userId = null } = options;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = validateContent(content, contentType);
        
        // Log validation results for monitoring
        if (!result.isValid) {
          console.warn(`Content validation failed for user ${userId}:`, {
            riskLevel: result.riskLevel,
            violationCount: result.violations.length,
            recommendedAction: result.recommendedAction
          });
        }
        
        resolve(result);
      }, 0);
    });
  }

  /**
   * Sanitize user profile content
   * @param {Object} profile - User profile object
   * @param {Object} options - Sanitization options
   * @returns {Promise<Object>} Sanitized profile
   */
  async sanitizeUserProfile(profile, options = {}) {
    const { userId = null, ipAddress = null } = options;
    
    const sanitizedProfile = { ...profile };
    
    // Sanitize display name
    if (profile.displayName) {
      const result = await this.sanitizeHTMLAsync(profile.displayName, {
        contentType: 'userProfiles',
        userId,
        ipAddress
      });
      sanitizedProfile.displayName = result.sanitizedContent;
    }
    
    // Sanitize bio
    if (profile.bio) {
      const result = await this.sanitizeHTMLAsync(profile.bio, {
        contentType: 'userProfiles',
        userId,
        ipAddress
      });
      sanitizedProfile.bio = result.sanitizedContent;
    }
    
    // Add sanitization metadata
    sanitizedProfile.sanitizationInfo = {
      lastUpdated: new Date(),
      profileVersion: '1.0.0',
      violationsCount: 0 // This would be calculated from actual violations
    };
    
    return sanitizedProfile;
  }

  /**
   * Sanitize pet card metadata
   * @param {Object} metadata - Pet card metadata
   * @param {Object} options - Sanitization options
   * @returns {Promise<Object>} Sanitized metadata
   */
  async sanitizePetCardMetadata(metadata, options = {}) {
    const { userId = null, ipAddress = null } = options;
    
    const sanitizedMetadata = { ...metadata };
    const sanitizedFields = [];
    
    // Sanitize pet name
    if (metadata.petName) {
      const result = await this.sanitizeHTMLAsync(metadata.petName, {
        contentType: 'petCardMetadata',
        userId,
        ipAddress
      });
      sanitizedMetadata.petName = result.sanitizedContent;
      if (result.securityViolations.length > 0) {
        sanitizedFields.push('petName');
      }
    }
    
    // Sanitize breed
    if (metadata.breed) {
      const result = await this.sanitizeHTMLAsync(metadata.breed, {
        contentType: 'petCardMetadata',
        userId,
        ipAddress
      });
      sanitizedMetadata.breed = result.sanitizedContent;
      if (result.securityViolations.length > 0) {
        sanitizedFields.push('breed');
      }
    }
    
    // Sanitize description
    if (metadata.description) {
      const result = await this.sanitizeHTMLAsync(metadata.description, {
        contentType: 'petCardMetadata',
        userId,
        ipAddress
      });
      sanitizedMetadata.description = result.sanitizedContent;
      if (result.securityViolations.length > 0) {
        sanitizedFields.push('description');
      }
    }
    
    // Sanitize custom tags
    if (metadata.customTags && Array.isArray(metadata.customTags)) {
      sanitizedMetadata.customTags = [];
      for (const tag of metadata.customTags) {
        const result = await this.sanitizeHTMLAsync(tag, {
          contentType: 'petCardMetadata',
          userId,
          ipAddress
        });
        sanitizedMetadata.customTags.push(result.sanitizedContent);
        if (result.securityViolations.length > 0) {
          sanitizedFields.push('customTags');
        }
      }
    }
    
    // Add sanitization metadata
    sanitizedMetadata.sanitizedFields = [...new Set(sanitizedFields)];
    
    return sanitizedMetadata;
  }

  /**
   * Log security violations to Firestore
   * @param {Array} violations - Security violations
   * @param {Object} context - Context information
   */
  async logSecurityViolations(violations, context) {
    try {
      const logEntry = {
        violations,
        userId: context.userId,
        ipAddress: context.ipAddress,
        contentType: context.contentType,
        originalContent: context.originalContent,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        severity: this.calculateMaxSeverity(violations)
      };
      
      await this.db.collection('securityLogs').add(logEntry);
      
      // Update violation metrics
      this.performanceMetrics.totalViolations += violations.length;
      
      console.log(`Logged ${violations.length} security violations for user ${context.userId}`);
    } catch (error) {
      console.error('Failed to log security violations:', error);
    }
  }

  /**
   * Update performance metrics
   * @param {Object} result - Sanitization result
   */
  updatePerformanceMetrics(result) {
    this.performanceMetrics.totalSanitizations++;
    this.performanceMetrics.processingTimes.push(result.processingTime);
    
    // Keep only last 1000 processing times for average calculation
    if (this.performanceMetrics.processingTimes.length > 1000) {
      this.performanceMetrics.processingTimes = this.performanceMetrics.processingTimes.slice(-1000);
    }
    
    // Calculate average processing time
    const sum = this.performanceMetrics.processingTimes.reduce((a, b) => a + b, 0);
    this.performanceMetrics.averageProcessingTime = sum / this.performanceMetrics.processingTimes.length;
  }

  /**
   * Calculate maximum severity from violations
   * @param {Array} violations - Security violations
   * @returns {string} Maximum severity level
   */
  calculateMaxSeverity(violations) {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    let maxSeverity = 'low';
    
    violations.forEach(violation => {
      if (severityLevels[violation.severity] > severityLevels[maxSeverity]) {
        maxSeverity = violation.severity;
      }
    });
    
    return maxSeverity;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Get security policy for content type
   * @param {string} contentType - Content type
   * @returns {Object} Security policy
   */
  getSecurityPolicyForContentType(contentType) {
    return getSecurityPolicy(contentType);
  }

  /**
   * Check if user has exceeded rate limits for violations
   * @param {string} userId - User ID
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {Promise<boolean>} True if rate limit exceeded
   */
  async checkRateLimit(userId, timeWindowMs = 3600000) { // 1 hour default
    try {
      const cutoffTime = new Date(Date.now() - timeWindowMs);
      
      const violationsQuery = await this.db
        .collection('securityLogs')
        .where('userId', '==', userId)
        .where('timestamp', '>', cutoffTime)
        .get();
      
      const violationCount = violationsQuery.size;
      const rateLimit = 10; // Max 10 violations per hour
      
      if (violationCount >= rateLimit) {
        console.warn(`User ${userId} exceeded rate limit: ${violationCount} violations in last hour`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false; // Fail open for rate limiting
    }
  }

  /**
   * Create audit log entry
   * @param {Object} auditData - Audit data
   */
  async createAuditLog(auditData) {
    try {
      const auditEntry = {
        ...auditData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        id: admin.firestore().collection('auditLogs').doc().id
      };
      
      await this.db.collection('auditLogs').add(auditEntry);
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Clear sanitization cache
   * @param {string} reason - Reason for clearing cache
   */
  clearCache(reason = 'manual') {
    serverSanitizationCache.clear(reason);
  }

  /**
   * Invalidate cache by content type
   * @param {string} contentType - Content type to invalidate
   * @param {string} reason - Reason for invalidation
   */
  invalidateCacheByContentType(contentType, reason = 'manual') {
    serverSanitizationCache.invalidateByContentType(contentType, reason);
  }

  /**
   * Invalidate cache on configuration change
   */
  invalidateCacheOnConfigChange() {
    serverSanitizationCache.invalidateOnConfigChange();
  }

  /**
   * Get cache metrics
   * @returns {Object} Cache metrics
   */
  getCacheMetrics() {
    return serverSanitizationCache.getMetrics();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStatistics() {
    return serverSanitizationCache.getStatistics();
  }

  /**
   * Update cache configuration
   * @param {Object} newConfig - New cache configuration
   */
  updateCacheConfig(newConfig) {
    serverSanitizationCache.updateConfig(newConfig);
  }

  /**
   * Get cache debug information
   * @returns {Array} Cache debug info
   */
  getCacheDebugInfo() {
    return serverSanitizationCache.getDebugInfo();
  }
}

// Export singleton instance
const serverSanitizationService = new ServerSanitizationService();
module.exports = serverSanitizationService;