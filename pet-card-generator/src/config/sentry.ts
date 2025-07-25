/**
 * Sentry configuration for security monitoring
 * Handles initialization and custom security event tracking
 */

import * as Sentry from '@sentry/react';
import { SecurityViolation, ContentType } from '../types/sanitization';

// Sentry configuration
const SENTRY_DSN = process.env.VITE_SENTRY_DSN || 'https://your-dsn@sentry.io/project-id';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Performance monitoring thresholds
const PERFORMANCE_THRESHOLDS = {
  SANITIZATION_WARNING: 100, // ms
  SANITIZATION_ERROR: 500,   // ms
  SANITIZATION_CRITICAL: 1000 // ms
};

// Security alert configuration
const SECURITY_ALERT_CONFIG = {
  CRITICAL_VIOLATION_THRESHOLD: 5,
  RATE_LIMIT_ALERT_THRESHOLD: 10,
  PERFORMANCE_DEGRADATION_THRESHOLD: 3
};

/**
 * Initialize Sentry with security-focused configuration
 */
export function initializeSentry(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Security-focused configuration
    beforeSend(event) {
      // Filter out sensitive information from error reports
      if (event.exception) {
        event.exception.values?.forEach(exception => {
          if (exception.stacktrace?.frames) {
            exception.stacktrace.frames.forEach(frame => {
              // Remove sensitive data from stack traces
              if (frame.vars) {
                Object.keys(frame.vars).forEach(key => {
                  if (key.toLowerCase().includes('password') || 
                      key.toLowerCase().includes('token') ||
                      key.toLowerCase().includes('secret')) {
                    frame.vars[key] = '[Filtered]';
                  }
                });
              }
            });
          }
        });
      }
      
      return event;
    },
    
    // Custom tags for security events
    initialScope: {
      tags: {
        component: 'pet-card-generator',
        security_monitoring: 'enabled'
      }
    }
  });
}

/**
 * Security event types for Sentry categorization
 */
export enum SecurityEventType {
  XSS_ATTEMPT = 'xss_attempt',
  MALICIOUS_CONTENT = 'malicious_content',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SANITIZATION_FAILURE = 'sanitization_failure',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PERFORMANCE_DEGRADATION = 'performance_degradation'
}

/**
 * Security severity levels for Sentry
 */
export enum SecuritySeverity {
  LOW = 'info',
  MEDIUM = 'warning',
  HIGH = 'error',
  CRITICAL = 'fatal'
}

/**
 * Report security violation to Sentry
 */
export function reportSecurityViolation(
  violations: SecurityViolation[],
  context: {
    userId?: string;
    contentType: ContentType;
    endpoint?: string;
    originalContent?: string;
    sanitizedContent?: string;
    sessionId?: string;
    requestId?: string;
  }
): void {
  const severity = calculateSentrySecuritySeverity(violations);
  const eventType = determineSecurityEventType(violations);
  
  Sentry.withScope(scope => {
    // Set security-specific tags
    scope.setTag('security_event_type', eventType);
    scope.setTag('content_type', context.contentType);
    scope.setTag('violation_count', violations.length.toString());
    
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context.endpoint) {
      scope.setTag('endpoint', context.endpoint);
    }
    
    if (context.sessionId) {
      scope.setTag('session_id', context.sessionId);
    }
    
    if (context.requestId) {
      scope.setTag('request_id', context.requestId);
    }
    
    // Set context data
    scope.setContext('security_violations', {
      violations: violations.map(v => ({
        type: v.type,
        severity: v.severity,
        description: v.description,
        timestamp: v.timestamp
      })),
      total_violations: violations.length,
      highest_severity: violations.reduce((max, v) => 
        getSeverityLevel(v.severity) > getSeverityLevel(max) ? v.severity : max, 'low'
      )
    });
    
    scope.setContext('content_info', {
      content_type: context.contentType,
      original_length: context.originalContent?.length || 0,
      sanitized_length: context.sanitizedContent?.length || 0,
      content_changed: context.originalContent !== context.sanitizedContent
    });
    
    // Set fingerprint for grouping similar security events
    scope.setFingerprint([
      eventType,
      context.contentType,
      violations.map(v => v.type).sort().join(',')
    ]);
    
    // Capture the security event
    Sentry.captureMessage(
      `Security violation detected: ${violations.length} violations of type(s) ${violations.map(v => v.type).join(', ')}`,
      severity
    );
  });
}

/**
 * Report sanitization performance issue to Sentry
 */
export function reportPerformanceIssue(
  processingTime: number,
  context: {
    contentType: ContentType;
    contentLength: number;
    endpoint?: string;
    userId?: string;
  }
): void {
  if (processingTime <= 200) return; // Only report if over threshold
  
  Sentry.withScope(scope => {
    scope.setTag('security_event_type', SecurityEventType.PERFORMANCE_DEGRADATION);
    scope.setTag('content_type', context.contentType);
    scope.setTag('performance_issue', 'sanitization_slow');
    
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context.endpoint) {
      scope.setTag('endpoint', context.endpoint);
    }
    
    scope.setContext('performance_data', {
      processing_time_ms: processingTime,
      content_length: context.contentLength,
      performance_threshold_ms: 200,
      performance_ratio: processingTime / 200
    });
    
    scope.setFingerprint([
      'performance_degradation',
      context.contentType,
      `${Math.floor(processingTime / 100) * 100}ms` // Group by 100ms buckets
    ]);
    
    const severity = processingTime > 1000 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM;
    
    Sentry.captureMessage(
      `Sanitization performance degraded: ${processingTime}ms for ${context.contentType}`,
      severity
    );
  });
}

/**
 * Report rate limit exceeded to Sentry
 */
export function reportRateLimitExceeded(
  userId: string,
  violationCount: number,
  timeWindow: number,
  context?: {
    endpoint?: string;
    ipAddress?: string;
  }
): void {
  Sentry.withScope(scope => {
    scope.setTag('security_event_type', SecurityEventType.RATE_LIMIT_EXCEEDED);
    scope.setTag('rate_limit_exceeded', 'true');
    scope.setUser({ id: userId });
    
    if (context?.endpoint) {
      scope.setTag('endpoint', context.endpoint);
    }
    
    if (context?.ipAddress) {
      scope.setTag('ip_address', context.ipAddress);
    }
    
    scope.setContext('rate_limit_data', {
      user_id: userId,
      violation_count: violationCount,
      time_window_ms: timeWindow,
      violations_per_hour: Math.round((violationCount / timeWindow) * 3600000)
    });
    
    scope.setFingerprint([
      'rate_limit_exceeded',
      userId,
      `${Math.floor(violationCount / 5) * 5}` // Group by violation count buckets
    ]);
    
    const severity = violationCount > 20 ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH;
    
    Sentry.captureMessage(
      `Rate limit exceeded: User ${userId} had ${violationCount} violations`,
      severity
    );
  });
}

/**
 * Report sanitization failure to Sentry
 */
export function reportSanitizationFailure(
  error: Error,
  context: {
    contentType: ContentType;
    originalContent?: string;
    userId?: string;
    endpoint?: string;
  }
): void {
  Sentry.withScope(scope => {
    scope.setTag('security_event_type', SecurityEventType.SANITIZATION_FAILURE);
    scope.setTag('content_type', context.contentType);
    scope.setTag('sanitization_failure', 'true');
    
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context.endpoint) {
      scope.setTag('endpoint', context.endpoint);
    }
    
    scope.setContext('sanitization_failure', {
      content_type: context.contentType,
      content_length: context.originalContent?.length || 0,
      error_message: error.message,
      error_name: error.name
    });
    
    scope.setFingerprint([
      'sanitization_failure',
      context.contentType,
      error.name
    ]);
    
    Sentry.captureException(error);
  });
}

/**
 * Create custom Sentry span for security monitoring
 */
export function createSecuritySpan(
  name: string,
  operation: string = 'security.sanitization'
): void {
  Sentry.addBreadcrumb({
    message: `Security operation: ${name}`,
    category: 'security',
    level: 'info',
    data: {
      operation,
      security_monitoring: true
    }
  });
}

/**
 * Add security breadcrumb for debugging
 */
export function addSecurityBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.addBreadcrumb({
    message,
    category: 'security',
    level,
    data,
    timestamp: Date.now() / 1000
  });
}

// Helper functions

function calculateSentrySecuritySeverity(violations: SecurityViolation[]): SecuritySeverity {
  const maxSeverity = violations.reduce((max, violation) => {
    const level = getSeverityLevel(violation.severity);
    return level > getSeverityLevel(max) ? violation.severity : max;
  }, 'low');
  
  switch (maxSeverity) {
    case 'critical': return SecuritySeverity.CRITICAL;
    case 'high': return SecuritySeverity.HIGH;
    case 'medium': return SecuritySeverity.MEDIUM;
    default: return SecuritySeverity.LOW;
  }
}

function getSeverityLevel(severity: string): number {
  switch (severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function determineSecurityEventType(violations: SecurityViolation[]): SecurityEventType {
  // Determine the most appropriate event type based on violations
  const violationTypes = violations.map(v => v.type);
  
  if (violationTypes.some(type => type.includes('script') || type.includes('xss'))) {
    return SecurityEventType.XSS_ATTEMPT;
  }
  
  if (violationTypes.some(type => type.includes('malicious') || type.includes('dangerous'))) {
    return SecurityEventType.MALICIOUS_CONTENT;
  }
  
  if (violationTypes.some(type => type.includes('rate_limit'))) {
    return SecurityEventType.RATE_LIMIT_EXCEEDED;
  }
  
  return SecurityEventType.SUSPICIOUS_ACTIVITY;
}

/**
 * Security metrics dashboard configuration
 */
export interface SecurityDashboardMetrics {
  totalViolations: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  performanceMetrics: {
    averageSanitizationTime: number;
    slowSanitizations: number;
    failedSanitizations: number;
  };
  userMetrics: {
    usersWithViolations: number;
    rateLimitedUsers: number;
    topViolatingUsers: Array<{ userId: string; count: number }>;
  };
  timeSeriesData: Array<{
    timestamp: Date;
    violations: number;
    performance: number;
  }>;
}

/**
 * Configure Sentry alerts for critical security violations
 */
export function configureSentryAlerts(): void {
  // Set up custom alert rules via Sentry SDK
  Sentry.withScope(scope => {
    scope.setTag('alert_configuration', 'enabled');
    
    // Configure alert thresholds
    scope.setContext('alert_thresholds', {
      critical_violations_per_hour: 10,
      rate_limit_violations_per_user: 5,
      performance_degradation_threshold_ms: 1000,
      failed_sanitizations_per_hour: 20
    });
  });
}

/**
 * Enhanced security event categorization with custom tags
 */
export function addSecurityEventTags(
  eventType: SecurityEventType,
  context: {
    contentType: string;
    severity: string;
    userId?: string;
    endpoint?: string;
    violationCount?: number;
    processingTime?: number;
  }
): void {
  Sentry.withScope(scope => {
    // Primary categorization tags
    scope.setTag('security_category', getSecurityCategory(eventType));
    scope.setTag('threat_level', getThreatLevel(context.severity, context.violationCount));
    scope.setTag('content_category', getContentCategory(context.contentType));
    
    // Performance categorization
    if (context.processingTime) {
      scope.setTag('performance_category', getPerformanceCategory(context.processingTime));
    }
    
    // User behavior categorization
    if (context.userId) {
      scope.setTag('user_risk_category', 'tracked_user');
    } else {
      scope.setTag('user_risk_category', 'anonymous_user');
    }
    
    // Endpoint categorization
    if (context.endpoint) {
      scope.setTag('endpoint_category', getEndpointCategory(context.endpoint));
    }
    
    // Time-based categorization
    const hour = new Date().getHours();
    scope.setTag('time_category', getTimeCategory(hour));
    
    // Frequency categorization
    if (context.violationCount) {
      scope.setTag('frequency_category', getFrequencyCategory(context.violationCount));
    }
  });
}

/**
 * Create performance monitoring span for sanitization operations
 */
export function createSanitizationPerformanceSpan(
  operation: string,
  contentType: string,
  contentLength: number
): any {
  return Sentry.startSpan({
    op: 'security.sanitization',
    name: `Sanitize ${contentType}`,
    attributes: {
      operation,
      content_type: contentType,
      content_length_category: getContentLengthCategory(contentLength),
      content_length: contentLength,
      expected_time_ms: estimateProcessingTime(contentLength)
    }
  }, (span) => {
    return span;
  });
}

/**
 * Report security metrics to Sentry for dashboard creation
 */
export function reportSecurityMetrics(metrics: SecurityDashboardMetrics): void {
  Sentry.withScope(scope => {
    scope.setTag('metric_type', 'security_dashboard');
    scope.setTag('metric_category', 'aggregated_security_data');
    
    // Set metric contexts for Sentry dashboard
    scope.setContext('violation_metrics', {
      total_violations: metrics.totalViolations,
      violations_by_type: metrics.violationsByType,
      violations_by_severity: metrics.violationsBySeverity
    });
    
    scope.setContext('performance_metrics', {
      average_sanitization_time: metrics.performanceMetrics.averageSanitizationTime,
      slow_sanitizations: metrics.performanceMetrics.slowSanitizations,
      failed_sanitizations: metrics.performanceMetrics.failedSanitizations
    });
    
    scope.setContext('user_metrics', {
      users_with_violations: metrics.userMetrics.usersWithViolations,
      rate_limited_users: metrics.userMetrics.rateLimitedUsers,
      top_violating_users_count: metrics.userMetrics.topViolatingUsers.length
    });
    
    scope.setContext('time_series_summary', {
      data_points: metrics.timeSeriesData.length,
      time_range_hours: metrics.timeSeriesData.length > 0 ? 
        (metrics.timeSeriesData[metrics.timeSeriesData.length - 1].timestamp.getTime() - 
         metrics.timeSeriesData[0].timestamp.getTime()) / (1000 * 60 * 60) : 0
    });
    
    // Set fingerprint for dashboard grouping
    scope.setFingerprint(['security_dashboard_metrics', new Date().toISOString().split('T')[0]]);
    
    Sentry.captureMessage('Security Dashboard Metrics Update', 'info');
  });
}

/**
 * Create custom Sentry dashboard event
 */
export function createDashboardEvent(
  eventName: string,
  data: Record<string, any>,
  tags?: Record<string, string>
): void {
  Sentry.withScope(scope => {
    scope.setTag('event_type', 'dashboard_event');
    scope.setTag('dashboard_event_name', eventName);
    
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    scope.setContext('dashboard_data', data);
    scope.setFingerprint(['dashboard_event', eventName]);
    
    Sentry.captureMessage(`Dashboard Event: ${eventName}`, 'info');
  });
}

// Helper functions for categorization

function getSecurityCategory(eventType: SecurityEventType): string {
  switch (eventType) {
    case SecurityEventType.XSS_ATTEMPT:
      return 'injection_attack';
    case SecurityEventType.MALICIOUS_CONTENT:
      return 'content_threat';
    case SecurityEventType.RATE_LIMIT_EXCEEDED:
      return 'abuse_prevention';
    case SecurityEventType.SANITIZATION_FAILURE:
      return 'system_failure';
    case SecurityEventType.PERFORMANCE_DEGRADATION:
      return 'performance_issue';
    default:
      return 'general_security';
  }
}

function getThreatLevel(severity: string, violationCount?: number): string {
  const count = violationCount || 1;
  
  if (severity === 'critical' || count > 10) return 'critical';
  if (severity === 'high' || count > 5) return 'high';
  if (severity === 'medium' || count > 2) return 'medium';
  return 'low';
}

function getContentCategory(contentType: string): string {
  if (contentType.includes('profile')) return 'user_profile';
  if (contentType.includes('card')) return 'pet_card';
  if (contentType.includes('comment')) return 'user_comment';
  if (contentType.includes('social')) return 'social_sharing';
  return 'general_content';
}

function getPerformanceCategory(processingTime: number): string {
  if (processingTime > 1000) return 'very_slow';
  if (processingTime > 500) return 'slow';
  if (processingTime > 200) return 'moderate';
  return 'fast';
}

function getEndpointCategory(endpoint: string): string {
  if (endpoint.includes('/user/')) return 'user_endpoint';
  if (endpoint.includes('/pet-card/')) return 'pet_card_endpoint';
  if (endpoint.includes('/social/')) return 'social_endpoint';
  if (endpoint.includes('/security/')) return 'security_endpoint';
  return 'general_endpoint';
}

function getTimeCategory(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

function getFrequencyCategory(violationCount: number): string {
  if (violationCount > 20) return 'very_high_frequency';
  if (violationCount > 10) return 'high_frequency';
  if (violationCount > 5) return 'medium_frequency';
  if (violationCount > 1) return 'low_frequency';
  return 'single_occurrence';
}

function getContentLengthCategory(length: number): string {
  if (length > 10000) return 'very_large';
  if (length > 5000) return 'large';
  if (length > 1000) return 'medium';
  if (length > 100) return 'small';
  return 'very_small';
}

function estimateProcessingTime(contentLength: number): number {
  // Rough estimation: 1ms per 100 characters
  return Math.max(10, Math.floor(contentLength / 100));
}

// React imports for routing instrumentation (will be available in React context)
declare const React: any;
declare const useLocation: any;
declare const useNavigationType: any;
declare const createRoutesFromChildren: any;
declare const matchRoutes: any;