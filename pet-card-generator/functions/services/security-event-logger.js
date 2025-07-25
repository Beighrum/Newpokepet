/**
 * Server-side security event logging service for Firebase Functions
 * Handles comprehensive security event logging and audit trails
 */

const admin = require('firebase-admin');

class ServerSecurityEventLogger {
  constructor() {
    this.db = admin.firestore();
    this.metricsCache = null;
    this.metricsCacheExpiry = 0;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    this.RATE_LIMIT_WINDOW = 3600000; // 1 hour
    this.MAX_VIOLATIONS_PER_HOUR = 10;
  }

  /**
   * Log a security event to Firestore
   * @param {Object} event - Security event data
   * @returns {Promise<void>}
   */
  async logSecurityEvent(event) {
    try {
      const eventDocument = {
        ...event,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        contentType: event.contentType.toString()
      };

      const docRef = await this.db.collection('securityEventLogs').add(eventDocument);
      
      console.log(`Security event logged: ${event.severity} - ${event.violations.length} violations - ID: ${docRef.id}`);
      
      // Clear metrics cache to force refresh
      this.clearMetricsCache();
      
      // Check if this triggers any alerts
      await this.checkAndTriggerAlerts(event);
      
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Fallback to console logging for critical events
      if (event.severity === 'critical' || event.severity === 'error') {
        console.error('CRITICAL SECURITY EVENT (fallback):', event);
      }
    }
  }

  /**
   * Create an audit log entry
   * @param {Object} audit - Audit log data
   * @returns {Promise<void>}
   */
  async createAuditLog(audit) {
    try {
      const auditDocument = {
        ...audit,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        contentType: audit.contentType.toString()
      };

      const docRef = await this.db.collection('auditLogs').add(auditDocument);
      
      console.log(`Audit log created: ${audit.action} - ${audit.riskLevel} risk - ID: ${docRef.id}`);
      
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Fallback logging for audit trail
      console.warn('AUDIT LOG (fallback):', audit);
    }
  }

  /**
   * Log security event with context
   * @param {Array} violations - Security violations
   * @param {Object} context - Event context
   * @returns {Promise<void>}
   */
  async logSecurityEventWithContext(violations, context) {
    const severity = this.calculateSeverity(violations);
    
    await this.logSecurityEvent({
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      endpoint: context.endpoint,
      violations,
      severity,
      contentType: context.contentType,
      originalContent: context.originalContent,
      sanitizedContent: context.sanitizedContent,
      sessionId: context.sessionId,
      requestId: context.requestId,
      metadata: context.metadata || {}
    });
  }

  /**
   * Log sanitization action
   * @param {string} action - Action taken
   * @param {Object} context - Event context
   * @param {Array} violations - Security violations
   * @param {number} processingTime - Processing time in ms
   * @param {string} riskLevel - Risk level
   * @returns {Promise<void>}
   */
  async logSanitizationAction(action, context, violations, processingTime, riskLevel) {
    await this.createAuditLog({
      userId: context.userId,
      action,
      contentType: context.contentType,
      originalContent: context.originalContent || '',
      sanitizedContent: context.sanitizedContent || '',
      violations,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      endpoint: context.endpoint,
      sessionId: context.sessionId,
      requestId: context.requestId,
      processingTime,
      riskLevel,
      metadata: context.metadata || {}
    });
  }

  /**
   * Get security metrics for a time window
   * @param {Object} timeWindow - Time window {start, end}
   * @returns {Promise<Object>} Security metrics
   */
  async getSecurityMetrics(timeWindow) {
    // Check cache first
    if (this.metricsCache && Date.now() < this.metricsCacheExpiry) {
      return this.metricsCache;
    }

    try {
      const now = new Date();
      const start = timeWindow?.start || new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const end = timeWindow?.end || now;

      // Query security events
      const eventsSnapshot = await this.db
        .collection('securityEventLogs')
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end)
        .orderBy('timestamp', 'desc')
        .get();

      // Query audit logs
      const auditSnapshot = await this.db
        .collection('auditLogs')
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end)
        .orderBy('timestamp', 'desc')
        .get();

      const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const audits = auditSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate metrics
      const metrics = this.calculateMetrics(events, audits, { start, end });
      
      // Cache the results
      this.metricsCache = metrics;
      this.metricsCacheExpiry = Date.now() + this.CACHE_DURATION;
      
      return metrics;
      
    } catch (error) {
      console.error('Failed to get security metrics:', error);
      return this.getDefaultMetrics(timeWindow);
    }
  }

  /**
   * Check rate limit for a user
   * @param {string} userId - User ID
   * @param {number} timeWindowMs - Time window in milliseconds
   * @returns {Promise<Object>} Rate limit information
   */
  async checkRateLimit(userId, timeWindowMs = this.RATE_LIMIT_WINDOW) {
    try {
      const cutoffTime = new Date(Date.now() - timeWindowMs);
      
      const violationsSnapshot = await this.db
        .collection('securityEventLogs')
        .where('userId', '==', userId)
        .where('timestamp', '>', cutoffTime)
        .get();

      const violationCount = violationsSnapshot.size;
      const maxViolations = this.MAX_VIOLATIONS_PER_HOUR;
      const isExceeded = violationCount >= maxViolations;
      
      if (isExceeded) {
        console.warn(`User ${userId} exceeded rate limit: ${violationCount} violations in ${timeWindowMs}ms`);
        
        // Log rate limit exceeded event
        await this.logSecurityEvent({
          userId,
          ipAddress: 'unknown',
          userAgent: 'system',
          endpoint: 'rate-limit-check',
          violations: [{
            type: 'rate_limit_exceeded',
            originalContent: '',
            sanitizedContent: '',
            timestamp: new Date(),
            severity: 'high',
            description: `Rate limit exceeded: ${violationCount} violations in ${timeWindowMs}ms`
          }],
          severity: 'error',
          contentType: 'system',
          metadata: {
            violationCount,
            timeWindowMs,
            maxViolations
          }
        });
      }
      
      return {
        userId,
        violationCount,
        timeWindow: timeWindowMs,
        isExceeded,
        resetTime: new Date(Date.now() + timeWindowMs),
        maxViolations
      };
      
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      return {
        userId,
        violationCount: 0,
        timeWindow: timeWindowMs,
        isExceeded: false,
        resetTime: new Date(Date.now() + timeWindowMs),
        maxViolations: this.MAX_VIOLATIONS_PER_HOUR
      };
    }
  }

  /**
   * Get recent security events
   * @param {number} limit - Maximum number of events to return
   * @param {string} severity - Filter by severity level
   * @returns {Promise<Array>} Recent security events
   */
  async getRecentEvents(limit = 50, severity = null) {
    try {
      let query = this.db
        .collection('securityEventLogs')
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (severity) {
        query = this.db
          .collection('securityEventLogs')
          .where('severity', '==', severity)
          .orderBy('timestamp', 'desc')
          .limit(limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }

  /**
   * Get dashboard data
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData() {
    try {
      const [metrics, recentEvents] = await Promise.all([
        this.getSecurityMetrics(),
        this.getRecentEvents(20)
      ]);

      const topViolators = await this.getTopViolators();
      
      const systemHealth = {
        sanitizationServiceStatus: 'healthy',
        averageResponseTime: metrics.averageProcessingTime,
        errorRate: this.calculateErrorRate(recentEvents),
        lastHealthCheck: new Date()
      };

      const alerts = await this.generateAlerts(metrics, recentEvents);

      return {
        metrics,
        recentEvents,
        topViolators,
        systemHealth,
        alerts
      };
      
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      return this.getDefaultDashboardData();
    }
  }

  /**
   * Get top violators
   * @returns {Promise<Array>} Top violators list
   */
  async getTopViolators() {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const eventsSnapshot = await this.db
        .collection('securityEventLogs')
        .where('timestamp', '>', last24Hours)
        .where('userId', '!=', null)
        .get();

      const userViolations = {};

      eventsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId) {
          if (!userViolations[data.userId]) {
            userViolations[data.userId] = { 
              count: 0, 
              lastViolation: data.timestamp?.toDate() || new Date() 
            };
          }
          userViolations[data.userId].count += data.violations.length;
          const violationDate = data.timestamp?.toDate() || new Date();
          if (violationDate > userViolations[data.userId].lastViolation) {
            userViolations[data.userId].lastViolation = violationDate;
          }
        }
      });

      return Object.entries(userViolations)
        .map(([userId, data]) => ({
          userId,
          violationCount: data.count,
          lastViolation: data.lastViolation,
          riskScore: Math.min(data.count * 10, 100)
        }))
        .sort((a, b) => b.violationCount - a.violationCount)
        .slice(0, 10);
        
    } catch (error) {
      console.error('Failed to get top violators:', error);
      return [];
    }
  }

  /**
   * Check and trigger alerts based on security events
   * @param {Object} event - Security event
   * @returns {Promise<void>}
   */
  async checkAndTriggerAlerts(event) {
    try {
      // Check for critical violations
      if (event.severity === 'critical') {
        await this.triggerAlert({
          type: 'critical_violation',
          message: `Critical security violation detected from user ${event.userId || 'unknown'}`,
          severity: 'critical',
          metadata: {
            userId: event.userId,
            endpoint: event.endpoint,
            violationCount: event.violations.length
          }
        });
      }

      // Check for rate limit violations
      if (event.userId) {
        const rateLimitInfo = await this.checkRateLimit(event.userId);
        if (rateLimitInfo.isExceeded) {
          await this.triggerAlert({
            type: 'rate_limit',
            message: `User ${event.userId} exceeded rate limit with ${rateLimitInfo.violationCount} violations`,
            severity: 'warning',
            metadata: rateLimitInfo
          });
        }
      }

    } catch (error) {
      console.error('Failed to check and trigger alerts:', error);
    }
  }

  /**
   * Trigger an alert
   * @param {Object} alert - Alert data
   * @returns {Promise<void>}
   */
  async triggerAlert(alert) {
    try {
      const alertDocument = {
        ...alert,
        id: this.db.collection('alerts').doc().id,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        acknowledged: false
      };

      await this.db.collection('alerts').add(alertDocument);
      
      console.warn(`SECURITY ALERT: ${alert.type} - ${alert.message}`);
      
    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  /**
   * Calculate severity from violations
   * @param {Array} violations - Security violations
   * @returns {string} Severity level
   */
  calculateSeverity(violations) {
    if (violations.some(v => v.severity === 'critical')) return 'critical';
    if (violations.some(v => v.severity === 'high')) return 'error';
    if (violations.some(v => v.severity === 'medium')) return 'warning';
    return 'info';
  }

  /**
   * Calculate metrics from events and audits
   * @param {Array} events - Security events
   * @param {Array} audits - Audit logs
   * @param {Object} timeWindow - Time window
   * @returns {Object} Calculated metrics
   */
  calculateMetrics(events, audits, timeWindow) {
    const totalSanitizations = audits.length;
    const violationsBlocked = events.reduce((sum, event) => sum + event.violations.length, 0);
    const processingTimes = audits.map(audit => audit.processingTime).filter(time => time > 0);
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    // Calculate top violation types
    const violationTypes = {};
    events.forEach(event => {
      event.violations.forEach(violation => {
        violationTypes[violation.type] = (violationTypes[violation.type] || 0) + 1;
      });
    });

    // Get suspicious users
    const userViolations = {};
    events.forEach(event => {
      if (event.userId) {
        userViolations[event.userId] = (userViolations[event.userId] || 0) + event.violations.length;
      }
    });
    const suspiciousUsers = Object.entries(userViolations)
      .filter(([, count]) => count >= 5)
      .map(([userId]) => userId);

    // Calculate risk level distribution
    const riskLevelDistribution = {};
    audits.forEach(audit => {
      riskLevelDistribution[audit.riskLevel] = (riskLevelDistribution[audit.riskLevel] || 0) + 1;
    });

    return {
      totalSanitizations,
      violationsBlocked,
      averageProcessingTime,
      topViolationTypes: violationTypes,
      suspiciousUsers,
      performanceImpact: averageProcessingTime > 100 ? averageProcessingTime / 100 : 0,
      timeWindow,
      riskLevelDistribution
    };
  }

  /**
   * Calculate error rate from recent events
   * @param {Array} events - Recent events
   * @returns {number} Error rate percentage
   */
  calculateErrorRate(events) {
    if (events.length === 0) return 0;
    const errorEvents = events.filter(event => event.severity === 'error' || event.severity === 'critical');
    return (errorEvents.length / events.length) * 100;
  }

  /**
   * Generate alerts based on metrics and events
   * @param {Object} metrics - Security metrics
   * @param {Array} recentEvents - Recent events
   * @returns {Promise<Array>} Generated alerts
   */
  async generateAlerts(metrics, recentEvents) {
    const alerts = [];

    // Check for high violation rates
    if (metrics.violationsBlocked > 50) {
      alerts.push({
        id: `high-violations-${Date.now()}`,
        type: 'critical_violation',
        message: `High violation rate detected: ${metrics.violationsBlocked} violations in the last 24 hours`,
        severity: 'error',
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Check for performance issues
    if (metrics.averageProcessingTime > 200) {
      alerts.push({
        id: `performance-${Date.now()}`,
        type: 'performance',
        message: `Sanitization performance degraded: ${metrics.averageProcessingTime.toFixed(2)}ms average`,
        severity: 'warning',
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Check for suspicious users
    if (metrics.suspiciousUsers.length > 0) {
      alerts.push({
        id: `suspicious-users-${Date.now()}`,
        type: 'rate_limit',
        message: `${metrics.suspiciousUsers.length} users with suspicious activity detected`,
        severity: 'warning',
        timestamp: new Date(),
        acknowledged: false
      });
    }

    return alerts;
  }

  /**
   * Get default metrics
   * @param {Object} timeWindow - Time window
   * @returns {Object} Default metrics
   */
  getDefaultMetrics(timeWindow) {
    const now = new Date();
    const start = timeWindow?.start || new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const end = timeWindow?.end || now;

    return {
      totalSanitizations: 0,
      violationsBlocked: 0,
      averageProcessingTime: 0,
      topViolationTypes: {},
      suspiciousUsers: [],
      performanceImpact: 0,
      timeWindow: { start, end },
      riskLevelDistribution: {}
    };
  }

  /**
   * Get default dashboard data
   * @returns {Object} Default dashboard data
   */
  getDefaultDashboardData() {
    return {
      metrics: this.getDefaultMetrics(),
      recentEvents: [],
      topViolators: [],
      systemHealth: {
        sanitizationServiceStatus: 'healthy',
        averageResponseTime: 0,
        errorRate: 0,
        lastHealthCheck: new Date()
      },
      alerts: []
    };
  }

  /**
   * Clear metrics cache
   */
  clearMetricsCache() {
    this.metricsCache = null;
    this.metricsCacheExpiry = 0;
  }
}

// Export singleton instance
const serverSecurityEventLogger = new ServerSecurityEventLogger();
module.exports = serverSecurityEventLogger;