# Sentry Security Monitoring Integration

This document describes the comprehensive Sentry integration for security monitoring in the Pet Card Generator application.

## Overview

The Sentry integration provides:
- **Critical security violation alerts**
- **Custom security event categorization**
- **Performance monitoring for sanitization operations**
- **Security metrics dashboards**
- **Real-time threat detection and response**

## Features Implemented

### 1. Critical Security Violation Alerts

#### Client-Side Alerts
- XSS attempt detection and reporting
- Malicious content identification
- Rate limit violation tracking
- Sanitization failure monitoring

#### Server-Side Alerts
- Function-level security monitoring
- Request-based threat detection
- Performance degradation alerts
- Authentication/authorization failures

### 2. Custom Security Event Categorization

#### Primary Categories
- **Injection Attacks**: XSS attempts, script injections
- **Content Threats**: Malicious content, dangerous attributes
- **Abuse Prevention**: Rate limiting, suspicious activity
- **System Failures**: Sanitization failures, configuration errors
- **Performance Issues**: Slow sanitization, resource exhaustion

#### Threat Levels
- **Critical**: Immediate security threats requiring instant response
- **High**: Serious security violations needing prompt attention
- **Medium**: Moderate security concerns for investigation
- **Low**: Minor security events for monitoring

#### Content Categories
- **User Profile**: Profile-related security events
- **Pet Card**: Card generation and metadata security
- **User Comment**: Comment system security monitoring
- **Social Sharing**: Social media integration security

### 3. Performance Monitoring

#### Sanitization Performance Tracking
- Processing time measurement for all sanitization operations
- Content length categorization (very_small, small, medium, large, very_large)
- Performance threshold alerts (>200ms warning, >500ms error, >1000ms critical)
- Memory usage monitoring for server-side operations

#### Performance Categories
- **Fast**: <200ms processing time
- **Moderate**: 200-500ms processing time
- **Slow**: 500-1000ms processing time
- **Very Slow**: >1000ms processing time

### 4. Security Metrics Dashboard

#### Violation Metrics
- Total violations count
- Violations by type breakdown
- Violations by severity distribution
- Time-series violation trends

#### Performance Metrics
- Average sanitization processing time
- Count of slow sanitization operations
- Failed sanitization attempts
- Performance degradation trends

#### User Behavior Metrics
- Users with security violations
- Rate-limited users count
- Top violating users identification
- Anonymous vs authenticated user patterns

#### Time-Based Analysis
- Hourly violation patterns
- Peak threat detection times
- Seasonal security trends
- Geographic threat distribution

## Configuration

### Environment Variables

```bash
# Client-side (React)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
NODE_ENV=production|development

# Server-side (Firebase Functions)
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NODE_ENV=production|development
```

### Alert Thresholds

#### Client-Side Thresholds
```typescript
const SECURITY_ALERT_CONFIG = {
  CRITICAL_VIOLATION_THRESHOLD: 5,      // violations per hour
  RATE_LIMIT_ALERT_THRESHOLD: 10,       // violations per user
  PERFORMANCE_DEGRADATION_THRESHOLD: 3  // slow operations
};
```

#### Server-Side Thresholds
```javascript
const alert_thresholds = {
  critical_violations_per_hour: 15,
  rate_limit_violations_per_user: 8,
  performance_degradation_threshold_ms: 2000,
  failed_sanitizations_per_hour: 30,
  function_error_rate_threshold: 0.05
};
```

## Usage Examples

### Reporting Security Violations

#### Client-Side
```typescript
import { reportSecurityViolation } from '../config/sentry';

const violations: SecurityViolation[] = [{
  type: 'xss_attempt',
  originalContent: '<script>alert("xss")</script>',
  sanitizedContent: '',
  timestamp: new Date(),
  severity: 'high',
  description: 'Script tag detected'
}];

reportSecurityViolation(violations, {
  userId: 'user123',
  contentType: ContentType.PET_CARD_METADATA,
  endpoint: '/pet-card/sanitize',
  originalContent: maliciousContent,
  sanitizedContent: cleanContent
});
```

#### Server-Side
```javascript
const { reportSecurityViolation } = require('./config/sentry-config');

reportSecurityViolation(violations, {
  userId: 'user123',
  contentType: 'pet_card_metadata',
  endpoint: '/api/generate',
  functionName: 'generateCard',
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});
```

### Performance Monitoring

#### Creating Performance Spans
```typescript
const span = createSanitizationPerformanceSpan(
  'pet_card_sanitization',
  ContentType.PET_CARD_METADATA,
  originalContent.length
);

try {
  // Perform sanitization
  const result = await sanitizeContent(content);
  
  if (span) {
    span.setData('violations_found', violations.length);
    span.setStatus('ok');
  }
} catch (error) {
  if (span) {
    span.setStatus('internal_error');
  }
  throw error;
} finally {
  if (span) {
    span.finish();
  }
}
```

### Dashboard Metrics

#### Generating Security Metrics
```typescript
const metrics = await securityEventIntegration.generateDashboardMetrics();
// Automatically reports to Sentry for dashboard creation
```

#### Creating Custom Dashboard Events
```typescript
securityEventIntegration.createCustomDashboardEvent(
  'high_violation_count',
  {
    total_violations: 150,
    threshold: 100,
    severity: 'warning'
  },
  { alert_type: 'trend_analysis' }
);
```

## Sentry Dashboard Setup

### Recommended Dashboards

#### 1. Security Overview Dashboard
- Total violations (last 24h, 7d, 30d)
- Violation types breakdown
- Threat level distribution
- Top affected endpoints

#### 2. Performance Monitoring Dashboard
- Average sanitization times
- Performance degradation alerts
- Slow operation trends
- Memory usage patterns

#### 3. User Behavior Dashboard
- Rate-limited users
- Top violating users
- Anonymous vs authenticated patterns
- Geographic threat distribution

#### 4. Real-Time Alerts Dashboard
- Critical violations (live)
- System health indicators
- Function performance metrics
- Error rate monitoring

### Alert Rules Configuration

#### Critical Alerts
```yaml
# High violation rate
- condition: event.count > 10 in 1h
  action: page_oncall_engineer
  
# Critical security violation
- condition: event.tags.threat_level == "critical"
  action: immediate_notification
  
# System failure
- condition: event.tags.security_event_type == "sanitization_failure"
  action: escalate_to_security_team
```

#### Warning Alerts
```yaml
# Performance degradation
- condition: event.contexts.performance_data.processing_time_ms > 1000
  action: notify_dev_team
  
# Rate limit exceeded
- condition: event.tags.security_event_type == "rate_limit_exceeded"
  action: monitor_user_activity
```

## Integration Points

### Client-Side Integration
- **App.tsx**: Sentry initialization and periodic monitoring
- **Security Event Integration**: Centralized security event reporting
- **Sanitization Services**: Performance monitoring for all sanitization operations
- **React Components**: Error boundaries with security context

### Server-Side Integration
- **Firebase Functions**: Enhanced function wrapping with monitoring
- **Express Middleware**: Request-level security monitoring
- **Sanitization Services**: Server-side performance tracking
- **Error Handling**: Comprehensive error categorization

## Monitoring and Maintenance

### Daily Monitoring
- Review critical security alerts
- Check performance degradation trends
- Monitor user behavior patterns
- Verify system health metrics

### Weekly Analysis
- Analyze violation trends
- Review top violating users
- Assess performance improvements
- Update alert thresholds if needed

### Monthly Review
- Security metrics analysis
- Dashboard optimization
- Alert rule refinement
- Performance baseline updates

## Troubleshooting

### Common Issues

#### High False Positive Rate
- Review and adjust alert thresholds
- Refine security event categorization
- Update content filtering rules

#### Performance Impact
- Optimize sanitization algorithms
- Implement caching strategies
- Adjust monitoring frequency

#### Missing Events
- Verify Sentry DSN configuration
- Check network connectivity
- Review error handling in integration points

### Debug Mode

Enable debug logging:
```bash
# Client-side
VITE_SENTRY_DEBUG=true

# Server-side
SENTRY_DEBUG=true
```

## Security Considerations

### Data Privacy
- Sensitive content is filtered before sending to Sentry
- User identifiers are hashed when possible
- PII is automatically redacted from error reports

### Access Control
- Sentry project access restricted to security team
- Dashboard viewing permissions managed
- Alert notification lists maintained

### Compliance
- GDPR compliance through data filtering
- Audit trail maintenance
- Data retention policies enforced

## Future Enhancements

### Planned Features
- Machine learning-based threat detection
- Automated response to security violations
- Integration with external security tools
- Advanced user behavior analytics

### Performance Improvements
- Distributed caching for metrics
- Real-time streaming analytics
- Predictive performance monitoring
- Automated scaling based on threat levels