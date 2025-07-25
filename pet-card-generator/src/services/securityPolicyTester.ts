/**
 * Security Policy Testing Suite
 * Automated testing of XSS attack vectors and performance benchmarking
 */

import { 
  SecurityPolicyConfiguration, 
  SecurityPolicyManager,
  PolicyValidationResult 
} from './securityPolicyManager';
import { 
  ContentType, 
  SecurityViolation, 
  SanitizedResult,
  DOMPurifyConfig 
} from '../types/sanitization';
import { sanitizationService } from './sanitization';

// XSS attack vector test cases
export interface XSSTestCase {
  name: string;
  payload: string;
  expectedBlocked: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'script_injection' | 'attribute_injection' | 'url_injection' | 'dom_clobbering' | 'prototype_pollution';
  description: string;
}

// Performance benchmark result
export interface PerformanceBenchmark {
  contentType: ContentType;
  contentSize: number;
  processingTime: number;
  throughput: number; // operations per second
  memoryUsage?: number;
  violationsDetected: number;
}

// Security test result
export interface SecurityTestResult {
  testCase: XSSTestCase;
  contentType: ContentType;
  passed: boolean;
  sanitizedResult: SanitizedResult;
  expectedViolations: string[];
  actualViolations: string[];
  processingTime: number;
}

// Comprehensive test suite result
export interface SecurityTestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testResults: SecurityTestResult[];
  performanceBenchmarks: PerformanceBenchmark[];
  policyValidation: PolicyValidationResult;
  recommendations: string[];
  summary: {
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
}

export class SecurityPolicyTester {
  private policyManager: SecurityPolicyManager;
  private xssTestCases: XSSTestCase[];

  constructor(policyManager: SecurityPolicyManager) {
    this.policyManager = policyManager;
    this.xssTestCases = this.generateXSSTestCases();
  }

  /**
   * Run comprehensive security test suite
   */
  async runSecurityTestSuite(contentTypes?: ContentType[]): Promise<SecurityTestSuiteResult> {
    const testContentTypes = contentTypes || [
      ContentType.USER_PROFILE,
      ContentType.PET_CARD_METADATA,
      ContentType.COMMENT,
      ContentType.SOCIAL_SHARING
    ];

    const testResults: SecurityTestResult[] = [];
    const performanceBenchmarks: PerformanceBenchmark[] = [];

    // Run XSS attack vector tests
    for (const contentType of testContentTypes) {
      for (const testCase of this.xssTestCases) {
        const result = await this.runXSSTest(testCase, contentType);
        testResults.push(result);
      }

      // Run performance benchmarks
      const benchmark = await this.runPerformanceBenchmark(contentType);
      performanceBenchmarks.push(benchmark);
    }

    // Validate current policy configuration
    const policyValidation = this.policyManager.validateConfiguration(
      this.policyManager.getConfiguration()
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(testResults, performanceBenchmarks);

    // Calculate summary
    const summary = this.calculateSummary(testResults);

    return {
      totalTests: testResults.length,
      passedTests: testResults.filter(r => r.passed).length,
      failedTests: testResults.filter(r => !r.passed).length,
      testResults,
      performanceBenchmarks,
      policyValidation,
      recommendations,
      summary
    };
  }

  /**
   * Run specific XSS test case
   */
  async runXSSTest(testCase: XSSTestCase, contentType: ContentType): Promise<SecurityTestResult> {
    const startTime = performance.now();
    
    try {
      const sanitizedResult = await sanitizationService.sanitizeHTML(testCase.payload);
      const processingTime = performance.now() - startTime;

      // Check if the attack was properly blocked
      const wasBlocked = this.isAttackBlocked(testCase, sanitizedResult);
      const passed = testCase.expectedBlocked ? wasBlocked : !wasBlocked;

      // Extract violation types
      const actualViolations = sanitizedResult.securityViolations.map(v => v.type);
      const expectedViolations = this.getExpectedViolations(testCase);

      return {
        testCase,
        contentType,
        passed,
        sanitizedResult,
        expectedViolations,
        actualViolations,
        processingTime
      };
    } catch (error) {
      return {
        testCase,
        contentType,
        passed: false,
        sanitizedResult: {
          sanitizedContent: '',
          originalContent: testCase.payload,
          removedElements: [],
          securityViolations: [{
            type: 'suspicious_pattern',
            originalContent: testCase.payload,
            sanitizedContent: '',
            timestamp: new Date(),
            severity: 'critical',
            description: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          processingTime: performance.now() - startTime,
          isValid: false
        },
        expectedViolations: [],
        actualViolations: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Run performance benchmark for content type
   */
  async runPerformanceBenchmark(contentType: ContentType): Promise<PerformanceBenchmark> {
    const testSizes = [100, 1000, 5000, 10000]; // Character counts
    const iterations = 10;
    
    let totalTime = 0;
    let totalViolations = 0;
    let totalOperations = 0;

    for (const size of testSizes) {
      const testContent = this.generateTestContent(size);
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const result = await sanitizationService.sanitizeHTML(testContent);
        const endTime = performance.now();
        
        totalTime += (endTime - startTime);
        totalViolations += result.securityViolations.length;
        totalOperations++;
      }
    }

    const averageTime = totalTime / totalOperations;
    const throughput = 1000 / averageTime; // operations per second

    return {
      contentType,
      contentSize: testSizes.reduce((a, b) => a + b) / testSizes.length,
      processingTime: averageTime,
      throughput,
      violationsDetected: Math.round(totalViolations / totalOperations)
    };
  }

  /**
   * Test policy configuration changes
   */
  async testPolicyConfiguration(config: Partial<SecurityPolicyConfiguration>): Promise<PolicyValidationResult> {
    return this.policyManager.validateConfiguration(config);
  }

  /**
   * Benchmark different policy configurations
   */
  async benchmarkPolicyConfigurations(configs: Array<{
    name: string;
    config: Partial<SecurityPolicyConfiguration>;
  }>): Promise<Array<{
    name: string;
    benchmark: PerformanceBenchmark;
    validation: PolicyValidationResult;
  }>> {
    const results = [];
    const originalConfig = this.policyManager.getConfiguration();

    for (const { name, config } of configs) {
      try {
        // Apply test configuration
        await this.policyManager.updatePolicy({
          riskThresholds: config.riskThresholds,
          performanceThresholds: config.performanceThresholds,
          monitoring: config.monitoring
        });

        // Run benchmark
        const benchmark = await this.runPerformanceBenchmark(ContentType.GENERAL);
        const validation = this.policyManager.validateConfiguration(config);

        results.push({
          name,
          benchmark,
          validation
        });
      } catch (error) {
        console.error(`Failed to benchmark configuration ${name}:`, error);
      }
    }

    // Restore original configuration
    this.policyManager.resetToDefaults();
    await this.policyManager.loadConfiguration();

    return results;
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport(testResult: SecurityTestSuiteResult): string {
    const report = [];
    
    report.push('# Security Policy Test Report');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    
    // Executive Summary
    report.push('## Executive Summary');
    report.push(`- Total Tests: ${testResult.totalTests}`);
    report.push(`- Passed: ${testResult.passedTests} (${Math.round(testResult.passedTests / testResult.totalTests * 100)}%)`);
    report.push(`- Failed: ${testResult.failedTests} (${Math.round(testResult.failedTests / testResult.totalTests * 100)}%)`);
    report.push(`- Critical Issues: ${testResult.summary.criticalIssues}`);
    report.push(`- High Issues: ${testResult.summary.highIssues}`);
    report.push(`- Medium Issues: ${testResult.summary.mediumIssues}`);
    report.push(`- Low Issues: ${testResult.summary.lowIssues}`);
    report.push('');

    // Policy Validation
    report.push('## Policy Validation');
    report.push(`- Valid: ${testResult.policyValidation.isValid ? 'Yes' : 'No'}`);
    if (testResult.policyValidation.errors.length > 0) {
      report.push('### Errors:');
      testResult.policyValidation.errors.forEach(error => {
        report.push(`- ${error}`);
      });
    }
    if (testResult.policyValidation.warnings.length > 0) {
      report.push('### Warnings:');
      testResult.policyValidation.warnings.forEach(warning => {
        report.push(`- ${warning}`);
      });
    }
    report.push('');

    // Performance Benchmarks
    report.push('## Performance Benchmarks');
    testResult.performanceBenchmarks.forEach(benchmark => {
      report.push(`### ${benchmark.contentType}`);
      report.push(`- Average Processing Time: ${benchmark.processingTime.toFixed(2)}ms`);
      report.push(`- Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
      report.push(`- Violations Detected: ${benchmark.violationsDetected}`);
    });
    report.push('');

    // Failed Tests
    const failedTests = testResult.testResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
      report.push('## Failed Tests');
      failedTests.forEach(test => {
        report.push(`### ${test.testCase.name} (${test.contentType})`);
        report.push(`- Severity: ${test.testCase.severity}`);
        report.push(`- Category: ${test.testCase.category}`);
        report.push(`- Description: ${test.testCase.description}`);
        report.push(`- Expected Blocked: ${test.testCase.expectedBlocked}`);
        report.push(`- Processing Time: ${test.processingTime.toFixed(2)}ms`);
        report.push('');
      });
    }

    // Recommendations
    if (testResult.recommendations.length > 0) {
      report.push('## Recommendations');
      testResult.recommendations.forEach(rec => {
        report.push(`- ${rec}`);
      });
      report.push('');
    }

    return report.join('\n');
  }

  // Private methods

  private generateXSSTestCases(): XSSTestCase[] {
    return [
      // Script injection attacks
      {
        name: 'Basic Script Tag',
        payload: '<script>alert("xss")</script>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'script_injection',
        description: 'Basic script tag injection attempt'
      },
      {
        name: 'Script with Attributes',
        payload: '<script type="text/javascript">alert("xss")</script>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'script_injection',
        description: 'Script tag with type attribute'
      },
      {
        name: 'Encoded Script Tag',
        payload: '&lt;script&gt;alert("xss")&lt;/script&gt;',
        expectedBlocked: false,
        severity: 'low',
        category: 'script_injection',
        description: 'HTML encoded script tag (should be safe)'
      },

      // Event handler attacks
      {
        name: 'OnClick Event',
        payload: '<div onclick="alert(\'xss\')">Click me</div>',
        expectedBlocked: true,
        severity: 'high',
        category: 'attribute_injection',
        description: 'Event handler injection via onclick'
      },
      {
        name: 'OnLoad Event',
        payload: '<img src="x" onload="alert(\'xss\')" />',
        expectedBlocked: true,
        severity: 'high',
        category: 'attribute_injection',
        description: 'Event handler injection via onload'
      },
      {
        name: 'OnError Event',
        payload: '<img src="invalid" onerror="alert(\'xss\')" />',
        expectedBlocked: true,
        severity: 'high',
        category: 'attribute_injection',
        description: 'Event handler injection via onerror'
      },

      // URL-based attacks
      {
        name: 'JavaScript URL',
        payload: '<a href="javascript:alert(\'xss\')">Click</a>',
        expectedBlocked: true,
        severity: 'high',
        category: 'url_injection',
        description: 'JavaScript URL injection'
      },
      {
        name: 'Data URL',
        payload: '<iframe src="data:text/html,<script>alert(\'xss\')</script>"></iframe>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'url_injection',
        description: 'Data URL with embedded script'
      },
      {
        name: 'VBScript URL',
        payload: '<a href="vbscript:msgbox(\'xss\')">Click</a>',
        expectedBlocked: true,
        severity: 'medium',
        category: 'url_injection',
        description: 'VBScript URL injection'
      },

      // DOM clobbering attacks
      {
        name: 'Form Element Clobbering',
        payload: '<form><input name="attributes"></form>',
        expectedBlocked: false,
        severity: 'medium',
        category: 'dom_clobbering',
        description: 'Attempt to clobber DOM properties'
      },
      {
        name: 'ID Clobbering',
        payload: '<div id="constructor">Clobber</div>',
        expectedBlocked: false,
        severity: 'low',
        category: 'dom_clobbering',
        description: 'Attempt to clobber constructor property'
      },

      // Style-based attacks
      {
        name: 'CSS Expression',
        payload: '<div style="background: expression(alert(\'xss\'))">Test</div>',
        expectedBlocked: true,
        severity: 'medium',
        category: 'attribute_injection',
        description: 'CSS expression injection (IE specific)'
      },
      {
        name: 'CSS Import',
        payload: '<style>@import "javascript:alert(\'xss\')";</style>',
        expectedBlocked: true,
        severity: 'medium',
        category: 'script_injection',
        description: 'CSS import with JavaScript URL'
      },

      // Advanced evasion techniques
      {
        name: 'Mixed Case Script',
        payload: '<ScRiPt>alert("xss")</ScRiPt>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'script_injection',
        description: 'Mixed case script tag evasion'
      },
      {
        name: 'Nested Tags',
        payload: '<scr<script>ipt>alert("xss")</scr</script>ipt>',
        expectedBlocked: true,
        severity: 'high',
        category: 'script_injection',
        description: 'Nested tag evasion technique'
      },
      {
        name: 'Unicode Bypass',
        payload: '<script>alert(\u0022xss\u0022)</script>',
        expectedBlocked: true,
        severity: 'critical',
        category: 'script_injection',
        description: 'Unicode character bypass attempt'
      },

      // Safe content tests
      {
        name: 'Safe HTML',
        payload: '<p><strong>Bold text</strong> and <em>italic text</em></p>',
        expectedBlocked: false,
        severity: 'low',
        category: 'script_injection',
        description: 'Safe HTML formatting should be preserved'
      },
      {
        name: 'Safe Link',
        payload: '<a href="https://example.com">Safe link</a>',
        expectedBlocked: false,
        severity: 'low',
        category: 'url_injection',
        description: 'Safe HTTPS link should be preserved'
      }
    ];
  }

  private isAttackBlocked(testCase: XSSTestCase, result: SanitizedResult): boolean {
    // Check if dangerous content was removed
    const containsDangerousContent = 
      result.sanitizedContent.includes('<script') ||
      result.sanitizedContent.includes('javascript:') ||
      result.sanitizedContent.includes('vbscript:') ||
      result.sanitizedContent.includes('onclick=') ||
      result.sanitizedContent.includes('onload=') ||
      result.sanitizedContent.includes('onerror=');

    // Check if security violations were detected
    const hasSecurityViolations = result.securityViolations.length > 0;

    // If the test case expects content to be blocked
    if (testCase.expectedBlocked) {
      // For critical attacks, content should be completely removed or violations detected
      if (testCase.severity === 'critical') {
        return !containsDangerousContent || hasSecurityViolations;
      }
      // For other attacks, check based on expected behavior
      return !containsDangerousContent || hasSecurityViolations;
    } else {
      // If content should NOT be blocked, it should remain and have no violations
      return containsDangerousContent && !hasSecurityViolations;
    }
  }

  private getExpectedViolations(testCase: XSSTestCase): string[] {
    const violations = [];
    
    if (testCase.payload.includes('<script')) {
      violations.push('script_tag');
    }
    if (testCase.payload.includes('javascript:') || testCase.payload.includes('vbscript:')) {
      violations.push('malicious_url');
    }
    if (testCase.payload.match(/\son\w+=/)) {
      violations.push('dangerous_attribute');
    }
    
    return violations;
  }

  private generateTestContent(size: number): string {
    const baseContent = '<p>This is test content with <strong>formatting</strong> and <em>emphasis</em>.</p>';
    const repetitions = Math.ceil(size / baseContent.length);
    return baseContent.repeat(repetitions).substring(0, size);
  }

  private generateRecommendations(
    testResults: SecurityTestResult[], 
    benchmarks: PerformanceBenchmark[]
  ): string[] {
    const recommendations = [];
    
    // Check for failed critical tests
    const failedCritical = testResults.filter(r => !r.passed && r.testCase.severity === 'critical');
    if (failedCritical.length > 0) {
      recommendations.push('CRITICAL: Some critical XSS attacks were not blocked. Review and strengthen security policies.');
    }

    // Check performance issues
    const slowBenchmarks = benchmarks.filter(b => b.processingTime > 100);
    if (slowBenchmarks.length > 0) {
      recommendations.push('Performance: Some content types have slow sanitization times. Consider optimizing policies.');
    }

    // Check for low throughput
    const lowThroughput = benchmarks.filter(b => b.throughput < 10);
    if (lowThroughput.length > 0) {
      recommendations.push('Performance: Low throughput detected. Consider caching or policy optimization.');
    }

    // General recommendations
    const passRate = testResults.filter(r => r.passed).length / testResults.length;
    if (passRate < 0.95) {
      recommendations.push('Security: Test pass rate is below 95%. Review failed tests and adjust policies.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All security tests passed successfully. Security policies are working effectively.');
    }

    return recommendations;
  }

  private calculateSummary(testResults: SecurityTestResult[]): SecurityTestSuiteResult['summary'] {
    const failedTests = testResults.filter(r => !r.passed);
    
    return {
      criticalIssues: failedTests.filter(r => r.testCase.severity === 'critical').length,
      highIssues: failedTests.filter(r => r.testCase.severity === 'high').length,
      mediumIssues: failedTests.filter(r => r.testCase.severity === 'medium').length,
      lowIssues: failedTests.filter(r => r.testCase.severity === 'low').length
    };
  }
}

// Export singleton instance
export const securityPolicyTester = new SecurityPolicyTester(
  SecurityPolicyManager.getInstance()
);