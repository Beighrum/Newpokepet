/**
 * Security Event Integration Service
 * Provides unified interface for security event logging across the application
 */

import { securityEventLogger } from './securityEventLogger';
import { SecurityViolation, ContentType } from '../types/sanitization';
import { SecurityEventContext } from '../types/security-logging';
import { 
  reportSecurityViolation, 
  reportPerformanceIssue, 
  reportRateLimitExceeded,
  addSecurityEventTags,
  createSanitizationPerformanceSpan,
  reportSecurityMetrics,
  createDashboardEvent,
  configureSentryAlerts,
  SecurityEventType,
  SecurityDashboardMetrics
} from '../config/sentry';

export class SecurityEventIntegration {
  private static instance: SecurityEventIntegration;
  private requestIdCounter = 0;

  private constructor() {}

  public static getInstance(): SecurityEventIntegration {
    if (!SecurityEventIntegration.instance) {
      SecurityEventIntegration.instance = new SecurityEventIntegration();
    }
    return SecurityEventIntegration.instance;
  }

  /**
   * Generate a unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * Extract IP address from request (client-side approximation)
   */
  private async getClientIP(): Promise<string> {
    try {
      // In a real application, this would be provided by the server
      // For client-side, we can use a service or approximate
      return 'client-side'; // Placeholder
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string {
    return navigator.userAgent || 'unknown';
  }

  /**
   * Create security event context from current environment
   */
  private async createContext(
    endpoint: string,
    contentType: ContentType,
    userId?: string,
    originalContent?: string,
    sanitizedContent?: string,
    metadata?: Record<string, any>
  ): Promise<SecurityEventContext> {
    return {
      userId,
      ipAddress: await this.getClientIP(),
      userAgent: this.getUserAgent(),
      endpoint,
      sessionId: this.getSessionId(),
      requestId: this.generateRequestId(),
      contentType,
      originalContent,
      sanitizedContent,
      metadata
    };
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('security_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('security_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Log sanitization event for pet card content
   */
  async logPetCardSanitization(
    originalContent: string,
    sanitizedContent: string,
    violations: SecurityViolation[],
    userId?: string,
    processingTime?: number
  ): Promise<void> {
    const context = await this.createContext(
      '/pet-card/sanitize',
      ContentType.PET_CARD_METADATA,
      userId,
      originalContent,
      sanitizedContent,
      { cardType: 'pet_metadata' }
    );

    // Create performance span for monitoring
    const span = createSanitizationPerformanceSpan(
      'pet_card_sanitization',
      ContentType.PET_CARD_METADATA,
      originalContent.length
    );

    try {
      // Log security event if violations found
      if (violations.length > 0) {
        // Add enhanced Sentry tags for categorization
        addSecurityEventTags(SecurityEventType.MALICIOUS_CONTENT, {
          contentType: ContentType.PET_CARD_METADATA,
          severity: this.calculateRiskLevel(violations),
          userId,
          endpoint: '/pet-card/sanitize',
          violationCount: violations.length,
          processingTime
        });

        // Report to Sentry with enhanced context
        reportSecurityViolation(violations, {
          userId,
          contentType: ContentType.PET_CARD_METADATA,
          endpoint: '/pet-card/sanitize',
          originalContent,
          sanitizedContent,
          sessionId: context.sessionId,
          requestId: context.requestId
        });

        await securityEventLogger.logSecurityEventWithContext(violations, context);
      }

      // Report performance issues if processing time is high
      if (processingTime && processingTime > 200) {
        reportPerformanceIssue(processingTime, {
          contentType: ContentType.PET_CARD_METADATA,
          contentLength: originalContent.length,
          endpoint: '/pet-card/sanitize',
          userId
        });
      }

      // Always log sanitization action for audit trail
      const riskLevel = this.calculateRiskLevel(violations);
      await securityEventLogger.logSanitizationAction(
        'sanitize',
        context,
        violations,
        processingTime || 0,
        riskLevel
      );

      // Update performance span
      if (span) {
        span.setData('violations_found', violations.length);
        span.setData('processing_time_ms', processingTime || 0);
        span.setStatus('ok');
      }
    } catch (error) {
      if (span) {
        span.setStatus('internal_error');
      }
      throw error;
    } finally {
      if (span) {
        span.finish();
      }
    }
  }

  /**
   * Log sanitization event for user profile content
   */
  async logUserProfileSanitization(
    originalContent: string,
    sanitizedContent: string,
    violations: SecurityViolation[],
    userId?: string,
    processingTime?: number
  ): Promise<void> {
    const context = await this.createContext(
      '/user/profile/sanitize',
      ContentType.USER_PROFILE,
      userId,
      originalContent,
      sanitizedContent,
      { profileField: 'general' }
    );

    if (violations.length > 0) {
      await securityEventLogger.logSecurityEventWithContext(violations, context);
    }

    const riskLevel = this.calculateRiskLevel(violations);
    await securityEventLogger.logSanitizationAction(
      'sanitize',
      context,
      violations,
      processingTime || 0,
      riskLevel
    );
  }

  /**
   * Log sanitization event for comment content
   */
  async logCommentSanitization(
    originalContent: string,
    sanitizedContent: string,
    violations: SecurityViolation[],
    userId?: string,
    processingTime?: number
  ): Promise<void> {
    const context = await this.createContext(
      '/comment/sanitize',
      ContentType.COMMENT,
      userId,
      originalContent,
      sanitizedContent,
      { commentType: 'user_comment' }
    );

    if (violations.length > 0) {
      await securityEventLogger.logSecurityEventWithContext(violations, context);
    }

    const riskLevel = this.calculateRiskLevel(violations);
    await securityEventLogger.logSanitizationAction(
      'sanitize',
      context,
      violations,
      processingTime || 0,
      riskLevel
    );
  }

  /**
   * Log sanitization event for social sharing content
   */
  async logSocialSharingSanitization(
    originalContent: string,
    sanitizedContent: string,
    violations: SecurityViolation[],
    userId?: string,
    processingTime?: number
  ): Promise<void> {
    const context = await this.createContext(
      '/social/share/sanitize',
      ContentType.SOCIAL_SHARING,
      userId,
      originalContent,
      sanitizedContent,
      { shareType: 'social_media' }
    );

    if (violations.length > 0) {
      await securityEventLogger.logSecurityEventWithContext(violations, context);
    }

    const riskLevel = this.calculateRiskLevel(violations);
    await securityEventLogger.logSanitizationAction(
      'sanitize',
      context,
      violations,
      processingTime || 0,
      riskLevel
    );
  }

  /**
   * Log blocked content event
   */
  async logBlockedContent(
    content: string,
    violations: SecurityViolation[],
    endpoint: string,
    contentType: ContentType,
    userId?: string,
    reason?: string
  ): Promise<void> {
    const context = await this.createContext(
      endpoint,
      contentType,
      userId,
      content,
      undefined,
      { blockReason: reason || 'security_violation' }
    );

    await securityEventLogger.logSecurityEventWithContext(violations, context);

    const riskLevel = this.calculateRiskLevel(violations);
    await securityEventLogger.logSanitizationAction(
      'block',
      context,
      violations,
      0,
      riskLevel
    );
  }

  /**
   * Log flagged content event
   */
  async logFlaggedContent(
    content: string,
    violations: SecurityViolation[],
    endpoint: string,
    contentType: ContentType,
    userId?: string,
    reason?: string
  ): Promise<void> {
    const context = await this.createContext(
      endpoint,
      contentType,
      userId,
      content,
      undefined,
      { flagReason: reason || 'suspicious_content' }
    );

    await securityEventLogger.logSecurityEventWithContext(violations, context);

    const riskLevel = this.calculateRiskLevel(violations);
    await securityEventLogger.logSanitizationAction(
      'flag',
      context,
      violations,
      0,
      riskLevel
    );
  }

  /**
   * Check if user has exceeded rate limits
   */
  async checkUserRateLimit(userId: string): Promise<boolean> {
    try {
      const rateLimitInfo = await securityEventLogger.checkRateLimit(userId);
      
      if (rateLimitInfo.isExceeded) {
        // Log rate limit exceeded event
        await this.logRateLimitExceeded(userId, rateLimitInfo.violationCount);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      return false; // Fail open for rate limiting
    }
  }

  /**
   * Log rate limit exceeded event
   */
  private async logRateLimitExceeded(userId: string, violationCount: number): Promise<void> {
    const violations: SecurityViolation[] = [{
      type: 'rate_limit_exceeded',
      originalContent: '',
      sanitizedContent: '',
      timestamp: new Date(),
      severity: 'high',
      description: `User exceeded rate limit with ${violationCount} violations`
    }];

    const context = await this.createContext(
      '/security/rate-limit',
      ContentType.GENERAL,
      userId,
      undefined,
      undefined,
      { violationCount, rateLimitType: 'security_violations' }
    );

    // Add enhanced Sentry tags for rate limiting
    addSecurityEventTags(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      contentType: ContentType.GENERAL,
      severity: 'high',
      userId,
      endpoint: '/security/rate-limit',
      violationCount
    });

    // Report to Sentry with rate limit context
    reportRateLimitExceeded(userId, violationCount, 3600000, { // 1 hour window
      endpoint: '/security/rate-limit',
      ipAddress: context.ipAddress
    });

    await securityEventLogger.logSecurityEventWithContext(violations, context);
  }

  /**
   * Get security metrics for dashboard
   */
  async getSecurityMetrics(timeWindow?: { start: Date; end: Date }) {
    return await securityEventLogger.getSecurityMetrics(timeWindow);
  }

  /**
   * Get recent security events
   */
  async getRecentSecurityEvents(limit?: number, severity?: string) {
    return await securityEventLogger.getRecentEvents(limit, severity as any);
  }

  /**
   * Get dashboard data
   */
  async getDashboardData() {
    return await securityEventLogger.getDashboardData();
  }

  /**
   * Calculate risk level from violations
   */
  private calculateRiskLevel(violations: SecurityViolation[]): 'low' | 'medium' | 'high' | 'critical' {
    if (violations.length === 0) return 'low';
    
    const maxSeverity = violations.reduce((max, violation) => {
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      const currentLevel = severityLevels[violation.severity] || 1;
      const maxLevel = severityLevels[max] || 1;
      return currentLevel > maxLevel ? violation.severity : max;
    }, 'low' as SecurityViolation['severity']);

    return maxSeverity;
  }

  /**
   * Generate and report security dashboard metrics
   */
  async generateDashboardMetrics(): Promise<SecurityDashboardMetrics> {
    try {
      const dashboardData = await securityEventLogger.getDashboardData();
      const recentEvents = await securityEventLogger.getRecentEvents(100);
      
      const metrics: SecurityDashboardMetrics = {
        totalViolations: dashboardData.totalViolations || 0,
        violationsByType: dashboardData.violationsByType || {},
        violationsBySeverity: dashboardData.violationsBySeverity || {},
        performanceMetrics: {
          averageSanitizationTime: dashboardData.averageProcessingTime || 0,
          slowSanitizations: dashboardData.slowSanitizations || 0,
          failedSanitizations: dashboardData.failedSanitizations || 0
        },
        userMetrics: {
          usersWithViolations: dashboardData.usersWithViolations || 0,
          rateLimitedUsers: dashboardData.rateLimitedUsers || 0,
          topViolatingUsers: dashboardData.topViolatingUsers || []
        },
        timeSeriesData: this.generateTimeSeriesData(recentEvents)
      };

      // Report metrics to Sentry for dashboard creation
      reportSecurityMetrics(metrics);

      return metrics;
    } catch (error) {
      console.error('Failed to generate dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Generate time series data from recent events
   */
  private generateTimeSeriesData(events: any[]): Array<{timestamp: Date; violations: number; performance: number}> {
    const timeSeriesMap = new Map<string, {violations: number; performance: number; count: number}>();
    
    events.forEach(event => {
      const hourKey = new Date(event.timestamp).toISOString().slice(0, 13); // Group by hour
      const existing = timeSeriesMap.get(hourKey) || {violations: 0, performance: 0, count: 0};
      
      existing.violations += event.violations?.length || 0;
      existing.performance += event.processingTime || 0;
      existing.count += 1;
      
      timeSeriesMap.set(hourKey, existing);
    });

    return Array.from(timeSeriesMap.entries()).map(([hourKey, data]) => ({
      timestamp: new Date(hourKey + ':00:00.000Z'),
      violations: data.violations,
      performance: data.count > 0 ? data.performance / data.count : 0
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Create custom dashboard event
   */
  async createCustomDashboardEvent(
    eventName: string,
    data: Record<string, any>,
    tags?: Record<string, string>
  ): Promise<void> {
    createDashboardEvent(eventName, data, tags);
  }

  /**
   * Monitor and report security trends
   */
  async monitorSecurityTrends(): Promise<void> {
    try {
      const metrics = await this.generateDashboardMetrics();
      
      // Check for concerning trends
      if (metrics.totalViolations > 100) {
        createDashboardEvent('high_violation_count', {
          total_violations: metrics.totalViolations,
          threshold: 100,
          severity: 'warning'
        }, { alert_type: 'trend_analysis' });
      }

      if (metrics.performanceMetrics.averageSanitizationTime > 500) {
        createDashboardEvent('performance_degradation', {
          average_time: metrics.performanceMetrics.averageSanitizationTime,
          threshold: 500,
          severity: 'warning'
        }, { alert_type: 'performance_trend' });
      }

      if (metrics.userMetrics.rateLimitedUsers > 5) {
        createDashboardEvent('high_rate_limit_violations', {
          rate_limited_users: metrics.userMetrics.rateLimitedUsers,
          threshold: 5,
          severity: 'high'
        }, { alert_type: 'abuse_trend' });
      }

    } catch (error) {
      console.error('Failed to monitor security trends:', error);
    }
  }

  /**
   * Initialize security event logging for the application
   */
  async initialize(): Promise<void> {
    try {
      // Configure Sentry alerts
      configureSentryAlerts();

      // Log application startup
      const context = await this.createContext(
        '/app/startup',
        ContentType.GENERAL,
        undefined,
        undefined,
        undefined,
        { 
          appVersion: process.env.REACT_APP_VERSION || 'unknown',
          environment: process.env.NODE_ENV || 'development'
        }
      );

      await securityEventLogger.logSecurityEvent({
        userId: undefined,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        violations: [],
        severity: 'info',
        contentType: ContentType.GENERAL,
        sessionId: context.sessionId,
        requestId: context.requestId,
        metadata: context.metadata
      });

      // Create initialization dashboard event
      createDashboardEvent('security_system_initialized', {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.REACT_APP_VERSION || 'unknown'
      }, { event_category: 'system_lifecycle' });

      console.log('Security event logging initialized with enhanced Sentry monitoring');
    } catch (error) {
      console.error('Failed to initialize security event logging:', error);
    }
  }
}

// Export singleton instance
export const securityEventIntegration = SecurityEventIntegration.getInstance();
export default securityEventIntegration;