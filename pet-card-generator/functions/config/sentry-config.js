/**
 * Sentry configuration for Firebase Functions security monitoring
 * Handles server-side security event tracking and performance monitoring
 */

const Sentry = require('@sentry/node');

// Conditionally load profiling integration
let nodeProfilingIntegration;
try {
  nodeProfilingIntegration = require('@sentry/profiling-node').nodeProfilingIntegration;
} catch (error) {
  console.warn('Sentry profiling integration not available:', error.message);
  nodeProfilingIntegration = null;
}

// Sentry configuration
const SENTRY_DSN = process.env.SENTRY_DSN || 'https://your-dsn@sentry.io/project-id';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

/**
 * Initialize Sentry for Firebase Functions
 */
function initializeSentry() {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    integrations: nodeProfilingIntegration ? [
      nodeProfilingIntegration(),
    ] : [],
    
    // Security-focused configuration
    beforeSend(event, hint) {
      // Filter out sensitive information
      if (event.exception) {
        event.exception.values?.forEach(exception => {
          if (exception.stacktrace?.frames) {
            exception.stacktrace.frames.forEach(frame => {
              if (frame.vars) {
                Object.keys(frame.vars).forEach(key => {
                  if (key.toLowerCase().includes('password') || 
                      key.toLowerCase().includes('token') ||
                      key.toLowerCase().includes('secret') ||
                      key.toLowerCase().includes('key')) {
                    frame.vars[key] = '[Filtered]';
                  }
                });
              }
            });
          }
        });
      }
      
      // Filter sensitive request data
      if (event.request) {
        if (event.request.data) {
          event.request.data = '[Filtered]';
        }
        if (event.request.headers) {
          Object.keys(event.request.headers).forEach(key => {
            if (key.toLowerCase().includes('authorization') ||
                key.toLowerCase().includes('cookie') ||
                key.toLowerCase().includes('token')) {
              event.request.headers[key] = '[Filtered]';
            }
          });
        }
      }
      
      return event;
    },
    
    // Custom tags for security events
    initialScope: {
      tags: {
        component: 'pet-card-generator-functions',
        security_monitoring: 'enabled',
        runtime: 'firebase-functions'
      }
    }
  });
}

/**
 * Security event types for server-side monitoring
 */
const SecurityEventType = {
  XSS_ATTEMPT: 'xss_attempt',
  MALICIOUS_CONTENT: 'malicious_content',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SANITIZATION_FAILURE: 'sanitization_failure',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  PERFORMANCE_DEGRADATION: 'performance_degradation',
  AUTHENTICATION_FAILURE: 'authentication_failure',
  AUTHORIZATION_FAILURE: 'authorization_failure'
};

/**
 * Security severity levels
 */
const SecuritySeverity = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'error',
  CRITICAL: 'fatal'
};

/**
 * Report security violation to Sentry
 */
function reportSecurityViolation(violations, context) {
  const severity = calculateSentrySecuritySeverity(violations);
  const eventType = determineSecurityEventType(violations);
  
  Sentry.withScope(scope => {
    // Set security-specific tags
    scope.setTag('security_event_type', eventType);
    scope.setTag('content_type', context.contentType);
    scope.setTag('violation_count', violations.length.toString());
    scope.setTag('function_name', context.functionName || 'unknown');
    
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    if (context.endpoint) {
      scope.setTag('endpoint', context.endpoint);
    }
    
    if (context.ipAddress) {
      scope.setTag('ip_address', context.ipAddress);
    }
    
    if (context.userAgent) {
      scope.setTag('user_agent', context.userAgent.substring(0, 100)); // Truncate long user agents
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
    
    scope.setContext('request_info', {
      endpoint: context.endpoint,
      method: context.method,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      function_name: context.functionName
    });
    
    // Set fingerprint for grouping similar security events
    scope.setFingerprint([
      eventType,
      context.contentType,
      violations.map(v => v.type).sort().join(','),
      context.functionName || 'unknown'
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
function reportPerformanceIssue(processingTime, context) {
  if (processingTime <= 200) return; // Only report if over threshold
  
  Sentry.withScope(scope => {
    scope.setTag('security_event_type', SecurityEventType.PERFORMANCE_DEGRADATION);
    scope.setTag('content_type', context.contentType);
    scope.setTag('performance_issue', 'sanitization_slow');
    scope.setTag('function_name', context.functionName || 'unknown');
    
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
      performance_ratio: processingTime / 200,
      function_name: context.functionName
    });
    
    scope.setFingerprint([
      'performance_degradation',
      context.contentType,
      Math.floor(processingTime / 100) * 100, // Group by 100ms buckets
      context.functionName || 'unknown'
    ]);
    
    const severity = processingTime > 1000 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM;
    
    Sentry.captureMessage(
      `Sanitization performance degraded: ${processingTime}ms for ${context.contentType} in ${context.functionName}`,
      severity
    );
  });
}

/**
 * Report rate limit exceeded to Sentry
 */
function reportRateLimitExceeded(userId, violationCount, timeWindow, context = {}) {
  Sentry.withScope(scope => {
    scope.setTag('security_event_type', SecurityEventType.RATE_LIMIT_EXCEEDED);
    scope.setTag('rate_limit_exceeded', 'true');
    scope.setTag('function_name', context.functionName || 'unknown');
    scope.setUser({ id: userId });
    
    if (context.endpoint) {
      scope.setTag('endpoint', context.endpoint);
    }
    
    if (context.ipAddress) {
      scope.setTag('ip_address', context.ipAddress);
    }
    
    scope.setContext('rate_limit_data', {
      user_id: userId,
      violation_count: violationCount,
      time_window_ms: timeWindow,
      violations_per_hour: Math.round((violationCount / timeWindow) * 3600000),
      function_name: context.functionName
    });
    
    scope.setFingerprint([
      'rate_limit_exceeded',
      userId,
      Math.floor(violationCount / 5) * 5, // Group by violation count buckets
      context.functionName || 'unknown'
    ]);
    
    const severity = violationCount > 20 ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH;
    
    Sentry.captureMessage(
      `Rate limit exceeded: User ${userId} had ${violationCount} violations in ${context.functionName}`,
      severity
    );
  });
}

/**
 * Report sanitization failure to Sentry
 */
function reportSanitizationFailure(error, context) {
  Sentry.withScope(scope => {
    scope.setTag('security_event_type', SecurityEventType.SANITIZATION_FAILURE);
    scope.setTag('content_type', context.contentType);
    scope.setTag('sanitization_failure', 'true');
    scope.setTag('function_name', context.functionName || 'unknown');
    
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
      error_name: error.name,
      function_name: context.functionName
    });
    
    scope.setFingerprint([
      'sanitization_failure',
      context.contentType,
      error.name,
      context.functionName || 'unknown'
    ]);
    
    Sentry.captureException(error);
  });
}

/**
 * Create custom Sentry transaction for security monitoring
 */
function createSecurityTransaction(name, operation = 'security.sanitization') {
  return Sentry.startTransaction({
    name,
    op: operation,
    tags: {
      security_monitoring: 'true'
    }
  });
}

/**
 * Add security breadcrumb for debugging
 */
function addSecurityBreadcrumb(message, data = {}, level = 'info') {
  Sentry.addBreadcrumb({
    message,
    category: 'security',
    level,
    data,
    timestamp: Date.now() / 1000
  });
}

/**
 * Wrap Firebase Function with Sentry error handling
 */
function wrapFunctionWithSentry(functionName, handler) {
  return async (req, res) => {
    const transaction = Sentry.startTransaction({
      name: functionName,
      op: 'firebase.function',
      tags: {
        function_name: functionName,
        security_monitoring: 'true'
      }
    });
    
    Sentry.getCurrentHub().configureScope(scope => {
      scope.setTag('function_name', functionName);
      scope.setContext('request_info', {
        method: req.method,
        url: req.url,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
    });
    
    try {
      await handler(req, res);
      transaction.setStatus('ok');
    } catch (error) {
      transaction.setStatus('internal_error');
      
      // Add additional context for security-related errors
      Sentry.withScope(scope => {
        scope.setTag('error_in_function', functionName);
        scope.setContext('error_context', {
          function_name: functionName,
          request_method: req.method,
          request_url: req.url
        });
        
        Sentry.captureException(error);
      });
      
      throw error;
    } finally {
      transaction.finish();
    }
  };
}

// Helper functions

function calculateSentrySecuritySeverity(violations) {
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

function getSeverityLevel(severity) {
  switch (severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function determineSecurityEventType(violations) {
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
 * Configure Sentry alerts for critical security violations
 */
function configureSentryAlerts() {
  Sentry.configureScope(scope => {
    scope.setTag('alert_configuration', 'enabled');
    scope.setTag('runtime', 'firebase-functions');
    
    // Configure server-side alert thresholds
    scope.setContext('alert_thresholds', {
      critical_violations_per_hour: 15,
      rate_limit_violations_per_user: 8,
      performance_degradation_threshold_ms: 2000,
      failed_sanitizations_per_hour: 30,
      function_error_rate_threshold: 0.05
    });
  });
}

/**
 * Enhanced security event categorization with custom tags for server-side
 */
function addSecurityEventTags(eventType, context) {
  Sentry.withScope(scope => {
    // Primary categorization tags
    scope.setTag('security_category', getSecurityCategory(eventType));
    scope.setTag('threat_level', getThreatLevel(context.severity, context.violationCount));
    scope.setTag('content_category', getContentCategory(context.contentType));
    scope.setTag('function_category', getFunctionCategory(context.functionName));
    
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
    
    // Request categorization
    if (context.method) {
      scope.setTag('request_method', context.method);
    }
    
    // Geographic categorization (if available)
    if (context.ipAddress && context.ipAddress !== 'unknown') {
      scope.setTag('request_origin', 'external');
    } else {
      scope.setTag('request_origin', 'internal');
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
 * Create performance monitoring transaction for sanitization operations
 */
function createSanitizationPerformanceTransaction(operation, contentType, contentLength, functionName) {
  try {
    const transaction = Sentry.startTransaction({
      name: `sanitization.${operation}`,
      op: 'security.sanitization',
      tags: {
        operation,
        content_type: contentType,
        content_length_category: getContentLengthCategory(contentLength),
        function_name: functionName
      }
    });
    
    // Add performance context
    if (transaction && typeof transaction.setData === 'function') {
      transaction.setData('content_length', contentLength);
      transaction.setData('expected_time_ms', estimateProcessingTime(contentLength));
      transaction.setData('function_name', functionName);
    }
    
    return transaction;
  } catch (error) {
    // Fallback: create a breadcrumb instead
    addSecurityBreadcrumb(
      `Performance monitoring: ${operation} for ${contentType}`,
      {
        operation,
        content_type: contentType,
        content_length: contentLength,
        function_name: functionName
      },
      'info'
    );
    return null;
  }
}

/**
 * Report server-side security metrics to Sentry
 */
function reportServerSecurityMetrics(metrics, functionName) {
  Sentry.withScope(scope => {
    scope.setTag('metric_type', 'server_security_dashboard');
    scope.setTag('metric_category', 'aggregated_server_security_data');
    scope.setTag('function_name', functionName);
    
    // Set metric contexts for Sentry dashboard
    scope.setContext('server_violation_metrics', {
      total_violations: metrics.totalViolations,
      violations_by_type: metrics.violationsByType,
      violations_by_severity: metrics.violationsBySeverity,
      function_name: functionName
    });
    
    scope.setContext('server_performance_metrics', {
      average_sanitization_time: metrics.performanceMetrics?.averageSanitizationTime || 0,
      slow_sanitizations: metrics.performanceMetrics?.slowSanitizations || 0,
      failed_sanitizations: metrics.performanceMetrics?.failedSanitizations || 0,
      function_name: functionName
    });
    
    scope.setContext('server_request_metrics', {
      total_requests: metrics.requestMetrics?.totalRequests || 0,
      failed_requests: metrics.requestMetrics?.failedRequests || 0,
      average_response_time: metrics.requestMetrics?.averageResponseTime || 0,
      function_name: functionName
    });
    
    // Set fingerprint for dashboard grouping
    scope.setFingerprint(['server_security_dashboard_metrics', functionName, new Date().toISOString().split('T')[0]]);
    
    Sentry.captureMessage(`Server Security Dashboard Metrics Update: ${functionName}`, 'info');
  });
}

/**
 * Create custom Sentry dashboard event for server-side
 */
function createServerDashboardEvent(eventName, data, functionName, tags = {}) {
  Sentry.withScope(scope => {
    scope.setTag('event_type', 'server_dashboard_event');
    scope.setTag('dashboard_event_name', eventName);
    scope.setTag('function_name', functionName);
    
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
    
    scope.setContext('server_dashboard_data', { ...data, function_name: functionName });
    scope.setFingerprint(['server_dashboard_event', eventName, functionName]);
    
    Sentry.captureMessage(`Server Dashboard Event: ${eventName} in ${functionName}`, 'info');
  });
}

/**
 * Monitor function performance and report issues
 */
function monitorFunctionPerformance(functionName, executionTime, memoryUsage) {
  if (executionTime > 5000) { // 5 seconds threshold
    Sentry.withScope(scope => {
      scope.setTag('performance_issue', 'slow_function_execution');
      scope.setTag('function_name', functionName);
      
      scope.setContext('function_performance', {
        execution_time_ms: executionTime,
        memory_usage_mb: memoryUsage,
        performance_threshold_ms: 5000,
        function_name: functionName
      });
      
      scope.setFingerprint(['slow_function_execution', functionName]);
      
      const severity = executionTime > 10000 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM;
      Sentry.captureMessage(
        `Slow function execution: ${functionName} took ${executionTime}ms`,
        severity
      );
    });
  }
}

/**
 * Enhanced function wrapper with comprehensive monitoring
 */
function wrapFunctionWithEnhancedSentry(functionName, handler) {
  return async (req, res) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    const transaction = Sentry.startTransaction({
      name: functionName,
      op: 'firebase.function',
      tags: {
        function_name: functionName,
        security_monitoring: 'true',
        enhanced_monitoring: 'true'
      }
    });
    
    Sentry.getCurrentHub().configureScope(scope => {
      scope.setTag('function_name', functionName);
      scope.setTag('enhanced_monitoring', 'enabled');
      
      scope.setContext('request_info', {
        method: req.method,
        url: req.url,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        content_length: req.get('Content-Length') || 0
      });
      
      // Add security context
      scope.setContext('security_context', {
        function_name: functionName,
        monitoring_enabled: true,
        start_time: new Date().toISOString()
      });
    });
    
    try {
      await handler(req, res);
      transaction.setStatus('ok');
      
      const executionTime = Date.now() - startTime;
      const memoryUsed = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024; // MB
      
      // Monitor performance
      monitorFunctionPerformance(functionName, executionTime, memoryUsed);
      
      // Add performance breadcrumb
      addSecurityBreadcrumb(
        `Function ${functionName} completed successfully`,
        {
          execution_time_ms: executionTime,
          memory_used_mb: memoryUsed
        },
        'info'
      );
      
    } catch (error) {
      transaction.setStatus('internal_error');
      
      const executionTime = Date.now() - startTime;
      const memoryUsed = (process.memoryUsage().heapUsed - startMemory) / 1024 / 1024;
      
      // Enhanced error context for security-related errors
      Sentry.withScope(scope => {
        scope.setTag('error_in_function', functionName);
        scope.setTag('error_type', error.name || 'UnknownError');
        
        scope.setContext('error_context', {
          function_name: functionName,
          request_method: req.method,
          request_url: req.url,
          execution_time_ms: executionTime,
          memory_used_mb: memoryUsed,
          error_message: error.message
        });
        
        // Check if it's a security-related error
        if (isSecurityRelatedError(error)) {
          scope.setTag('security_error', 'true');
          scope.setTag('security_error_type', getSecurityErrorType(error));
        }
        
        Sentry.captureException(error);
      });
      
      throw error;
    } finally {
      transaction.finish();
    }
  };
}

// Helper functions for server-side categorization

function getSecurityCategory(eventType) {
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
    case SecurityEventType.AUTHENTICATION_FAILURE:
      return 'auth_failure';
    case SecurityEventType.AUTHORIZATION_FAILURE:
      return 'authz_failure';
    default:
      return 'general_security';
  }
}

function getThreatLevel(severity, violationCount = 1) {
  if (severity === 'critical' || violationCount > 15) return 'critical';
  if (severity === 'high' || violationCount > 8) return 'high';
  if (severity === 'medium' || violationCount > 3) return 'medium';
  return 'low';
}

function getContentCategory(contentType) {
  if (contentType.includes('profile')) return 'user_profile';
  if (contentType.includes('card')) return 'pet_card';
  if (contentType.includes('comment')) return 'user_comment';
  if (contentType.includes('social')) return 'social_sharing';
  return 'general_content';
}

function getFunctionCategory(functionName) {
  if (!functionName) return 'unknown';
  if (functionName.includes('generate')) return 'card_generation';
  if (functionName.includes('evolve')) return 'card_evolution';
  if (functionName.includes('sanitize')) return 'sanitization';
  if (functionName.includes('auth')) return 'authentication';
  return 'general_function';
}

function getPerformanceCategory(processingTime) {
  if (processingTime > 2000) return 'very_slow';
  if (processingTime > 1000) return 'slow';
  if (processingTime > 500) return 'moderate';
  return 'fast';
}

function getTimeCategory(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

function getFrequencyCategory(violationCount) {
  if (violationCount > 30) return 'very_high_frequency';
  if (violationCount > 15) return 'high_frequency';
  if (violationCount > 8) return 'medium_frequency';
  if (violationCount > 1) return 'low_frequency';
  return 'single_occurrence';
}

function getContentLengthCategory(length) {
  if (length > 50000) return 'very_large';
  if (length > 20000) return 'large';
  if (length > 5000) return 'medium';
  if (length > 1000) return 'small';
  return 'very_small';
}

function estimateProcessingTime(contentLength) {
  // Server-side estimation: slightly slower than client-side
  return Math.max(20, Math.floor(contentLength / 80));
}

function isSecurityRelatedError(error) {
  const securityKeywords = ['sanitization', 'xss', 'injection', 'malicious', 'security', 'violation'];
  const errorMessage = (error.message || '').toLowerCase();
  const errorName = (error.name || '').toLowerCase();
  
  return securityKeywords.some(keyword => 
    errorMessage.includes(keyword) || errorName.includes(keyword)
  );
}

function getSecurityErrorType(error) {
  const errorMessage = (error.message || '').toLowerCase();
  
  if (errorMessage.includes('sanitization')) return 'sanitization_error';
  if (errorMessage.includes('xss') || errorMessage.includes('injection')) return 'injection_error';
  if (errorMessage.includes('rate') && errorMessage.includes('limit')) return 'rate_limit_error';
  if (errorMessage.includes('auth')) return 'authentication_error';
  
  return 'general_security_error';
}

module.exports = {
  initializeSentry,
  SecurityEventType,
  SecuritySeverity,
  reportSecurityViolation,
  reportPerformanceIssue,
  reportRateLimitExceeded,
  reportSanitizationFailure,
  createSecurityTransaction,
  addSecurityBreadcrumb,
  wrapFunctionWithSentry,
  // Enhanced functions
  configureSentryAlerts,
  addSecurityEventTags,
  createSanitizationPerformanceTransaction,
  reportServerSecurityMetrics,
  createServerDashboardEvent,
  monitorFunctionPerformance,
  wrapFunctionWithEnhancedSentry
};