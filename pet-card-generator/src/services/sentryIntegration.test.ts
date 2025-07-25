/**
 * Test suite for Sentry integration with security monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';
import {
  initializeSentry,
  reportSecurityViolation,
  reportPerformanceIssue,
  reportRateLimitExceeded,
  reportSanitizationFailure,
  addSecurityEventTags,
  createSanitizationPerformanceSpan,
  reportSecurityMetrics,
  createDashboardEvent,
  configureSentryAlerts,
  SecurityEventType,
  SecuritySeverity,
  SecurityDashboardMetrics
} from '../config/sentry';
import { SecurityViolation, ContentType } from '../types/sanitization';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  withScope: vi.fn((callback) => callback({
    setTag: vi.fn(),
    setUser: vi.fn(),
    setContext: vi.fn(),
    setFingerprint: vi.fn()
  })),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  getCurrentHub: vi.fn(() => ({
    getScope: vi.fn(() => ({
      getTransaction: vi.fn(() => ({
        startChild: vi.fn(() => ({
          setData: vi.fn(),
          setStatus: vi.fn(),
          finish: vi.fn()
        }))
      }))
    }))
  })),
  configureScope: vi.fn()
}));

describe('Sentry Security Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeSentry', () => {
    it('should initialize Sentry with security-focused configuration', () => {
      initializeSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: expect.any(String),
          environment: expect.any(String),
          tracesSampleRate: expect.any(Number),
          beforeSend: expect.any(Function),
          initialScope: expect.objectContaining({
            tags: expect.objectContaining({
              component: 'pet-card-generator',
              security_monitoring: 'enabled'
            })
          })
        })
      );
    });

    it('should filter sensitive information in beforeSend', () => {
      initializeSentry();
      const initCall = (Sentry.init as any).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        exception: {
          values: [{
            stacktrace: {
              frames: [{
                vars: {
                  password: 'secret123',
                  token: 'abc123',
                  normalVar: 'safe'
                }
              }]
            }
          }]
        }
      };

      const filteredEvent = beforeSend(event);

      expect(filteredEvent.exception.values[0].stacktrace.frames[0].vars).toEqual({
        password: '[Filtered]',
        token: '[Filtered]',
        normalVar: 'safe'
      });
    });
  });

  describe('reportSecurityViolation', () => {
    it('should report security violations with proper categorization', () => {
      const violations: SecurityViolation[] = [{
        type: 'script_tag',
        originalContent: '<script>alert("xss")</script>',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'high',
        description: 'Script tag detected'
      }];

      const context = {
        userId: 'user123',
        contentType: ContentType.PET_CARD_METADATA,
        endpoint: '/pet-card/sanitize',
        originalContent: '<script>alert("xss")</script>',
        sanitizedContent: '',
        sessionId: 'session123',
        requestId: 'req123'
      };

      reportSecurityViolation(violations, context);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Security violation detected'),
        SecuritySeverity.HIGH
      );
    });

    it('should set appropriate tags and context for security events', () => {
      const mockScope = {
        setTag: vi.fn(),
        setUser: vi.fn(),
        setContext: vi.fn(),
        setFingerprint: vi.fn()
      };

      (Sentry.withScope as any).mockImplementation((callback: any) => callback(mockScope));

      const violations: SecurityViolation[] = [{
        type: 'xss_attempt',
        originalContent: 'malicious content',
        sanitizedContent: 'safe content',
        timestamp: new Date(),
        severity: 'critical',
        description: 'XSS attempt detected'
      }];

      reportSecurityViolation(violations, {
        userId: 'user123',
        contentType: ContentType.USER_PROFILE,
        endpoint: '/profile/update'
      });

      expect(mockScope.setTag).toHaveBeenCalledWith('security_event_type', SecurityEventType.XSS_ATTEMPT);
      expect(mockScope.setTag).toHaveBeenCalledWith('content_type', ContentType.USER_PROFILE);
      expect(mockScope.setTag).toHaveBeenCalledWith('violation_count', '1');
      expect(mockScope.setUser).toHaveBeenCalledWith({ id: 'user123' });
    });
  });

  describe('reportPerformanceIssue', () => {
    it('should report performance issues for slow sanitization', () => {
      const context = {
        contentType: ContentType.PET_CARD_METADATA,
        contentLength: 5000,
        endpoint: '/sanitize',
        userId: 'user123'
      };

      reportPerformanceIssue(1500, context);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Sanitization performance degraded'),
        SecuritySeverity.HIGH
      );
    });

    it('should not report performance issues below threshold', () => {
      const context = {
        contentType: ContentType.PET_CARD_METADATA,
        contentLength: 100,
        endpoint: '/sanitize'
      };

      reportPerformanceIssue(150, context);

      expect(Sentry.withScope).not.toHaveBeenCalled();
    });
  });

  describe('reportRateLimitExceeded', () => {
    it('should report rate limit violations with user context', () => {
      reportRateLimitExceeded('user123', 15, 3600000, {
        endpoint: '/api/sanitize',
        ipAddress: '192.168.1.1'
      });

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded'),
        SecuritySeverity.HIGH
      );
    });

    it('should escalate to critical severity for high violation counts', () => {
      reportRateLimitExceeded('user123', 25, 3600000);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.anything(),
        SecuritySeverity.CRITICAL
      );
    });
  });

  describe('addSecurityEventTags', () => {
    it('should add comprehensive security categorization tags', () => {
      const mockScope = {
        setTag: vi.fn()
      };

      (Sentry.withScope as any).mockImplementation((callback: any) => callback(mockScope));

      addSecurityEventTags(SecurityEventType.XSS_ATTEMPT, {
        contentType: ContentType.USER_PROFILE,
        severity: 'high',
        userId: 'user123',
        endpoint: '/profile/update',
        violationCount: 3,
        processingTime: 750
      });

      expect(mockScope.setTag).toHaveBeenCalledWith('security_category', 'injection_attack');
      expect(mockScope.setTag).toHaveBeenCalledWith('threat_level', 'high');
      expect(mockScope.setTag).toHaveBeenCalledWith('content_category', 'user_profile');
      expect(mockScope.setTag).toHaveBeenCalledWith('performance_category', 'slow');
      expect(mockScope.setTag).toHaveBeenCalledWith('user_risk_category', 'tracked_user');
    });
  });

  describe('createSanitizationPerformanceSpan', () => {
    it('should create performance monitoring span', () => {
      const mockTransaction = {
        startChild: vi.fn(() => ({
          setData: vi.fn(),
          setStatus: vi.fn(),
          finish: vi.fn()
        }))
      };

      const mockScope = {
        getTransaction: vi.fn(() => mockTransaction)
      };

      (Sentry.getCurrentHub as any).mockReturnValue({
        getScope: vi.fn(() => mockScope)
      });

      const span = createSanitizationPerformanceSpan('sanitize', ContentType.PET_CARD_METADATA, 1000);

      expect(mockTransaction.startChild).toHaveBeenCalledWith({
        op: 'security.sanitization',
        description: `Sanitize ${ContentType.PET_CARD_METADATA}`,
        tags: expect.objectContaining({
          operation: 'sanitize',
          content_type: ContentType.PET_CARD_METADATA
        })
      });

      expect(span).toBeTruthy();
    });
  });

  describe('reportSecurityMetrics', () => {
    it('should report dashboard metrics to Sentry', () => {
      const metrics: SecurityDashboardMetrics = {
        totalViolations: 50,
        violationsByType: { 'xss_attempt': 20, 'malicious_content': 30 },
        violationsBySeverity: { 'high': 15, 'medium': 25, 'low': 10 },
        performanceMetrics: {
          averageSanitizationTime: 250,
          slowSanitizations: 5,
          failedSanitizations: 2
        },
        userMetrics: {
          usersWithViolations: 10,
          rateLimitedUsers: 3,
          topViolatingUsers: [{ userId: 'user1', count: 5 }]
        },
        timeSeriesData: [
          { timestamp: new Date(), violations: 10, performance: 200 }
        ]
      };

      reportSecurityMetrics(metrics);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Security Dashboard Metrics Update',
        'info'
      );
    });
  });

  describe('createDashboardEvent', () => {
    it('should create custom dashboard events', () => {
      const eventData = {
        metric_value: 100,
        threshold: 50,
        severity: 'warning'
      };

      const tags = {
        alert_type: 'threshold_exceeded',
        category: 'performance'
      };

      createDashboardEvent('performance_alert', eventData, tags);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Dashboard Event: performance_alert',
        'info'
      );
    });
  });

  describe('configureSentryAlerts', () => {
    it('should configure alert thresholds', () => {
      configureSentryAlerts();

      expect(Sentry.configureScope).toHaveBeenCalled();
    });
  });
});