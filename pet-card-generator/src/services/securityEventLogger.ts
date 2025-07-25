/**
 * Client-side security event logging service
 * Handles logging of security events and audit trails
 */

import { 
  SecurityEventLog, 
  AuditLog, 
  SecurityMetrics, 
  RateLimitInfo, 
  SecurityDashboardData,
  SecurityEventLogger,
  SecurityEventContext,
  SecurityEventLogDocument,
  AuditLogDocument
} from '../types/security-logging';
import { SecurityViolation, ContentType } from '../types/sanitization';

// Firebase imports (assuming Firebase is configured)
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  getDocs, 
  Timestamp,
  getFirestore
} from 'firebase/firestore';

// Sentry imports for security monitoring
import * as Sentry from '@sentry/react';
import { 
  SecurityEventType, 
  SecuritySeverity, 
  reportSecurityViolation, 
  reportPerformanceIssue,
  reportRateLimitExceeded,
  reportSanitizationFailure,
  createSecurityTransaction,
  addSecurityBreadcrumb
} from '../config/sentry';

class ClientSecurityEventLogger implements SecurityEventLogger {
  private db: any;
  private metricsCache: SecurityMetrics | null = null;
  private metricsCacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    try {
      this.db = getFirestore();
    } catch (error) {
      console.warn('Firebase not initialized, security logging will be limited:', error);
      this.db = null;
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEventLog, 'id' | 'timestamp'>): Promise<void> {
    if (!this.db) {
      console.warn('Firebase not available, logging to console:', event);
      return;
    }

    try {
      const eventDocument: SecurityEventLogDocument = {
        ...event,
        timestamp: Timestamp.now(),
        contentType: event.contentType.toString()
      };

      await addDoc(collection(this.db, 'securityEventLogs'), eventDocument);
      
      // Log to console for immediate visibility
      console.log(`Security event logged: ${event.severity} - ${event.violations.length} violations`);
      
      // Clear metrics cache to force refresh
      this.clearMetricsCache();
      
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Fallback to console logging
      console.warn('Security event (fallback):', event);
    }
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(audit: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    if (!this.db) {
      console.warn('Firebase not available, logging audit to console:', audit);
      return;
    }

    try {
      const auditDocument: AuditLogDocument = {
        ...audit,
        timestamp: Timestamp.now(),
        contentType: audit.contentType.toString()
      };

      await addDoc(collection(this.db, 'auditLogs'), auditDocument);
      
      console.log(`Audit log created: ${audit.action} - ${audit.riskLevel} risk`);
      
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Fallback to console logging
      console.warn('Audit log (fallback):', audit);
    }
  }

  /**
   * Get security metrics for a time window
   */
  async getSecurityMetrics(timeWindow?: { start: Date; end: Date }): Promise<SecurityMetrics> {
    // Check cache first
    if (this.metricsCache && Date.now() < this.metricsCacheExpiry) {
      return this.metricsCache;
    }

    if (!this.db) {
      return this.getDefaultMetrics(timeWindow);
    }

    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      const start = timeWindow?.start || defaultStart;
      const end = timeWindow?.end || now;

      // Query security events
      const eventsQuery = query(
        collection(this.db, 'securityEventLogs'),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        orderBy('timestamp', 'desc')
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as SecurityEventLogDocument[];

      // Query audit logs
      const auditQuery = query(
        collection(this.db, 'auditLogs'),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        orderBy('timestamp', 'desc')
      );

      const auditSnapshot = await getDocs(auditQuery);
      const audits = auditSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as AuditLogDocument[];

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
   */
  async checkRateLimit(userId: string, timeWindowMs: number = 3600000): Promise<RateLimitInfo> {
    if (!this.db) {
      return {
        userId,
        violationCount: 0,
        timeWindow: timeWindowMs,
        isExceeded: false,
        resetTime: new Date(Date.now() + timeWindowMs),
        maxViolations: 10
      };
    }

    try {
      const cutoffTime = new Date(Date.now() - timeWindowMs);
      
      const violationsQuery = query(
        collection(this.db, 'securityEventLogs'),
        where('userId', '==', userId),
        where('timestamp', '>', Timestamp.fromDate(cutoffTime)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(violationsQuery);
      const violationCount = snapshot.size;
      const maxViolations = 10; // Configurable threshold
      
      return {
        userId,
        violationCount,
        timeWindow: timeWindowMs,
        isExceeded: violationCount >= maxViolations,
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
        maxViolations: 10
      };
    }
  }

  /**
   * Get recent security events
   */
  async getRecentEvents(limit: number = 50, severity?: SecurityEventLog['severity']): Promise<SecurityEventLog[]> {
    if (!this.db) {
      return [];
    }

    try {
      let eventsQuery = query(
        collection(this.db, 'securityEventLogs'),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limit)
      );

      if (severity) {
        eventsQuery = query(
          collection(this.db, 'securityEventLogs'),
          where('severity', '==', severity),
          orderBy('timestamp', 'desc'),
          firestoreLimit(limit)
        );
      }

      const snapshot = await getDocs(eventsQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data() as SecurityEventLogDocument;
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
          contentType: data.contentType as ContentType
        } as SecurityEventLog;
      });
      
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<SecurityDashboardData> {
    try {
      const [metrics, recentEvents] = await Promise.all([
        this.getSecurityMetrics(),
        this.getRecentEvents(20)
      ]);

      // Calculate top violators
      const topViolators = await this.getTopViolators();
      
      // Get system health (simplified for client-side)
      const systemHealth = {
        sanitizationServiceStatus: 'healthy' as const,
        averageResponseTime: metrics.averageProcessingTime,
        errorRate: 0, // Would be calculated from actual error logs
        lastHealthCheck: new Date()
      };

      // Generate alerts based on metrics
      const alerts = this.generateAlerts(metrics, recentEvents);

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
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    // In a real implementation, this would update the alert status in the database
    console.log(`Alert ${alertId} acknowledged`);
  }

  /**
   * Log security event with context
   */
  async logSecurityEventWithContext(
    violations: SecurityViolation[],
    context: SecurityEventContext
  ): Promise<void> {
    const severity = this.calculateSeverity(violations);
    
    // Log to Firestore
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
      metadata: context.metadata
    });
    
    // Report to Sentry for security monitoring
    reportSecurityViolation(violations, {
      userId: context.userId,
      contentType: context.contentType,
      endpoint: context.endpoint,
      originalContent: context.originalContent,
      sanitizedContent: context.sanitizedContent,
      sessionId: context.sessionId,
      requestId: context.requestId
    });
  }

  /**
   * Log sanitization action
   */
  async logSanitizationAction(
    action: AuditLog['action'],
    context: SecurityEventContext,
    violations: SecurityViolation[],
    processingTime: number,
    riskLevel: AuditLog['riskLevel']
  ): Promise<void> {
    // Create audit log in Firestore
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
      metadata: context.metadata
    });
    
    // Track performance metrics in Sentry if processing time is significant
    if (processingTime > 0) {
      reportPerformanceIssue(processingTime, {
        contentType: context.contentType,
        contentLength: (context.originalContent || '').length,
        endpoint: context.endpoint,
        userId: context.userId
      });
    }
    
    // Report rate limit exceeded to Sentry if applicable
    if (action === 'block' && violations.some(v => v.type.includes('rate_limit'))) {
      if (context.userId) {
        reportRateLimitExceeded(
          context.userId,
          violations.length,
          3600000, // 1 hour window
          {
            endpoint: context.endpoint,
            ipAddress: context.ipAddress
          }
        );
      }
    }
    
    // Add security breadcrumb for tracing
    addSecurityBreadcrumb(
      `${action} action performed on ${context.contentType} content`,
      {
        action,
        contentType: context.contentType.toString(),
        violations: violations.length,
        processingTime,
        riskLevel,
        endpoint: context.endpoint
      },
      riskLevel === 'critical' || riskLevel === 'high' ? 'warning' : 'info'
    );
  }

  private calculateSeverity(violations: SecurityViolation[]): SecurityEventLog['severity'] {
    if (violations.some(v => v.severity === 'critical')) return 'critical';
    if (violations.some(v => v.severity === 'high')) return 'error';
    if (violations.some(v => v.severity === 'medium')) return 'warning';
    return 'info';
  }

  private calculateMetrics(
    events: SecurityEventLogDocument[], 
    audits: AuditLogDocument[], 
    timeWindow: { start: Date; end: Date }
  ): SecurityMetrics {
    const totalSanitizations = audits.length;
    const violationsBlocked = events.reduce((sum, event) => sum + event.violations.length, 0);
    const processingTimes = audits.map(audit => audit.processingTime).filter(time => time > 0);
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    // Calculate top violation types
    const violationTypes: Record<string, number> = {};
    events.forEach(event => {
      event.violations.forEach(violation => {
        violationTypes[violation.type] = (violationTypes[violation.type] || 0) + 1;
      });
    });

    // Get suspicious users (users with multiple violations)
    const userViolations: Record<string, number> = {};
    events.forEach(event => {
      if (event.userId) {
        userViolations[event.userId] = (userViolations[event.userId] || 0) + event.violations.length;
      }
    });
    const suspiciousUsers = Object.entries(userViolations)
      .filter(([, count]) => count >= 5)
      .map(([userId]) => userId);

    // Calculate risk level distribution
    const riskLevelDistribution: Record<string, number> = {};
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

  private async getTopViolators(): Promise<SecurityDashboardData['topViolators']> {
    if (!this.db) return [];

    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const eventsQuery = query(
        collection(this.db, 'securityEventLogs'),
        where('timestamp', '>', Timestamp.fromDate(last24Hours)),
        where('userId', '!=', null)
      );

      const snapshot = await getDocs(eventsQuery);
      const userViolations: Record<string, { count: number; lastViolation: Date }> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data() as SecurityEventLogDocument;
        if (data.userId) {
          if (!userViolations[data.userId]) {
            userViolations[data.userId] = { count: 0, lastViolation: data.timestamp.toDate() };
          }
          userViolations[data.userId].count += data.violations.length;
          const violationDate = data.timestamp.toDate();
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
          riskScore: Math.min(data.count * 10, 100) // Simple risk scoring
        }))
        .sort((a, b) => b.violationCount - a.violationCount)
        .slice(0, 10);
        
    } catch (error) {
      console.error('Failed to get top violators:', error);
      return [];
    }
  }

  private generateAlerts(metrics: SecurityMetrics, recentEvents: SecurityEventLog[]): SecurityDashboardData['alerts'] {
    const alerts: SecurityDashboardData['alerts'] = [];

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

  private getDefaultMetrics(timeWindow?: { start: Date; end: Date }): SecurityMetrics {
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

  private getDefaultDashboardData(): SecurityDashboardData {
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

  private clearMetricsCache(): void {
    this.metricsCache = null;
    this.metricsCacheExpiry = 0;
  }
}

// Export singleton instance
export const securityEventLogger = new ClientSecurityEventLogger();
export default securityEventLogger;