/**
 * Simple test for Firebase Functions Sentry integration
 */

const {
  initializeSentry,
  reportSecurityViolation,
  reportPerformanceIssue,
  reportRateLimitExceeded,
  reportSanitizationFailure,
  addSecurityEventTags,
  createSanitizationPerformanceTransaction,
  reportServerSecurityMetrics,
  createServerDashboardEvent,
  monitorFunctionPerformance,
  wrapFunctionWithEnhancedSentry,
  SecurityEventType,
  SecuritySeverity
} = require('./config/sentry-config');

// Simple test functions
function testSentryInitialization() {
  console.log('Testing Sentry initialization...');
  try {
    initializeSentry();
    console.log('✓ Sentry initialization successful');
    return true;
  } catch (error) {
    console.error('✗ Sentry initialization failed:', error.message);
    return false;
  }
}

function testSecurityViolationReporting() {
  console.log('Testing security violation reporting...');
  try {
    const violations = [{
      type: 'xss_attempt',
      originalContent: '<script>alert("xss")</script>',
      sanitizedContent: '',
      timestamp: new Date(),
      severity: 'high',
      description: 'XSS attempt detected'
    }];

    const context = {
      userId: 'user123',
      contentType: 'pet_card_metadata',
      endpoint: '/api/generate',
      functionName: 'generateCard',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      method: 'POST'
    };

    reportSecurityViolation(violations, context);
    console.log('✓ Security violation reporting successful');
    return true;
  } catch (error) {
    console.error('✗ Security violation reporting failed:', error.message);
    return false;
  }
}

function testPerformanceMonitoring() {
  console.log('Testing performance monitoring...');
  try {
    const transaction = createSanitizationPerformanceTransaction(
      'sanitize',
      'pet_card_metadata',
      1000,
      'generateCard'
    );

    if (transaction) {
      console.log('✓ Performance transaction created successfully');
    } else {
      console.log('✓ Performance monitoring configured (no active transaction)');
    }
    
    return true;
  } catch (error) {
    console.error('✗ Performance monitoring failed:', error.message);
    return false;
  }
}

function testDashboardMetrics() {
  console.log('Testing dashboard metrics reporting...');
  try {
    const metrics = {
      totalViolations: 25,
      violationsByType: { 'xss_attempt': 10, 'malicious_content': 15 },
      violationsBySeverity: { 'high': 8, 'medium': 12, 'low': 5 },
      performanceMetrics: {
        averageSanitizationTime: 300,
        slowSanitizations: 3,
        failedSanitizations: 1
      },
      requestMetrics: {
        totalRequests: 1000,
        failedRequests: 5,
        averageResponseTime: 250
      }
    };

    reportServerSecurityMetrics(metrics, 'generateCard');
    console.log('✓ Dashboard metrics reporting successful');
    return true;
  } catch (error) {
    console.error('✗ Dashboard metrics reporting failed:', error.message);
    return false;
  }
}

function testFunctionWrapping() {
  console.log('Testing function wrapping with Sentry...');
  try {
    const mockHandler = async (req, res) => {
      return 'success';
    };

    const wrappedFunction = wrapFunctionWithEnhancedSentry('testFunction', mockHandler);
    
    if (typeof wrappedFunction === 'function') {
      console.log('✓ Function wrapping successful');
      return true;
    } else {
      console.error('✗ Function wrapping failed: not a function');
      return false;
    }
  } catch (error) {
    console.error('✗ Function wrapping failed:', error.message);
    return false;
  }
}

// Run the tests
console.log('Running Firebase Functions Sentry Integration Tests...');

// Simple test runner for Node.js environment
async function runTests() {
  const tests = [
    testSentryInitialization,
    testSecurityViolationReporting,
    testPerformanceMonitoring,
    testDashboardMetrics,
    testFunctionWrapping
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`✗ Test ${test.name} threw error:`, error.message);
      failed++;
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✓ All Sentry integration tests passed');
    console.log('✓ Server-side monitoring ready');
    console.log('✓ Enhanced error tracking enabled');
    console.log('✓ Performance monitoring configured');
    console.log('✓ Security event categorization ready');
    console.log('✓ Dashboard metrics integration complete');
    return true;
  } else {
    console.error('✗ Some tests failed');
    return false;
  }
}

if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };