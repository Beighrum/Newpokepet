/**
 * Tests for security event integration service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SecurityViolation, ContentType } from '../types/sanitization';
import { securityEventIntegration } from './securityEventIntegration';

// Mock the security event logger
vi.mock('./securityEventLogger', () => ({
  securityEventLogger: {
    logSecurityEventWithContext: vi.fn(),
    logSanitizationAction: vi.fn(),
    checkRateLimit: vi.fn(),
    getSecurityMetrics: vi.fn(),
    getRecentEvents: vi.fn(),
    getDashboardData: vi.fn(),
    logSecurityEvent: vi.fn()
  }
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Browser)'
  }
});

describe('SecurityEventIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Pet Card Sanitization Logging', () => {
    it('should log pet card sanitization with violations', async () => {
      const violations: SecurityViolation[] = [{
        type: 'script_tag',
        originalContent: '<script>alert("xss")</script>',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'critical',
        description: 'Removed dangerous script tag'
      }];

      const originalContent = '<script>alert("xss")</script>Pet Name';
      const sanitizedContent = 'Pet Name';
      const userId = 'user123';
      const processingTime = 25.5;

      await securityEventIntegration.logPetCardSanitization(
        originalContent,
        sanitizedContent,
        violations,
        userId,
        processingTime
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      expect(securityEventLogger.logSecurityEventWithContext).toHaveBeenCalledWith(
        violations,
        expect.objectContaining({
          userId: 'user123',
          endpoint: '/pet-card/sanitize',
          contentType: ContentType.PET_CARD_METADATA,
          originalContent,
          sanitizedContent,
          metadata: { cardType: 'pet_metadata' }
        })
      );

      expect(securityEventLogger.logSanitizationAction).toHaveBeenCalledWith(
        'sanitize',
        expect.any(Object),
        violations,
        25.5,
        'critical'
      );
    });

    it('should log pet card sanitization without violations', async () => {
      const violations: SecurityViolation[] = [];
      const originalContent = 'Clean Pet Name';
      const sanitizedContent = 'Clean Pet Name';
      const userId = 'user123';

      await securityEventIntegration.logPetCardSanitization(
        originalContent,
        sanitizedContent,
        violations,
        userId
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      // Should not log security event for no violations
      expect(securityEventLogger.logSecurityEventWithContext).not.toHaveBeenCalled();

      // Should still log sanitization action for audit trail
      expect(securityEventLogger.logSanitizationAction).toHaveBeenCalledWith(
        'sanitize',
        expect.any(Object),
        violations,
        0,
        'low'
      );
    });
  });

  describe('User Profile Sanitization Logging', () => {
    it('should log user profile sanitization with violations', async () => {
      const violations: SecurityViolation[] = [{
        type: 'dangerous_attribute',
        originalContent: 'onclick="alert(1)"',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'medium',
        description: 'Removed dangerous onclick attribute'
      }];

      const originalContent = '<div onclick="alert(1)">Profile Bio</div>';
      const sanitizedContent = '<div>Profile Bio</div>';
      const userId = 'user456';

      await securityEventIntegration.logUserProfileSanitization(
        originalContent,
        sanitizedContent,
        violations,
        userId,
        15.2
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      expect(securityEventLogger.logSecurityEventWithContext).toHaveBeenCalledWith(
        violations,
        expect.objectContaining({
          userId: 'user456',
          endpoint: '/user/profile/sanitize',
          contentType: ContentType.USER_PROFILE,
          originalContent,
          sanitizedContent,
          metadata: { profileField: 'general' }
        })
      );

      expect(securityEventLogger.logSanitizationAction).toHaveBeenCalledWith(
        'sanitize',
        expect.any(Object),
        violations,
        15.2,
        'medium'
      );
    });
  });

  describe('Comment Sanitization Logging', () => {
    it('should log comment sanitization', async () => {
      const violations: SecurityViolation[] = [{
        type: 'suspicious_pattern',
        originalContent: 'javascript:void(0)',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'high',
        description: 'Removed suspicious javascript URL'
      }];

      const originalContent = '<a href="javascript:void(0)">Click me</a>';
      const sanitizedContent = '<a>Click me</a>';
      const userId = 'user789';

      await securityEventIntegration.logCommentSanitization(
        originalContent,
        sanitizedContent,
        violations,
        userId,
        8.7
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      expect(securityEventLogger.logSecurityEventWithContext).toHaveBeenCalledWith(
        violations,
        expect.objectContaining({
          userId: 'user789',
          endpoint: '/comment/sanitize',
          contentType: ContentType.COMMENT,
          originalContent,
          sanitizedContent,
          metadata: { commentType: 'user_comment' }
        })
      );
    });
  });

  describe('Social Sharing Sanitization Logging', () => {
    it('should log social sharing sanitization', async () => {
      const violations: SecurityViolation[] = [];
      const originalContent = 'Check out my pet!';
      const sanitizedContent = 'Check out my pet!';
      const userId = 'user101';

      await securityEventIntegration.logSocialSharingSanitization(
        originalContent,
        sanitizedContent,
        violations,
        userId,
        5.1
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      expect(securityEventLogger.logSanitizationAction).toHaveBeenCalledWith(
        'sanitize',
        expect.objectContaining({
          endpoint: '/social/share/sanitize',
          contentType: ContentType.SOCIAL_SHARING,
          metadata: { shareType: 'social_media' }
        }),
        violations,
        5.1,
        'low'
      );
    });
  });

  describe('Blocked Content Logging', () => {
    it('should log blocked content event', async () => {
      const violations: SecurityViolation[] = [{
        type: 'script_tag',
        originalContent: '<script>malicious()</script>',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'critical',
        description: 'Blocked malicious script'
      }];

      const content = '<script>malicious()</script>Dangerous content';
      const endpoint = '/api/upload';
      const contentType = ContentType.GENERAL;
      const userId = 'user202';
      const reason = 'Contains malicious script';

      await securityEventIntegration.logBlockedContent(
        content,
        violations,
        endpoint,
        contentType,
        userId,
        reason
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      expect(securityEventLogger.logSecurityEventWithContext).toHaveBeenCalledWith(
        violations,
        expect.objectContaining({
          userId: 'user202',
          endpoint: '/api/upload',
          contentType: ContentType.GENERAL,
          originalContent: content,
          sanitizedContent: undefined,
          metadata: { blockReason: 'Contains malicious script' }
        })
      );

      expect(securityEventLogger.logSanitizationAction).toHaveBeenCalledWith(
        'block',
        expect.any(Object),
        violations,
        0,
        'critical'
      );
    });
  });

  describe('Flagged Content Logging', () => {
    it('should log flagged content event', async () => {
      const violations: SecurityViolation[] = [{
        type: 'suspicious_pattern',
        originalContent: 'eval(userInput)',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'high',
        description: 'Suspicious eval usage detected'
      }];

      const content = 'eval(userInput) in content';
      const endpoint = '/api/comment';
      const contentType = ContentType.COMMENT;
      const userId = 'user303';
      const reason = 'Contains eval function';

      await securityEventIntegration.logFlaggedContent(
        content,
        violations,
        endpoint,
        contentType,
        userId,
        reason
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      expect(securityEventLogger.logSecurityEventWithContext).toHaveBeenCalledWith(
        violations,
        expect.objectContaining({
          userId: 'user303',
          endpoint: '/api/comment',
          contentType: ContentType.COMMENT,
          originalContent: content,
          metadata: { flagReason: 'Contains eval function' }
        })
      );

      expect(securityEventLogger.logSanitizationAction).toHaveBeenCalledWith(
        'flag',
        expect.any(Object),
        violations,
        0,
        'high'
      );
    });
  });

  describe('Rate Limit Checking', () => {
    it('should check user rate limit and return false when not exceeded', async () => {
      const { securityEventLogger } = await import('./securityEventLogger');
      
      vi.mocked(securityEventLogger.checkRateLimit).mockResolvedValue({
        userId: 'user404',
        violationCount: 5,
        timeWindow: 3600000,
        isExceeded: false,
        resetTime: new Date(),
        maxViolations: 10
      });

      const isExceeded = await securityEventIntegration.checkUserRateLimit('user404');

      expect(isExceeded).toBe(false);
      expect(securityEventLogger.checkRateLimit).toHaveBeenCalledWith('user404');
    });

    it('should check user rate limit and return true when exceeded', async () => {
      const { securityEventLogger } = await import('./securityEventLogger');
      
      vi.mocked(securityEventLogger.checkRateLimit).mockResolvedValue({
        userId: 'user505',
        violationCount: 15,
        timeWindow: 3600000,
        isExceeded: true,
        resetTime: new Date(),
        maxViolations: 10
      });

      const isExceeded = await securityEventIntegration.checkUserRateLimit('user505');

      expect(isExceeded).toBe(true);
      expect(securityEventLogger.logSecurityEventWithContext).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'rate_limit_exceeded',
            severity: 'high'
          })
        ]),
        expect.objectContaining({
          userId: 'user505',
          endpoint: '/security/rate-limit',
          contentType: ContentType.GENERAL
        })
      );
    });

    it('should handle rate limit check errors gracefully', async () => {
      const { securityEventLogger } = await import('./securityEventLogger');
      
      vi.mocked(securityEventLogger.checkRateLimit).mockRejectedValue(
        new Error('Database connection failed')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const isExceeded = await securityEventIntegration.checkUserRateLimit('user606');

      expect(isExceeded).toBe(false); // Fail open
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check rate limit:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Session Management', () => {
    it('should create new session ID when none exists', async () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      await securityEventIntegration.logPetCardSanitization(
        'content',
        'content',
        [],
        'user123'
      );

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'security_session_id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });

    it('should reuse existing session ID', async () => {
      const existingSessionId = 'session_123_abc';
      mockSessionStorage.getItem.mockReturnValue(existingSessionId);

      await securityEventIntegration.logPetCardSanitization(
        'content',
        'content',
        [],
        'user123'
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      expect(securityEventLogger.logSanitizationAction).toHaveBeenCalledWith(
        'sanitize',
        expect.objectContaining({
          sessionId: existingSessionId
        }),
        expect.any(Array),
        expect.any(Number),
        expect.any(String)
      );

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Risk Level Calculation', () => {
    it('should calculate correct risk levels', async () => {
      const criticalViolations: SecurityViolation[] = [{
        type: 'script_tag',
        originalContent: '<script>',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'critical'
      }];

      const mediumViolations: SecurityViolation[] = [{
        type: 'dangerous_attribute',
        originalContent: 'onclick="alert(1)"',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'medium'
      }];

      const noViolations: SecurityViolation[] = [];

      await securityEventIntegration.logPetCardSanitization(
        'content',
        'content',
        criticalViolations,
        'user1'
      );

      await securityEventIntegration.logPetCardSanitization(
        'content',
        'content',
        mediumViolations,
        'user2'
      );

      await securityEventIntegration.logPetCardSanitization(
        'content',
        'content',
        noViolations,
        'user3'
      );

      const { securityEventLogger } = await import('./securityEventLogger');

      expect(securityEventLogger.logSanitizationAction).toHaveBeenNthCalledWith(
        1,
        'sanitize',
        expect.any(Object),
        criticalViolations,
        0,
        'critical'
      );

      expect(securityEventLogger.logSanitizationAction).toHaveBeenNthCalledWith(
        2,
        'sanitize',
        expect.any(Object),
        mediumViolations,
        0,
        'medium'
      );

      expect(securityEventLogger.logSanitizationAction).toHaveBeenNthCalledWith(
        3,
        'sanitize',
        expect.any(Object),
        noViolations,
        0,
        'low'
      );
    });
  });

  describe('Initialization', () => {
    it('should initialize security event logging', async () => {
      const { securityEventLogger } = await import('./securityEventLogger');

      await securityEventIntegration.initialize();

      expect(securityEventLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/app/startup',
          severity: 'info',
          contentType: ContentType.GENERAL,
          violations: [],
          metadata: expect.objectContaining({
            appVersion: expect.any(String),
            environment: expect.any(String)
          })
        })
      );
    });

    it('should handle initialization errors gracefully', async () => {
      const { securityEventLogger } = await import('./securityEventLogger');
      
      vi.mocked(securityEventLogger.logSecurityEvent).mockRejectedValue(
        new Error('Initialization failed')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(securityEventIntegration.initialize()).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize security event logging:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Metrics and Dashboard', () => {
    it('should get security metrics', async () => {
      const { securityEventLogger } = await import('./securityEventLogger');
      
      const mockMetrics = {
        totalSanitizations: 100,
        violationsBlocked: 25,
        averageProcessingTime: 45
      };

      vi.mocked(securityEventLogger.getSecurityMetrics).mockResolvedValue(mockMetrics as any);

      const timeWindow = { start: new Date(), end: new Date() };
      const metrics = await securityEventIntegration.getSecurityMetrics(timeWindow);

      expect(metrics).toEqual(mockMetrics);
      expect(securityEventLogger.getSecurityMetrics).toHaveBeenCalledWith(timeWindow);
    });

    it('should get recent security events', async () => {
      const { securityEventLogger } = await import('./securityEventLogger');
      
      const mockEvents = [
        { id: 'event1', severity: 'critical' },
        { id: 'event2', severity: 'warning' }
      ];

      vi.mocked(securityEventLogger.getRecentEvents).mockResolvedValue(mockEvents as any);

      const events = await securityEventIntegration.getRecentSecurityEvents(10, 'critical');

      expect(events).toEqual(mockEvents);
      expect(securityEventLogger.getRecentEvents).toHaveBeenCalledWith(10, 'critical');
    });

    it('should get dashboard data', async () => {
      const { securityEventLogger } = await import('./securityEventLogger');
      
      const mockDashboard = {
        metrics: { totalSanitizations: 100 },
        recentEvents: [],
        topViolators: [],
        systemHealth: { status: 'healthy' },
        alerts: []
      };

      vi.mocked(securityEventLogger.getDashboardData).mockResolvedValue(mockDashboard as any);

      const dashboard = await securityEventIntegration.getDashboardData();

      expect(dashboard).toEqual(mockDashboard);
      expect(securityEventLogger.getDashboardData).toHaveBeenCalled();
    });
  });
});