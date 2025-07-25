/**
 * Tests for SecurityPolicyTester
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  SecurityPolicyTester,
  XSSTestCase,
  SecurityTestResult,
  PerformanceBenchmark,
  SecurityTestSuiteResult
} from './securityPolicyTester';
import { SecurityPolicyManager } from './securityPolicyManager';
import { ContentType } from '../types/sanitization';

// Mock the sanitization service
const mockSanitizationService = {
  sanitizeHTML: vi.fn()
};

vi.mock('./sanitization', () => ({
  sanitizationService: mockSanitizationService
}));

// Mock the security policy manager
const mockPolicyManagerInstance = {
  validateConfiguration: vi.fn(),
  updatePolicy: vi.fn(),
  resetToDefaults: vi.fn(),
  loadConfiguration: vi.fn(),
  getConfiguration: vi.fn()
};

vi.mock('./securityPolicyManager', () => ({
  SecurityPolicyManager: {
    getInstance: vi.fn(() => mockPolicyManagerInstance)
  }
}));

describe('SecurityPolicyTester', () => {
  let policyTester: SecurityPolicyTester;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    policyTester = new SecurityPolicyTester(mockPolicyManagerInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('XSS Test Cases', () => {
    it('should generate comprehensive XSS test cases', () => {
      // Access private method through type assertion
      const testCases = (policyTester as any).generateXSSTestCases();
      
      expect(testCases).toBeInstanceOf(Array);
      expect(testCases.length).toBeGreaterThan(10);
      
      // Check for different categories
      const categories = new Set(testCases.map((tc: XSSTestCase) => tc.category));
      expect(categories.has('script_injection')).toBe(true);
      expect(categories.has('attribute_injection')).toBe(true);
      expect(categories.has('url_injection')).toBe(true);
      
      // Check for different severity levels
      const severities = new Set(testCases.map((tc: XSSTestCase) => tc.severity));
      expect(severities.has('critical')).toBe(true);
      expect(severities.has('high')).toBe(true);
      expect(severities.has('medium')).toBe(true);
      expect(severities.has('low')).toBe(true);
    });

    it('should include critical script injection tests', () => {
      const testCases = (policyTester as any).generateXSSTestCases();
      const scriptTests = testCases.filter((tc: XSSTestCase) => 
        tc.category === 'script_injection' && tc.severity === 'critical'
      );
      
      expect(scriptTests.length).toBeGreaterThan(0);
      expect(scriptTests.some((tc: XSSTestCase) => tc.payload.includes('<script>'))).toBe(true);
    });

    it('should include event handler injection tests', () => {
      const testCases = (policyTester as any).generateXSSTestCases();
      const eventTests = testCases.filter((tc: XSSTestCase) => 
        tc.category === 'attribute_injection'
      );
      
      expect(eventTests.length).toBeGreaterThan(0);
      expect(eventTests.some((tc: XSSTestCase) => tc.payload.includes('onclick'))).toBe(true);
      expect(eventTests.some((tc: XSSTestCase) => tc.payload.includes('onload'))).toBe(true);
    });

    it('should include URL-based attack tests', () => {
      const testCases = (policyTester as any).generateXSSTestCases();
      const urlTests = testCases.filter((tc: XSSTestCase) => 
        tc.category === 'url_injection'
      );
      
      expect(urlTests.length).toBeGreaterThan(0);
      expect(urlTests.some((tc: XSSTestCase) => tc.payload.includes('javascript:'))).toBe(true);
      expect(urlTests.some((tc: XSSTestCase) => tc.payload.includes('data:'))).toBe(true);
    });

    it('should include safe content tests', () => {
      const testCases = (policyTester as any).generateXSSTestCases();
      const safeTests = testCases.filter((tc: XSSTestCase) => !tc.expectedBlocked);
      
      expect(safeTests.length).toBeGreaterThan(0);
      expect(safeTests.some((tc: XSSTestCase) => tc.payload.includes('<strong>'))).toBe(true);
    });
  });

  describe('Individual XSS Tests', () => {
    it('should correctly identify blocked attacks', async () => {
      const testCase: XSSTestCase = {
        name: 'Test Script',
        payload: '<script>alert("xss")</script>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'script_injection',
        description: 'Test script injection'
      };

      mockSanitizationService.sanitizeHTML.mockResolvedValue({
        sanitizedContent: '',
        originalContent: testCase.payload,
        removedElements: ['script'],
        securityViolations: [{
          type: 'script_tag',
          originalContent: testCase.payload,
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical'
        }],
        processingTime: 5,
        isValid: false
      });

      const result = await policyTester.runXSSTest(testCase, ContentType.USER_PROFILE);
      
      expect(result.passed).toBe(true);
      expect(result.testCase).toBe(testCase);
      expect(result.contentType).toBe(ContentType.USER_PROFILE);
      expect(result.actualViolations).toContain('script_tag');
    });

    it('should correctly identify safe content', async () => {
      const testCase: XSSTestCase = {
        name: 'Safe HTML',
        payload: '<p><strong>Bold text</strong></p>',
        expectedBlocked: false,
        severity: 'low',
        category: 'script_injection',
        description: 'Safe HTML content'
      };

      mockSanitizationService.sanitizeHTML.mockResolvedValue({
        sanitizedContent: '<p><strong>Bold text</strong></p>',
        originalContent: testCase.payload,
        removedElements: [],
        securityViolations: [],
        processingTime: 2,
        isValid: true
      });

      const result = await policyTester.runXSSTest(testCase, ContentType.USER_PROFILE);
      
      expect(result.passed).toBe(true);
      expect(result.sanitizedResult.isValid).toBe(true);
      expect(result.actualViolations).toHaveLength(0);
    });

    it('should handle sanitization errors gracefully', async () => {
      const testCase: XSSTestCase = {
        name: 'Error Test',
        payload: '<script>alert("xss")</script>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'script_injection',
        description: 'Test error handling'
      };

      mockSanitizationService.sanitizeHTML.mockRejectedValue(new Error('Sanitization failed'));

      const result = await policyTester.runXSSTest(testCase, ContentType.USER_PROFILE);
      
      expect(result.passed).toBe(false);
      expect(result.sanitizedResult.isValid).toBe(false);
      expect(result.sanitizedResult.securityViolations).toHaveLength(1);
      expect(result.sanitizedResult.securityViolations[0].severity).toBe('critical');
    });
  });

  describe('Performance Benchmarking', () => {
    it('should run performance benchmarks', async () => {
      mockSanitizationService.sanitizeHTML.mockResolvedValue({
        sanitizedContent: 'test content',
        originalContent: 'test content',
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      });

      const benchmark = await policyTester.runPerformanceBenchmark(ContentType.USER_PROFILE);
      
      expect(benchmark.contentType).toBe(ContentType.USER_PROFILE);
      expect(benchmark.processingTime).toBeGreaterThan(0);
      expect(benchmark.throughput).toBeGreaterThan(0);
      expect(benchmark.contentSize).toBeGreaterThan(0);
      expect(typeof benchmark.violationsDetected).toBe('number');
    });

    it('should test multiple content sizes', async () => {
      let callCount = 0;
      mockSanitizationService.sanitizeHTML.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          sanitizedContent: 'test content',
          originalContent: 'test content',
          removedElements: [],
          securityViolations: [],
          processingTime: 5 + Math.random() * 10,
          isValid: true
        });
      });

      const benchmark = await policyTester.runPerformanceBenchmark(ContentType.USER_PROFILE);
      
      // Should test multiple sizes with multiple iterations
      expect(callCount).toBeGreaterThan(10);
      expect(benchmark.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Policy Configuration Testing', () => {
    it('should test policy configuration validation', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: ['Test warning'],
        recommendations: ['Test recommendation']
      };

      mockPolicyManager.validateConfiguration.mockReturnValue(mockValidation);

      const config = {
        riskThresholds: {
          low: 0.1,
          medium: 0.5,
          high: 0.8,
          critical: 0.95
        }
      };

      const result = await policyTester.testPolicyConfiguration(config);
      
      expect(result).toBe(mockValidation);
      expect(mockPolicyManager.validateConfiguration).toHaveBeenCalledWith(config);
    });

    it('should benchmark multiple policy configurations', async () => {
      mockPolicyManager.updatePolicy.mockResolvedValue({ isValid: true, errors: [], warnings: [], recommendations: [] });
      mockPolicyManager.validateConfiguration.mockReturnValue({ isValid: true, errors: [], warnings: [], recommendations: [] });
      mockPolicyManager.getConfiguration.mockReturnValue({ policies: {}, riskThresholds: {}, performanceThresholds: {}, monitoring: {} });
      mockSanitizationService.sanitizeHTML.mockResolvedValue({
        sanitizedContent: 'test',
        originalContent: 'test',
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      });

      const configs = [
        {
          name: 'Strict Policy',
          config: {
            riskThresholds: { low: 0.1, medium: 0.3, high: 0.6, critical: 0.9 }
          }
        },
        {
          name: 'Lenient Policy',
          config: {
            riskThresholds: { low: 0.3, medium: 0.6, high: 0.8, critical: 0.95 }
          }
        }
      ];

      const results = await policyTester.benchmarkPolicyConfigurations(configs);
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Strict Policy');
      expect(results[1].name).toBe('Lenient Policy');
      expect(results[0].benchmark).toBeDefined();
      expect(results[0].validation).toBeDefined();
    });
  });

  describe('Comprehensive Test Suite', () => {
    it('should run complete security test suite', async () => {
      // Mock policy validation
      mockPolicyManager.validateConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        recommendations: []
      });

      // Mock sanitization results
      mockSanitizationService.sanitizeHTML.mockImplementation((payload: string) => {
        const isScript = payload.includes('<script>');
        return Promise.resolve({
          sanitizedContent: isScript ? '' : payload,
          originalContent: payload,
          removedElements: isScript ? ['script'] : [],
          securityViolations: isScript ? [{
            type: 'script_tag',
            originalContent: payload,
            sanitizedContent: '',
            timestamp: new Date(),
            severity: 'critical'
          }] : [],
          processingTime: Math.random() * 20,
          isValid: !isScript
        });
      });

      const result = await policyTester.runSecurityTestSuite([ContentType.USER_PROFILE]);
      
      expect(result.totalTests).toBeGreaterThan(0);
      expect(result.passedTests + result.failedTests).toBe(result.totalTests);
      expect(result.testResults).toHaveLength(result.totalTests);
      expect(result.performanceBenchmarks).toHaveLength(1);
      expect(result.policyValidation).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(typeof result.summary.criticalIssues).toBe('number');
    });

    it('should generate security report', async () => {
      const mockTestResult: SecurityTestSuiteResult = {
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        testResults: [],
        performanceBenchmarks: [{
          contentType: ContentType.USER_PROFILE,
          contentSize: 1000,
          processingTime: 15,
          throughput: 66.67,
          violationsDetected: 1
        }],
        policyValidation: {
          isValid: true,
          errors: [],
          warnings: ['Test warning'],
          recommendations: []
        },
        recommendations: ['Test recommendation'],
        summary: {
          criticalIssues: 1,
          highIssues: 1,
          mediumIssues: 0,
          lowIssues: 0
        }
      };

      const report = policyTester.generateSecurityReport(mockTestResult);
      
      expect(report).toContain('# Security Policy Test Report');
      expect(report).toContain('Total Tests: 10');
      expect(report).toContain('Passed: 8 (80%)');
      expect(report).toContain('Failed: 2 (20%)');
      expect(report).toContain('Critical Issues: 1');
      expect(report).toContain('## Performance Benchmarks');
      expect(report).toContain('## Recommendations');
      expect(report).toContain('Test recommendation');
    });
  });

  describe('Attack Detection Logic', () => {
    it('should correctly identify blocked critical attacks', () => {
      const testCase: XSSTestCase = {
        name: 'Critical Script',
        payload: '<script>alert("xss")</script>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'script_injection',
        description: 'Critical script attack'
      };

      const result = {
        sanitizedContent: '',
        originalContent: testCase.payload,
        removedElements: ['script'],
        securityViolations: [{
          type: 'script_tag' as const,
          originalContent: testCase.payload,
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical' as const
        }],
        processingTime: 5,
        isValid: false
      };

      const isBlocked = (policyTester as any).isAttackBlocked(testCase, result);
      expect(isBlocked).toBe(true);
    });

    it('should correctly identify unblocked safe content', () => {
      const testCase: XSSTestCase = {
        name: 'Safe Content',
        payload: '<p><strong>Safe text</strong></p>',
        expectedBlocked: false,
        severity: 'low',
        category: 'script_injection',
        description: 'Safe HTML content'
      };

      const result = {
        sanitizedContent: '<p><strong>Safe text</strong></p>',
        originalContent: testCase.payload,
        removedElements: [],
        securityViolations: [],
        processingTime: 2,
        isValid: true
      };

      const isBlocked = (policyTester as any).isAttackBlocked(testCase, result);
      expect(isBlocked).toBe(false);
    });
  });

  describe('Test Content Generation', () => {
    it('should generate test content of specified size', () => {
      const size = 500;
      const content = (policyTester as any).generateTestContent(size);
      
      expect(content.length).toBeLessThanOrEqual(size);
      expect(content.length).toBeGreaterThan(size * 0.8); // Allow some variance
      expect(content).toContain('<p>');
      expect(content).toContain('<strong>');
    });

    it('should generate different content for different sizes', () => {
      const small = (policyTester as any).generateTestContent(100);
      const large = (policyTester as any).generateTestContent(1000);
      
      expect(large.length).toBeGreaterThan(small.length);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate critical recommendations for failed critical tests', () => {
      const testResults: SecurityTestResult[] = [{
        testCase: {
          name: 'Critical Test',
          payload: '<script>alert("xss")</script>',
          expectedBlocked: true,
          severity: 'critical',
          category: 'script_injection',
          description: 'Critical test'
        },
        contentType: ContentType.USER_PROFILE,
        passed: false,
        sanitizedResult: {
          sanitizedContent: '<script>alert("xss")</script>',
          originalContent: '<script>alert("xss")</script>',
          removedElements: [],
          securityViolations: [],
          processingTime: 5,
          isValid: false
        },
        expectedViolations: ['script_tag'],
        actualViolations: [],
        processingTime: 5
      }];

      const benchmarks: PerformanceBenchmark[] = [];

      const recommendations = (policyTester as any).generateRecommendations(testResults, benchmarks);
      
      expect(recommendations.some((rec: string) => rec.includes('CRITICAL'))).toBe(true);
    });

    it('should generate performance recommendations for slow benchmarks', () => {
      const testResults: SecurityTestResult[] = [];
      const benchmarks: PerformanceBenchmark[] = [{
        contentType: ContentType.USER_PROFILE,
        contentSize: 1000,
        processingTime: 150, // Slow
        throughput: 5, // Low throughput
        violationsDetected: 0
      }];

      const recommendations = (policyTester as any).generateRecommendations(testResults, benchmarks);
      
      expect(recommendations.some((rec: string) => rec.includes('Performance'))).toBe(true);
    });

    it('should generate positive recommendations when all tests pass', () => {
      const testResults: SecurityTestResult[] = [{
        testCase: {
          name: 'Test',
          payload: '<script>alert("xss")</script>',
          expectedBlocked: true,
          severity: 'critical',
          category: 'script_injection',
          description: 'Test'
        },
        contentType: ContentType.USER_PROFILE,
        passed: true,
        sanitizedResult: {
          sanitizedContent: '',
          originalContent: '<script>alert("xss")</script>',
          removedElements: ['script'],
          securityViolations: [],
          processingTime: 5,
          isValid: true
        },
        expectedViolations: [],
        actualViolations: [],
        processingTime: 5
      }];

      const benchmarks: PerformanceBenchmark[] = [{
        contentType: ContentType.USER_PROFILE,
        contentSize: 1000,
        processingTime: 50,
        throughput: 20,
        violationsDetected: 0
      }];

      const recommendations = (policyTester as any).generateRecommendations(testResults, benchmarks);
      
      expect(recommendations.some((rec: string) => rec.includes('successfully'))).toBe(true);
    });
  });
});