/**
 * Tests for security event logging service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityViolation, ContentType } from '../types/sanitization';
import { SecurityEventContext } from '../types/security-logging';

// Mock Firebase objects for tests
const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

const mockFirestore = {
  collection: mockCollection,
  addDoc: mockAddDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  getDocs: mockGetDocs,
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date }))
  }
};

// Mock Firebase functions
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
  collection: mockCollection,
  addDoc: mockAddDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  getDocs: mockGetDocs,
  Timestamp: mockFirestore.Timestamp
}));

describe('SecurityEventLogger', () => {
  let securityEventLogger: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockCollection.mockReturnValue({ name: 'test-collection' });
    mockAddDoc.mockResolvedValue({ id: 'test-id' });
    mockGetDocs.mockResolvedValue({ docs: [], size: 0 });
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockOrderBy.mockReturnValue({});
    mockLimit.mockReturnValue({});
    
    // Import the logger after mocking Firebase
    const { securityEventLogger: logger } = await import('./securityEventLogger');
    securityEventLogger = logger;
  });

  describe('basic functionality', () => {
    it('should handle Firebase unavailable gracefully', async () => {
      // Create logger without Firebase
      const loggerWithoutFirebase = new (securityEventLogger.constructor as any)();
      (loggerWithoutFirebase as any).db = null;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const event = {
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/test',
        violations: [],
        severity: 'info' as const,
        contentType: ContentType.GENERAL
      };

      await expect(loggerWithoutFirebase.logSecurityEvent(event)).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Firebase not available, logging to console:',
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return default metrics when Firebase unavailable', async () => {
      const loggerWithoutFirebase = new (securityEventLogger.constructor as any)();
      (loggerWithoutFirebase as any).db = null;

      const metrics = await loggerWithoutFirebase.getSecurityMetrics();

      expect(metrics).toEqual({
        totalSanitizations: 0,
        violationsBlocked: 0,
        averageProcessingTime: 0,
        topViolationTypes: {},
        suspiciousUsers: [],
        performanceImpact: 0,
        timeWindow: expect.any(Object),
        riskLevelDistribution: {}
      });
    });

    it('should return default rate limit info when Firebase unavailable', async () => {
      const loggerWithoutFirebase = new (securityEventLogger.constructor as any)();
      (loggerWithoutFirebase as any).db = null;

      const rateLimitInfo = await loggerWithoutFirebase.checkRateLimit('user123');

      expect(rateLimitInfo).toEqual({
        userId: 'user123',
        violationCount: 0,
        timeWindow: 3600000,
        isExceeded: false,
        resetTime: expect.any(Date),
        maxViolations: 10
      });
    });
  });

  describe('createAuditLog', () => {
    it('should create audit log entry', async () => {
      const audit = {
        userId: 'user123',
        action: 'sanitize' as const,
        contentType: ContentType.PET_CARD_METADATA,
        originalContent: '<script>alert("test")</script>Pet Name',
        sanitizedContent: 'Pet Name',
        violations: [{
          type: 'script_tag' as const,
          originalContent: '<script>alert("test")</script>',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical' as const
        }],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/pet-card',
        processingTime: 15.5,
        riskLevel: 'critical' as const
      };

      await securityEventLogger.createAuditLog(audit);

      expect(mockAddDoc).toHaveBeenCalledWith(
        { name: 'test-collection' },
        expect.objectContaining({
          userId: 'user123',
          action: 'sanitize',
          contentType: 'pet_card_metadata',
          riskLevel: 'critical',
          processingTime: 15.5
        })
      );
    });
  });

  describe('checkRateLimit', () => {
    it('should return rate limit info for user', async () => {
      mockGetDocs.mockResolvedValue({
        size: 5,
        docs: []
      });

      const rateLimitInfo = await securityEventLogger.checkRateLimit('user123');

      expect(rateLimitInfo).toEqual({
        userId: 'user123',
        violationCount: 5,
        timeWindow: 3600000,
        isExceeded: false,
        resetTime: expect.any(Date),
        maxViolations: 10
      });
    });

    it('should detect rate limit exceeded', async () => {
      mockGetDocs.mockResolvedValue({
        size: 15, // Exceeds default limit of 10
        docs: []
      });

      const rateLimitInfo = await securityEventLogger.checkRateLimit('user123');

      expect(rateLimitInfo.isExceeded).toBe(true);
      expect(rateLimitInfo.violationCount).toBe(15);
    });

    it('should handle Firebase errors in rate limit check', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firebase error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const rateLimitInfo = await securityEventLogger.checkRateLimit('user123');

      expect(rateLimitInfo).toEqual({
        userId: 'user123',
        violationCount: 0,
        timeWindow: 3600000,
        isExceeded: false,
        resetTime: expect.any(Date),
        maxViolations: 10
      });

      consoleSpy.mockRestore();
    });
  });

  describe('getSecurityMetrics', () => {
    it('should calculate security metrics from events and audits', async () => {
      const mockEvents = [
        {
          id: 'event1',
          violations: [
            { type: 'script_tag', severity: 'critical' },
            { type: 'dangerous_attribute', severity: 'medium' }
          ],
          userId: 'user1'
        },
        {
          id: 'event2',
          violations: [
            { type: 'script_tag', severity: 'high' }
          ],
          userId: 'user2'
        }
      ];

      const mockAudits = [
        {
          id: 'audit1',
          processingTime: 50,
          riskLevel: 'critical'
        },
        {
          id: 'audit2',
          processingTime: 30,
          riskLevel: 'low'
        }
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockEvents.map(event => ({ id: event.id, data: () => event }))
        })
        .mockResolvedValueOnce({
          docs: mockAudits.map(audit => ({ id: audit.id, data: () => audit }))
        });

      const metrics = await securityEventLogger.getSecurityMetrics();

      expect(metrics).toEqual({
        totalSanitizations: 2,
        violationsBlocked: 3,
        averageProcessingTime: 40,
        topViolationTypes: {
          script_tag: 2,
          dangerous_attribute: 1
        },
        suspiciousUsers: [],
        performanceImpact: 0,
        timeWindow: expect.any(Object),
        riskLevelDistribution: {
          critical: 1,
          low: 1
        }
      });
    });

    it('should use cached metrics when available', async () => {
      // Set up cache
      const cachedMetrics = {
        totalSanitizations: 100,
        violationsBlocked: 50,
        averageProcessingTime: 25,
        topViolationTypes: {},
        suspiciousUsers: [],
        performanceImpact: 0,
        timeWindow: { start: new Date(), end: new Date() },
        riskLevelDistribution: {}
      };

      (securityEventLogger as any).metricsCache = cachedMetrics;
      (securityEventLogger as any).metricsCacheExpiry = Date.now() + 10000; // Future expiry

      const metrics = await securityEventLogger.getSecurityMetrics();

      expect(metrics).toEqual(cachedMetrics);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });
  });

  describe('logSecurityEventWithContext', () => {
    it('should log security event with context', async () => {
      const violations: SecurityViolation[] = [{
        type: 'script_tag',
        originalContent: '<script>alert("xss")</script>',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'critical',
        description: 'Removed dangerous script tag'
      }];

      const context: SecurityEventContext = {
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/test',
        contentType: ContentType.USER_PROFILE,
        originalContent: '<script>alert("xss")</script>Hello',
        sanitizedContent: 'Hello'
      };

      await securityEventLogger.logSecurityEventWithContext(violations, context);

      expect(mockAddDoc).toHaveBeenCalledWith(
        { name: 'test-collection' },
        expect.objectContaining({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          endpoint: '/api/test',
          severity: 'critical',
          contentType: 'user_profile',
          originalContent: '<script>alert("xss")</script>Hello',
          sanitizedContent: 'Hello'
        })
      );
    });
  });

  describe('logSanitizationAction', () => {
    it('should log sanitization action for audit trail', async () => {
      const context: SecurityEventContext = {
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/sanitize',
        contentType: ContentType.COMMENT,
        originalContent: 'Original content',
        sanitizedContent: 'Sanitized content'
      };

      const violations: SecurityViolation[] = [{
        type: 'dangerous_attribute',
        originalContent: 'onclick="alert(1)"',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'medium'
      }];

      await securityEventLogger.logSanitizationAction(
        'sanitize',
        context,
        violations,
        25.5,
        'medium'
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        { name: 'test-collection' },
        expect.objectContaining({
          userId: 'user123',
          action: 'sanitize',
          contentType: 'comment',
          processingTime: 25.5,
          riskLevel: 'medium'
        })
      );
    });
  });

  describe('getDashboardData', () => {
    it('should return comprehensive dashboard data', async () => {
      // Mock metrics
      const mockEvents = [
        {
          id: 'event1',
          violations: [{ type: 'script_tag' }],
          timestamp: mockFirestore.Timestamp.now(),
          userId: 'user1'
        }
      ];

      const mockAudits = [
        {
          id: 'audit1',
          processingTime: 45
        }
      ];

      // Mock Firestore calls for metrics
      mockGetDocs
        .mockResolvedValueOnce({
          docs: mockEvents.map(event => ({ id: event.id, data: () => event }))
        })
        .mockResolvedValueOnce({
          docs: mockAudits.map(audit => ({ id: audit.id, data: () => audit }))
        })
        // Mock for recent events
        .mockResolvedValueOnce({
          docs: mockEvents.map(event => ({
            id: event.id,
            data: () => ({ ...event, timestamp: mockFirestore.Timestamp.now() })
          }))
        })
        // Mock for top violators
        .mockResolvedValueOnce({
          docs: mockEvents.map(event => ({
            id: event.id,
            data: () => ({ ...event, timestamp: mockFirestore.Timestamp.now() })
          }))
        });

      const dashboardData = await securityEventLogger.getDashboardData();

      expect(dashboardData).toHaveProperty('metrics');
      expect(dashboardData).toHaveProperty('recentEvents');
      expect(dashboardData).toHaveProperty('topViolators');
      expect(dashboardData).toHaveProperty('systemHealth');
      expect(dashboardData).toHaveProperty('alerts');

      expect(dashboardData.systemHealth.sanitizationServiceStatus).toBe('healthy');
      expect(Array.isArray(dashboardData.alerts)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle Firebase unavailable gracefully', async () => {
      // Create logger without Firebase
      const loggerWithoutFirebase = new (securityEventLogger.constructor as any)();
      (loggerWithoutFirebase as any).db = null;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(loggerWithoutFirebase.logSecurityEvent({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/test',
        violations: [],
        severity: 'info',
        contentType: ContentType.GENERAL
      })).resolves.not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Firebase not available, logging to console:',
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('severity calculation', () => {
    it('should calculate correct severity from violations', () => {
      const criticalViolations: SecurityViolation[] = [{
        type: 'script_tag',
        originalContent: '<script>alert("xss")</script>',
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'critical'
      }];

      const severity = (securityEventLogger as any).calculateSeverity(criticalViolations);
      expect(severity).toBe('critical');
    });

    it('should return info for no violations', () => {
      const severity = (securityEventLogger as any).calculateSeverity([]);
      expect(severity).toBe('info');
    });
  });
});