# Security Policy Configuration Documentation

## Overview

The Security Policy Management system provides configurable, runtime-updatable security policies for content sanitization in the pet card generator application. This system allows for different sanitization rules for different content types while maintaining high security standards.

## Architecture

### Components

1. **SecurityPolicyManager**: Central configuration management
2. **SecurityPolicyTester**: Automated testing and validation
3. **Integration with SanitizationService**: Runtime policy application

### Key Features

- **Runtime Configuration Updates**: Modify policies without deployment
- **Content Type Specific Policies**: Different rules for different content
- **Automated Testing**: XSS attack vector validation
- **Performance Monitoring**: Benchmarking and optimization
- **Risk Assessment**: Automated risk level calculation

## Configuration Structure

### Security Policy Configuration

```typescript
interface SecurityPolicyConfiguration {
  version: string;
  lastUpdated: string;
  policies: SecurityPolicy;
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  performanceThresholds: {
    maxProcessingTimeMs: number;
    maxContentLength: number;
    maxConcurrentRequests: number;
  };
  monitoring: {
    logSecurityViolations: boolean;
    alertOnCriticalViolations: boolean;
    trackPerformanceMetrics: boolean;
    auditTrailEnabled: boolean;
  };
}
```

### Content Type Policies

The system supports different policies for different content types:

- **User Profiles**: Allows basic formatting tags
- **Pet Card Metadata**: Restrictive, inline formatting only
- **Comments**: Moderate formatting with links
- **Social Sharing**: Plain text only
- **Default Policy**: Fallback for unknown content types

## Usage Examples

### Basic Policy Management

```typescript
import { securityPolicyManager } from './services/securityPolicyManager';
import { ContentType } from './types/sanitization';

// Get current configuration
const config = securityPolicyManager.getConfiguration();

// Get policy for specific content type
const userProfilePolicy = securityPolicyManager.getPolicyForContentType(ContentType.USER_PROFILE);

// Update policy at runtime
await securityPolicyManager.updatePolicy({
  contentType: ContentType.USER_PROFILE,
  policy: {
    allowedTags: ['b', 'i', 'strong', 'em'],
    forbidTags: ['script', 'iframe', 'object']
  }
});
```

### Security Testing

```typescript
import { securityPolicyTester } from './services/securityPolicyTester';

// Run comprehensive security test suite
const testResult = await securityPolicyTester.runSecurityTestSuite([
  ContentType.USER_PROFILE,
  ContentType.PET_CARD_METADATA
]);

// Generate security report
const report = securityPolicyTester.generateSecurityReport(testResult);
console.log(report);

// Test specific XSS attack
const xssTest = {
  name: 'Script Injection Test',
  payload: '<script>alert("xss")</script>',
  expectedBlocked: true,
  severity: 'critical',
  category: 'script_injection',
  description: 'Basic script tag injection'
};

const result = await securityPolicyTester.runXSSTest(xssTest, ContentType.USER_PROFILE);
```

### Performance Benchmarking

```typescript
// Run performance benchmark
const benchmark = await securityPolicyTester.runPerformanceBenchmark(ContentType.USER_PROFILE);

console.log(`Processing Time: ${benchmark.processingTime}ms`);
console.log(`Throughput: ${benchmark.throughput} ops/sec`);

// Benchmark different configurations
const configs = [
  {
    name: 'Strict Policy',
    config: {
      riskThresholds: { low: 0.1, medium: 0.3, high: 0.6, critical: 0.9 }
    }
  },
  {
    name: 'Balanced Policy',
    config: {
      riskThresholds: { low: 0.2, medium: 0.5, high: 0.8, critical: 0.95 }
    }
  }
];

const benchmarkResults = await securityPolicyTester.benchmarkPolicyConfigurations(configs);
```

## Content Type Policies

### User Profiles

**Allowed Tags**: `b`, `i`, `em`, `strong`, `u`, `s`, `br`, `p`, `span`

**Use Case**: User bio and display name formatting

**Security Level**: Moderate - allows basic formatting while blocking dangerous content

```json
{
  "allowedTags": ["b", "i", "em", "strong", "u", "s", "br", "p", "span"],
  "allowedAttributes": {
    "span": ["class"],
    "p": ["class"]
  },
  "forbidTags": ["script", "iframe", "object", "embed"],
  "forbidAttr": ["onclick", "onload", "onerror", "style", "src", "href"]
}
```

### Pet Card Metadata

**Allowed Tags**: `b`, `i`, `em`, `strong`, `u`, `br`, `span`

**Use Case**: Pet names, breeds, and short descriptions

**Security Level**: Restrictive - inline formatting only, no block elements

```json
{
  "allowedTags": ["b", "i", "em", "strong", "u", "br", "span"],
  "allowedAttributes": {
    "span": ["class"]
  },
  "forbidTags": ["script", "iframe", "object", "embed", "p", "div"],
  "forbidAttr": ["onclick", "onload", "onerror", "style", "src", "href", "id"]
}
```

### Comments

**Allowed Tags**: `b`, `i`, `em`, `strong`, `u`, `s`, `br`, `p`, `span`, `blockquote`

**Use Case**: User comments on shared pet cards

**Security Level**: Moderate - allows formatting and quotes, restricted links

```json
{
  "allowedTags": ["b", "i", "em", "strong", "u", "s", "br", "p", "span", "blockquote"],
  "allowedAttributes": {
    "span": ["class"],
    "p": ["class"],
    "blockquote": ["class"]
  },
  "allowedSchemes": ["http", "https"],
  "forbidTags": ["script", "iframe", "object", "embed"],
  "forbidAttr": ["onclick", "onload", "onerror", "style", "background"]
}
```

### Social Sharing

**Allowed Tags**: None

**Use Case**: Social media sharing descriptions

**Security Level**: Maximum - plain text only

```json
{
  "allowedTags": [],
  "allowedAttributes": {},
  "forbidTags": ["script", "iframe", "object", "embed", "b", "i", "p", "div"],
  "forbidAttr": ["onclick", "onload", "onerror", "style", "class", "id"]
}
```

## XSS Attack Vector Testing

The system includes comprehensive XSS attack vector testing:

### Test Categories

1. **Script Injection**
   - Basic script tags
   - Mixed case evasion
   - Nested tag techniques
   - Unicode bypass attempts

2. **Attribute Injection**
   - Event handlers (onclick, onload, onerror)
   - CSS expressions
   - Style-based attacks

3. **URL Injection**
   - JavaScript URLs
   - Data URLs with embedded scripts
   - VBScript URLs

4. **DOM Clobbering**
   - Form element clobbering
   - ID-based property clobbering

5. **Advanced Evasion**
   - Encoding bypass attempts
   - Nested tag structures
   - Protocol confusion

### Example Test Cases

```typescript
// Critical script injection
{
  name: 'Basic Script Tag',
  payload: '<script>alert("xss")</script>',
  expectedBlocked: true,
  severity: 'critical',
  category: 'script_injection'
}

// Event handler injection
{
  name: 'OnClick Event',
  payload: '<div onclick="alert(\'xss\')">Click me</div>',
  expectedBlocked: true,
  severity: 'high',
  category: 'attribute_injection'
}

// URL-based attack
{
  name: 'JavaScript URL',
  payload: '<a href="javascript:alert(\'xss\')">Click</a>',
  expectedBlocked: true,
  severity: 'high',
  category: 'url_injection'
}

// Safe content test
{
  name: 'Safe HTML',
  payload: '<p><strong>Bold text</strong></p>',
  expectedBlocked: false,
  severity: 'low',
  category: 'script_injection'
}
```

## Performance Considerations

### Optimization Strategies

1. **Policy Caching**: Policies are cached and only updated when configuration changes
2. **Content Type Optimization**: Different policies for different content types
3. **Performance Monitoring**: Automatic tracking of processing times
4. **Threshold Alerts**: Warnings when processing exceeds thresholds

### Performance Thresholds

```json
{
  "maxProcessingTimeMs": 100,
  "maxContentLength": 10000,
  "maxConcurrentRequests": 50
}
```

### Benchmarking Results

Typical performance metrics:

- **User Profiles**: ~15ms processing time, 65 ops/sec
- **Pet Card Metadata**: ~8ms processing time, 125 ops/sec
- **Comments**: ~20ms processing time, 50 ops/sec
- **Social Sharing**: ~5ms processing time, 200 ops/sec

## Risk Assessment

### Risk Levels

- **Low (0.0-0.2)**: Safe content, no violations
- **Medium (0.2-0.5)**: Minor formatting violations
- **High (0.5-0.8)**: Dangerous attributes or suspicious patterns
- **Critical (0.8-1.0)**: Script injection or severe security threats

### Risk Calculation

Risk levels are calculated based on:
1. Violation severity (critical > high > medium > low)
2. Number of violations
3. Content type sensitivity
4. Attack vector complexity

## Monitoring and Alerting

### Security Event Logging

All security violations are logged with:
- User context and IP address
- Original and sanitized content
- Violation types and severity
- Processing time and performance metrics

### Integration with Sentry

Critical security events are automatically reported to Sentry with:
- Custom tags for security event categorization
- Performance monitoring for sanitization operations
- Dashboards for security metrics and trends

### Audit Trail

Complete audit trail includes:
- All sanitization actions
- Policy configuration changes
- Security test results
- Performance benchmarks

## Best Practices

### Policy Configuration

1. **Principle of Least Privilege**: Only allow necessary tags and attributes
2. **Content Type Specificity**: Use different policies for different content types
3. **Regular Testing**: Run security tests after policy changes
4. **Performance Monitoring**: Monitor processing times and throughput

### Security Testing

1. **Comprehensive Coverage**: Test all attack vectors and content types
2. **Regular Execution**: Run tests as part of CI/CD pipeline
3. **Performance Validation**: Ensure changes don't impact performance
4. **Documentation**: Keep test cases and results documented

### Incident Response

1. **Immediate Blocking**: Critical violations should block content immediately
2. **Alert Escalation**: High-severity events should trigger alerts
3. **Policy Updates**: Update policies based on new attack vectors
4. **User Communication**: Provide clear feedback for rejected content

## Troubleshooting

### Common Issues

1. **Policy Not Applied**: Check configuration loading and caching
2. **Performance Degradation**: Review policy complexity and thresholds
3. **False Positives**: Adjust risk thresholds and violation detection
4. **Test Failures**: Verify expected behavior matches actual implementation

### Debug Tools

1. **Configuration Validation**: Use built-in validation methods
2. **Test Suite Execution**: Run comprehensive security tests
3. **Performance Profiling**: Use benchmarking tools
4. **Log Analysis**: Review security event logs and audit trails

## API Reference

### SecurityPolicyManager

```typescript
class SecurityPolicyManager {
  static getInstance(): SecurityPolicyManager
  loadConfiguration(): Promise<SecurityPolicyConfiguration>
  getConfiguration(): SecurityPolicyConfiguration
  getPolicyForContentType(contentType: ContentType): DOMPurifyConfig
  updatePolicy(updateRequest: PolicyUpdateRequest): Promise<PolicyValidationResult>
  validateConfiguration(config: Partial<SecurityPolicyConfiguration>): PolicyValidationResult
  calculateRiskLevel(violations: SecurityViolation[]): 'low' | 'medium' | 'high' | 'critical'
  onConfigurationUpdate(callback: Function): () => void
  resetToDefaults(): void
}
```

### SecurityPolicyTester

```typescript
class SecurityPolicyTester {
  runSecurityTestSuite(contentTypes?: ContentType[]): Promise<SecurityTestSuiteResult>
  runXSSTest(testCase: XSSTestCase, contentType: ContentType): Promise<SecurityTestResult>
  runPerformanceBenchmark(contentType: ContentType): Promise<PerformanceBenchmark>
  testPolicyConfiguration(config: Partial<SecurityPolicyConfiguration>): Promise<PolicyValidationResult>
  benchmarkPolicyConfigurations(configs: Array<{name: string, config: Partial<SecurityPolicyConfiguration>}>): Promise<Array<{name: string, benchmark: PerformanceBenchmark, validation: PolicyValidationResult}>>
  generateSecurityReport(testResult: SecurityTestSuiteResult): string
}
```

## Conclusion

The Security Policy Management system provides a comprehensive, configurable, and testable approach to content sanitization. By combining runtime policy updates, automated testing, and performance monitoring, it ensures both security and usability for the pet card generator application.

Regular testing, monitoring, and policy updates are essential for maintaining security effectiveness as new attack vectors emerge and application requirements evolve.