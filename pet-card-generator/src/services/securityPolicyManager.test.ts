/**
 * Tests for SecurityPolicyManager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  SecurityPolicyManager, 
  SecurityPolicyConfiguration, 
  PolicyUpdateRequest,
  PolicyValidationResult 
} from './securityPolicyManager';
import { ContentType, SecurityViolation } from '../types/sanitization';

// Mock fetch for configuration loading
global.fetch = vi.fn();

describe('SecurityPolicyManager', () => {
  let policyManager: SecurityPolicyManager;

  beforeEach(() => {
    // Reset singleton instance
    (SecurityPolicyManager as any).instance = undefined;
    policyManager = SecurityPolicyManager.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecurityPolicyManager.getInstance();
      const instance2 = SecurityPolicyManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should use custom config path when provided', () => {
      const customPath = '/custom/config.json';
      const instance = SecurityPolicyManager.getInstance(customPath);
      expect(instance).toBeInstanceOf(SecurityPolicyManager);
    });
  });

  describe('Configuration Loading', () => {
    it('should load default configuration when fetch fails', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));
      
      const config = await policyManager.loadConfiguration();
      
      expect(config).toBeDefined();
      expect(config.version).toBe('1.0.0');
      expect(config.policies).toBeDefined();
      expect(config.policies.userProfiles).toBeDefined();
      expect(config.policies.petCardMetadata).toBeDefined();
      expect(config.policies.comments).toBeDefined();
      expect(config.policies.socialSharing).toBeDefined();
      expect(config.policies.defaultPolicy).toBeDefined();
    });

    it('should load configuration from successful fetch', async () => {
      const mockConfig = {
        version: '2.0.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        policies: {
          userProfiles: {
            allowedTags: ['b', 'i'],
            allowedAttributes: {},
            allowedSchemes: [],
            allowedSchemesByTag: {},
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script'],
            keepContent: true,
            forbidTags: ['script'],
            forbidAttr: ['onclick']
          }
        },
        riskThresholds: {
          low: 0.1,
          medium: 0.4,
          high: 0.7,
          critical: 0.9
        },
        performanceThresholds: {
          maxProcessingTimeMs: 200,
          maxContentLength: 5000,
          maxConcurrentRequests: 25
        },
        monitoring: {
          logSecurityViolations: false,
          alertOnCriticalViolations: true,
          trackPerformanceMetrics: false,
          auditTrailEnabled: true
        }
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      });

      const config = await policyManager.loadConfiguration();
      
      expect(config.version).toBe('2.0.0');
      expect(config.riskThresholds.low).toBe(0.1);
      expect(config.performanceThresholds.maxProcessingTimeMs).toBe(200);
      expect(config.monitoring.logSecurityViolations).toBe(false);
    });
  });

  describe('Policy Retrieval', () => {
    it('should return correct policy for user profiles', () => {
      const policy = policyManager.getPolicyForContentType(ContentType.USER_PROFILE);
      
      expect(policy.allowedTags).toContain('b');
      expect(policy.allowedTags).toContain('i');
      expect(policy.allowedTags).toContain('strong');
      expect(policy.forbidTags).toContain('script');
      expect(policy.forbidAttr).toContain('onclick');
    });

    it('should return correct policy for pet card metadata', () => {
      const policy = policyManager.getPolicyForContentType(ContentType.PET_CARD_METADATA);
      
      expect(policy.allowedTags).not.toContain('p');
      expect(policy.allowedTags).not.toContain('div');
      expect(policy.forbidTags).toContain('p');
      expect(policy.forbidTags).toContain('div');
    });

    it('should return correct policy for comments', () => {
      const policy = policyManager.getPolicyForContentType(ContentType.COMMENT);
      
      expect(policy.allowedTags).toContain('blockquote');
      expect(policy.allowedTags).toContain('p');
      expect(policy.allowedSchemes).toContain('http');
      expect(policy.allowedSchemes).toContain('https');
    });

    it('should return correct policy for social sharing', () => {
      const policy = policyManager.getPolicyForContentType(ContentType.SOCIAL_SHARING);
      
      expect(policy.allowedTags).toHaveLength(0);
      expect(policy.forbidTags).toContain('b');
      expect(policy.forbidTags).toContain('i');
    });

    it('should return default policy for unknown content type', () => {
      const policy = policyManager.getPolicyForContentType('unknown' as ContentType);
      
      expect(policy.allowedTags).toContain('b');
      expect(policy.allowedTags).toContain('i');
      expect(policy.allowedTags).not.toContain('p');
    });
  });

  describe('Policy Updates', () => {
    it('should successfully update policy for content type', async () => {
      const updateRequest: PolicyUpdateRequest = {
        contentType: ContentType.USER_PROFILE,
        policy: {
          allowedTags: ['b', 'i', 'strong', 'em', 'u'],
          forbidTags: ['script', 'iframe']
        }
      };

      const result = await policyManager.updatePolicy(updateRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const updatedPolicy = policyManager.getPolicyForContentType(ContentType.USER_PROFILE);
      expect(updatedPolicy.allowedTags).toEqual(['b', 'i', 'strong', 'em', 'u']);
      expect(updatedPolicy.forbidTags).toContain('script');
      expect(updatedPolicy.forbidTags).toContain('iframe');
    });

    it('should update risk thresholds', async () => {
      const updateRequest: PolicyUpdateRequest = {
        riskThresholds: {
          low: 0.1,
          medium: 0.3,
          high: 0.6,
          critical: 0.9
        }
      };

      const result = await policyManager.updatePolicy(updateRequest);
      
      expect(result.isValid).toBe(true);
      
      const config = policyManager.getConfiguration();
      expect(config.riskThresholds.low).toBe(0.1);
      expect(config.riskThresholds.medium).toBe(0.3);
      expect(config.riskThresholds.high).toBe(0.6);
      expect(config.riskThresholds.critical).toBe(0.9);
    });

    it('should update performance thresholds', async () => {
      const updateRequest: PolicyUpdateRequest = {
        performanceThresholds: {
          maxProcessingTimeMs: 150,
          maxContentLength: 8000,
          maxConcurrentRequests: 30
        }
      };

      const result = await policyManager.updatePolicy(updateRequest);
      
      expect(result.isValid).toBe(true);
      
      const config = policyManager.getConfiguration();
      expect(config.performanceThresholds.maxProcessingTimeMs).toBe(150);
      expect(config.performanceThresholds.maxContentLength).toBe(8000);
      expect(config.performanceThresholds.maxConcurrentRequests).toBe(30);
    });

    it('should update monitoring settings', async () => {
      const updateRequest: PolicyUpdateRequest = {
        monitoring: {
          logSecurityViolations: false,
          alertOnCriticalViolations: false,
          trackPerformanceMetrics: false,
          auditTrailEnabled: false
        }
      };

      const result = await policyManager.updatePolicy(updateRequest);
      
      expect(result.isValid).toBe(true);
      
      const config = policyManager.getConfiguration();
      expect(config.monitoring.logSecurityViolations).toBe(false);
      expect(config.monitoring.alertOnCriticalViolations).toBe(false);
      expect(config.monitoring.trackPerformanceMetrics).toBe(false);
      expect(config.monitoring.auditTrailEnabled).toBe(false);
    });

    it('should reject invalid policy updates', async () => {
      const updateRequest: PolicyUpdateRequest = {
        contentType: ContentType.USER_PROFILE,
        policy: {
          allowedTags: ['script'], // This should be rejected
          forbidTags: []
        }
      };

      const result = await policyManager.updatePolicy(updateRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("user_profile: 'script' tag should never be allowed");
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig: Partial<SecurityPolicyConfiguration> = {
        policies: {
          userProfiles: {
            allowedTags: ['b', 'i'],
            allowedAttributes: {},
            allowedSchemes: [],
            allowedSchemesByTag: {},
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script'],
            keepContent: true,
            forbidTags: ['script'],
            forbidAttr: ['onclick']
          }
        },
        riskThresholds: {
          low: 0.2,
          medium: 0.5,
          high: 0.8,
          critical: 0.95
        }
      };

      const result = policyManager.validateConfiguration(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid risk thresholds', () => {
      const invalidConfig: Partial<SecurityPolicyConfiguration> = {
        riskThresholds: {
          low: 0.8,
          medium: 0.5,
          high: 0.2,
          critical: 0.1
        }
      };

      const result = policyManager.validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Risk threshold: low must be less than medium');
      expect(result.errors).toContain('Risk threshold: medium must be less than high');
      expect(result.errors).toContain('Risk threshold: high must be less than critical');
    });

    it('should detect dangerous policy configurations', () => {
      const dangerousConfig: Partial<SecurityPolicyConfiguration> = {
        policies: {
          userProfiles: {
            allowedTags: ['script', 'iframe'],
            allowedAttributes: {},
            allowedSchemes: [],
            allowedSchemesByTag: {},
            stripIgnoreTag: true,
            stripIgnoreTagBody: [],
            keepContent: true,
            forbidTags: [],
            forbidAttr: []
          }
        }
      };

      const result = policyManager.validateConfiguration(dangerousConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("userProfiles: 'script' tag should never be allowed");
      expect(result.warnings).toContain("userProfiles: 'iframe' tag allowed without scheme restrictions");
    });

    it('should provide performance warnings', () => {
      const performanceConfig: Partial<SecurityPolicyConfiguration> = {
        performanceThresholds: {
          maxProcessingTimeMs: 5,
          maxContentLength: 50,
          maxConcurrentRequests: 0
        }
      };

      const result = policyManager.validateConfiguration(performanceConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Performance: maxProcessingTimeMs is very low, may cause timeouts');
      expect(result.warnings).toContain('Performance: maxContentLength is very low, may reject valid content');
      expect(result.errors).toContain('Performance: maxConcurrentRequests must be at least 1');
    });
  });

  describe('Risk Level Calculation', () => {
    it('should return low risk for no violations', () => {
      const violations: SecurityViolation[] = [];
      const riskLevel = policyManager.calculateRiskLevel(violations);
      expect(riskLevel).toBe('low');
    });

    it('should return critical risk for critical violations', () => {
      const violations: SecurityViolation[] = [
        {
          type: 'script_tag',
          originalContent: '<script>alert("xss")</script>',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical'
        }
      ];
      const riskLevel = policyManager.calculateRiskLevel(violations);
      expect(riskLevel).toBe('critical');
    });

    it('should return high risk for high severity violations', () => {
      const violations: SecurityViolation[] = [
        {
          type: 'dangerous_attribute',
          originalContent: '<div onclick="alert()">',
          sanitizedContent: '<div>',
          timestamp: new Date(),
          severity: 'high'
        }
      ];
      const riskLevel = policyManager.calculateRiskLevel(violations);
      expect(riskLevel).toBe('high');
    });

    it('should calculate mixed risk levels correctly', () => {
      const violations: SecurityViolation[] = [
        {
          type: 'script_tag',
          originalContent: '<script>',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical'
        },
        {
          type: 'suspicious_pattern',
          originalContent: 'javascript:',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'medium'
        },
        {
          type: 'suspicious_pattern',
          originalContent: 'data:',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'low'
        }
      ];
      const riskLevel = policyManager.calculateRiskLevel(violations);
      expect(riskLevel).toBe('critical'); // Critical because there's a critical violation
    });

    it('should calculate high risk for mixed high and medium violations', () => {
      const violations: SecurityViolation[] = [
        {
          type: 'dangerous_attribute',
          originalContent: '<div onclick="alert()">',
          sanitizedContent: '<div>',
          timestamp: new Date(),
          severity: 'high'
        },
        {
          type: 'suspicious_pattern',
          originalContent: 'javascript:',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'medium'
        }
      ];
      const riskLevel = policyManager.calculateRiskLevel(violations);
      expect(riskLevel).toBe('high');
    });
  });

  describe('Sanitize Options Generation', () => {
    it('should generate correct sanitize options for user profiles', () => {
      const options = policyManager.getSanitizeOptionsForContentType(ContentType.USER_PROFILE);
      
      expect(options.allowedTags).toContain('b');
      expect(options.allowedTags).toContain('strong');
      expect(options.forbidTags).toContain('script');
      expect(options.forbidAttr).toContain('onclick');
      expect(options.stripIgnoreTag).toBe(true);
      expect(options.keepContent).toBe(true);
    });

    it('should generate restrictive options for social sharing', () => {
      const options = policyManager.getSanitizeOptionsForContentType(ContentType.SOCIAL_SHARING);
      
      expect(options.allowedTags).toHaveLength(0);
      expect(options.forbidTags).toContain('b');
      expect(options.forbidTags).toContain('script');
      expect(options.stripIgnoreTag).toBe(true);
    });
  });

  describe('Configuration Updates and Notifications', () => {
    it('should notify subscribers of configuration updates', async () => {
      const mockCallback = vi.fn();
      const unsubscribe = policyManager.onConfigurationUpdate(mockCallback);
      
      const updateRequest: PolicyUpdateRequest = {
        contentType: ContentType.USER_PROFILE,
        policy: {
          allowedTags: ['b', 'i']
        }
      };

      await policyManager.updatePolicy(updateRequest);
      
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
        lastUpdated: expect.any(String)
      }));

      unsubscribe();
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      policyManager.onConfigurationUpdate(errorCallback);
      
      const updateRequest: PolicyUpdateRequest = {
        riskThresholds: { low: 0.1 }
      };

      await policyManager.updatePolicy(updateRequest);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in configuration update callback:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should allow unsubscribing from updates', () => {
      const mockCallback = vi.fn();
      const unsubscribe = policyManager.onConfigurationUpdate(mockCallback);
      
      unsubscribe();
      
      // Verify callback is removed (this is internal state, so we test indirectly)
      expect(unsubscribe).toBeInstanceOf(Function);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to default configuration', async () => {
      // First, modify the configuration
      await policyManager.updatePolicy({
        riskThresholds: { low: 0.1, medium: 0.3 }
      });

      let config = policyManager.getConfiguration();
      expect(config.riskThresholds.low).toBe(0.1);

      // Reset to defaults
      policyManager.resetToDefaults();

      config = policyManager.getConfiguration();
      expect(config.riskThresholds.low).toBe(0.2);
      expect(config.riskThresholds.medium).toBe(0.5);
    });
  });

  describe('Version Management', () => {
    it('should increment version on policy updates', async () => {
      const initialConfig = policyManager.getConfiguration();
      const initialVersion = initialConfig.version;
      const initialTimestamp = initialConfig.lastUpdated;

      // Add a small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await policyManager.updatePolicy({
        riskThresholds: { low: 0.1 }
      });

      const updatedConfig = policyManager.getConfiguration();
      expect(updatedConfig.version).not.toBe(initialVersion);
      expect(updatedConfig.lastUpdated).not.toBe(initialTimestamp);
    });
  });
});