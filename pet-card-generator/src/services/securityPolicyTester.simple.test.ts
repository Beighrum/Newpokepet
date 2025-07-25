/**
 * Simple tests for SecurityPolicyTester core functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityPolicyTester, XSSTestCase } from './securityPolicyTester';
import { SecurityPolicyManager } from './securityPolicyManager';
import { ContentType } from '../types/sanitization';

describe('SecurityPolicyTester Core', () => {
  let policyTester: SecurityPolicyTester;
  let mockPolicyManager: any;

  beforeEach(() => {
    mockPolicyManager = {
      validateConfiguration: vi.fn(),
      updatePolicy: vi.fn(),
      resetToDefaults: vi.fn(),
      loadConfiguration: vi.fn(),
      getConfiguration: vi.fn()
    };

    policyTester = new SecurityPolicyTester(mockPolicyManager);
  });

  describe('XSS Test Case Generation', () => {
    it('should generate XSS test cases', () => {
      const testCases = (policyTester as any).generateXSSTestCases();
      
      expect(testCases).toBeInstanceOf(Array);
      expect(testCases.length).toBeGreaterThan(10);
      
      // Check that test cases have required properties
      testCases.forEach((testCase: XSSTestCase) => {
        expect(testCase).toHaveProperty('name');
        expect(testCase).toHaveProperty('payload');
        expect(testCase).toHaveProperty('expectedBlocked');
        expect(testCase).toHaveProperty('severity');
        expect(testCase).toHaveProperty('category');
        expect(testCase).toHaveProperty('description');
      });
    });

    it('should include critical script injection tests', () => {
      const testCases = (policyTester as any).generateXSSTestCases();
      const scriptTests = testCases.filter((tc: XSSTestCase) => 
        tc.category === 'script_injection' && tc.severity === 'critical'
      );
      
      expect(scriptTests.length).toBeGreaterThan(0);
      expect(scriptTests.some((tc: XSSTestCase) => tc.payload.includes('<script>'))).toBe(true);
    });

    it('should include different attack categories', () => {
      const testCases = (policyTester as any).generateXSSTestCases();
      const categories = new Set(testCases.map((tc: XSSTestCase) => tc.category));
      
      expect(categories.has('script_injection')).toBe(true);
      expect(categories.has('attribute_injection')).toBe(true);
      expect(categories.has('url_injection')).toBe(true);
    });

    it('should include different severity levels', () => {
      const testCases = (policyTester as any).generateXSSTestCases();
      const severities = new Set(testCases.map((tc: XSSTestCase) => tc.severity));
      
      expect(severities.has('critical')).toBe(true);
      expect(severities.has('high')).toBe(true);
      expect(severities.has('medium')).toBe(true);
      expect(severities.has('low')).toBe(true);
    });
  });

  describe('Attack Detection Logic', () => {
    it('should identify blocked critical attacks', () => {
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

    it('should identify safe content as not blocked', () => {
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
      expect(content.length).toBeGreaterThan(size * 0.8);
      expect(content).toContain('<p>');
      expect(content).toContain('<strong>');
    });

    it('should generate different sized content', () => {
      const small = (policyTester as any).generateTestContent(100);
      const large = (policyTester as any).generateTestContent(1000);
      
      expect(large.length).toBeGreaterThan(small.length);
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
  });

  describe('Security Report Generation', () => {
    it('should generate a comprehensive security report', () => {
      const mockTestResult = {
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

  describe('Expected Violations Detection', () => {
    it('should detect script tag violations', () => {
      const testCase: XSSTestCase = {
        name: 'Script Test',
        payload: '<script>alert("test")</script>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'script_injection',
        description: 'Script injection test'
      };

      const violations = (policyTester as any).getExpectedViolations(testCase);
      expect(violations).toContain('script_tag');
    });

    it('should detect malicious URL violations', () => {
      const testCase: XSSTestCase = {
        name: 'URL Test',
        payload: '<a href="javascript:alert()">Click</a>',
        expectedBlocked: true,
        severity: 'high',
        category: 'url_injection',
        description: 'URL injection test'
      };

      const violations = (policyTester as any).getExpectedViolations(testCase);
      expect(violations).toContain('malicious_url');
    });

    it('should detect dangerous attribute violations', () => {
      const testCase: XSSTestCase = {
        name: 'Attribute Test',
        payload: '<div onclick="alert()">Click</div>',
        expectedBlocked: true,
        severity: 'high',
        category: 'attribute_injection',
        description: 'Attribute injection test'
      };

      const violations = (policyTester as any).getExpectedViolations(testCase);
      expect(violations).toContain('dangerous_attribute');
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate critical recommendations for failed tests', () => {
      const testResults = [{
        testCase: {
          name: 'Critical Test',
          payload: '<script>alert("xss")</script>',
          expectedBlocked: true,
          severity: 'critical' as const,
          category: 'script_injection' as const,
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

      const benchmarks = [];

      const recommendations = (policyTester as any).generateRecommendations(testResults, benchmarks);
      
      expect(recommendations.some((rec: string) => rec.includes('CRITICAL'))).toBe(true);
    });

    it('should generate performance recommendations', () => {
      const testResults = [];
      const benchmarks = [{
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
      const testResults = [{
        testCase: {
          name: 'Test',
          payload: '<script>alert("xss")</script>',
          expectedBlocked: true,
          severity: 'critical' as const,
          category: 'script_injection' as const,
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

      const benchmarks = [{
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