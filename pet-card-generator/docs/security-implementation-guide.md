# Security Implementation Guide for Developers

## Overview

This guide provides comprehensive instructions for developers working with the DOMPurify security integration in the Pet Card Generator application. It covers implementation patterns, best practices, and security considerations for maintaining a secure application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Security Components](#core-security-components)
3. [Implementation Patterns](#implementation-patterns)
4. [Testing Security Features](#testing-security-features)
5. [Performance Considerations](#performance-considerations)
6. [Debugging and Troubleshooting](#debugging-and-troubleshooting)
7. [Security Best Practices](#security-best-practices)
8. [API Reference](#api-reference)

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- TypeScript knowledge
- React and Firebase experience
- Understanding of XSS vulnerabilities

### Installation

The security system is already integrated. To verify installation:

```bash
# Check client-side dependencies
cd pet-card-generator
npm list dompurify isomorphic-dompurify

# Check server-side dependencies  
cd functions
npm list dompurify jsdom
```

### Basic Usage

```typescript
// Client-side sanitization
import { useSanitizedContent } from '../hooks/useSanitizedContent';

function MyComponent() {
  const { sanitize, isLoading, error } = useSanitizedContent();
  
  const handleUserInput = (input: string) => {
    const sanitized = sanitize(input, {
      allowedTags: ['b', 'i', 'em', 'strong']
    });
    // Use sanitized content safely
  };
}

// Server-side sanitization
const { sanitizeHTML } = require('./services/sanitization-service');

exports.myFunction = functions.https.onCall(async (data, context) => {
  const sanitized = await sanitizeHTML(data.content, {
    contentType: 'pet_card_metadata'
  });
  // Process sanitized content
});
```

## Core Security Components

### 1. Sanitization Service

**Location**: `src/services/sanitization.ts`

The core sanitization service provides:
- HTML content sanitization using DOMPurify
- Configurable sanitization policies
- Performance monitoring
- Error handling and logging

```typescript
import { sanitizationService } from '../services/sanitization';

// Basic sanitization
const result = await sanitizationService.sanitizeHTML(userInput);

// With custom options
const result = await sanitizationService.sanitizeHTML(userInput, {
  allowedTags: ['p', 'b', 'i'],
  allowedAttributes: { 'p': ['class'] },
  stripIgnoreTag: true
});

// Check result
if (result.violations.length > 0) {
  console.warn('Security violations detected:', result.violations);
}
```

### 2. React Hooks

**Location**: `src/hooks/useSanitizedContent.ts`

Provides React integration for sanitization:

```typescript
import { useSanitizedContent } from '../hooks/useSanitizedContent';

function UserProfileForm() {
  const { sanitize, sanitizeAsync, isLoading, error } = useSanitizedContent();
  
  const [bio, setBio] = useState('');
  
  const handleBioChange = (value: string) => {
    const sanitized = sanitize(value, {
      allowedTags: ['b', 'i', 'em', 'strong', 'p']
    });
    setBio(sanitized);
  };
  
  // For async operations
  const handleAsyncSanitization = async (content: string) => {
    try {
      const sanitized = await sanitizeAsync(content);
      setBio(sanitized);
    } catch (err) {
      console.error('Sanitization failed:', err);
    }
  };
}
```

### 3. Sanitized Input Components

**Location**: `src/components/sanitization/`

Pre-built components with built-in sanitization:

```typescript
import { SanitizedInput, SanitizedTextArea } from '../components/sanitization';

function PetCardForm() {
  const [petName, setPetName] = useState('');
  const [description, setDescription] = useState('');
  
  return (
    <form>
      <SanitizedInput
        value={petName}
        onChange={setPetName}
        placeholder="Pet name"
        allowedTags={['b', 'i']}
        maxLength={50}
        onSecurityViolation={(violation) => {
          console.warn('Security violation:', violation);
        }}
      />
      
      <SanitizedTextArea
        value={description}
        onChange={setDescription}
        placeholder="Pet description"
        allowedTags={['b', 'i', 'em', 'strong', 'p']}
        rows={4}
        onSecurityViolation={(violation) => {
          // Handle security violations
          reportSecurityEvent(violation);
        }}
      />
    </form>
  );
}
```

### 4. Safe Display Components

**Location**: `src/components/sanitization/SafeHTMLDisplay.tsx`

For safely displaying sanitized HTML content:

```typescript
import { SafeHTMLDisplay, PetCardSafeDisplay } from '../components/sanitization';

function PetCardDisplay({ card }: { card: PetCard }) {
  return (
    <div>
      <PetCardSafeDisplay
        card={card}
        showMetadata={true}
        onContentError={(error) => {
          console.error('Content display error:', error);
          // Fallback to safe display
        }}
      />
      
      <SafeHTMLDisplay
        content={card.description}
        className="pet-description"
        fallbackComponent={() => <p>Content unavailable</p>}
        onRenderError={(error) => {
          reportRenderingError(error);
        }}
      />
    </div>
  );
}
```

### 5. Server-Side Middleware

**Location**: `functions/middleware/sanitization-middleware.js`

Express middleware for automatic request sanitization:

```javascript
const { sanitizationMiddleware } = require('./middleware/sanitization-middleware');

// Apply to all routes
app.use(sanitizationMiddleware.sanitizeRequest);

// Apply to specific fields
app.post('/api/pet-card', 
  sanitizationMiddleware.sanitizeBody(['name', 'description']),
  (req, res) => {
    // req.body.name and req.body.description are now sanitized
    const card = createPetCard(req.body);
    res.json(card);
  }
);

// Custom sanitization
app.post('/api/user-profile',
  (req, res, next) => {
    sanitizationMiddleware.sanitizeBody(['bio'], {
      contentType: 'user_profile',
      allowedTags: ['b', 'i', 'em', 'strong', 'p']
    })(req, res, next);
  },
  (req, res) => {
    updateUserProfile(req.body);
    res.json({ success: true });
  }
);
```

## Implementation Patterns

### 1. Input Validation Pattern

Always sanitize user input at the point of entry:

```typescript
// ❌ Wrong - sanitizing at display time only
function DisplayUserBio({ bio }: { bio: string }) {
  const sanitized = sanitize(bio);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ✅ Correct - sanitizing at input time
function UserBioForm() {
  const [bio, setBio] = useState('');
  
  const handleBioChange = (value: string) => {
    const sanitized = sanitize(value);
    setBio(sanitized); // Store sanitized version
  };
  
  return (
    <SanitizedTextArea
      value={bio}
      onChange={handleBioChange}
      allowedTags={['b', 'i', 'em', 'strong', 'p']}
    />
  );
}
```

### 2. Defense in Depth Pattern

Implement sanitization at multiple layers:

```typescript
// Layer 1: Client-side input sanitization
const clientSanitized = sanitize(userInput);

// Layer 2: Server-side validation
app.post('/api/content', 
  sanitizationMiddleware.sanitizeBody(['content']),
  async (req, res) => {
    // Layer 3: Pre-storage sanitization
    const finalSanitized = await sanitizeForStorage(req.body.content);
    
    // Layer 4: Database constraints
    await saveWithValidation(finalSanitized);
  }
);

// Layer 5: Display-time safety check
function DisplayContent({ content }: { content: string }) {
  return (
    <SafeHTMLDisplay
      content={content}
      fallbackComponent={() => <p>Content unavailable</p>}
    />
  );
}
```

### 3. Content Type Specific Sanitization

Use different sanitization rules for different content types:

```typescript
import { ContentType } from '../types/sanitization';

const sanitizeByContentType = (content: string, type: ContentType) => {
  switch (type) {
    case ContentType.USER_PROFILE:
      return sanitize(content, {
        allowedTags: ['b', 'i', 'em', 'strong', 'u', 's', 'br', 'p'],
        allowedAttributes: { 'p': ['class'] }
      });
      
    case ContentType.PET_CARD_METADATA:
      return sanitize(content, {
        allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br'],
        allowedAttributes: {}
      });
      
    case ContentType.SOCIAL_SHARING:
      return sanitize(content, {
        allowedTags: [], // Plain text only
        allowedAttributes: {}
      });
      
    default:
      return sanitize(content, { allowedTags: [] }); // Safest default
  }
};
```

### 4. Error Handling Pattern

Implement comprehensive error handling:

```typescript
async function safeSanitization(content: string, options?: SanitizeOptions) {
  try {
    const result = await sanitizationService.sanitizeHTML(content, options);
    
    // Check for violations
    if (result.violations.length > 0) {
      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      
      if (criticalViolations.length > 0) {
        // Report critical violations
        await reportSecurityViolation(criticalViolations);
        
        // Consider blocking the content
        throw new SecurityError('Critical security violation detected');
      }
    }
    
    return result.sanitizedContent;
    
  } catch (error) {
    if (error instanceof SecurityError) {
      // Handle security errors specifically
      console.error('Security error:', error);
      throw error;
    }
    
    // Fallback for other errors
    console.error('Sanitization failed:', error);
    return ''; // Safe fallback
  }
}
```

### 5. Performance Optimization Pattern

Optimize sanitization performance:

```typescript
import { sanitizationCache } from '../services/sanitizationCache';

async function optimizedSanitization(content: string, options?: SanitizeOptions) {
  // Check cache first
  const cacheKey = generateCacheKey(content, options);
  const cached = await sanitizationCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  // Perform sanitization
  const result = await sanitizationService.sanitizeHTML(content, options);
  
  // Cache result if no violations
  if (result.violations.length === 0) {
    await sanitizationCache.set(cacheKey, result.sanitizedContent, {
      ttl: 3600 // 1 hour
    });
  }
  
  return result.sanitizedContent;
}

// Batch sanitization for multiple items
async function batchSanitize(items: Array<{content: string, type: ContentType}>) {
  const promises = items.map(item => 
    optimizedSanitization(item.content, getOptionsForType(item.type))
  );
  
  return Promise.all(promises);
}
```

## Testing Security Features

### 1. Unit Testing Sanitization

```typescript
// sanitization.test.ts
import { sanitizationService } from '../services/sanitization';

describe('Sanitization Service', () => {
  test('should remove script tags', async () => {
    const malicious = '<script>alert("xss")</script><p>Safe content</p>';
    const result = await sanitizationService.sanitizeHTML(malicious);
    
    expect(result.sanitizedContent).toBe('<p>Safe content</p>');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe('script_tag');
  });
  
  test('should preserve allowed tags', async () => {
    const content = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
    const result = await sanitizationService.sanitizeHTML(content, {
      allowedTags: ['p', 'strong', 'em']
    });
    
    expect(result.sanitizedContent).toBe(content);
    expect(result.violations).toHaveLength(0);
  });
  
  test('should handle malformed HTML', async () => {
    const malformed = '<p><strong>Unclosed tag<em>Mixed nesting</p>';
    const result = await sanitizationService.sanitizeHTML(malformed);
    
    expect(result.sanitizedContent).toContain('Unclosed tag');
    expect(result.sanitizedContent).toContain('Mixed nesting');
  });
});
```

### 2. Integration Testing

```typescript
// integration.test.ts
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SanitizedInput } from '../components/sanitization/SanitizedInput';

describe('SanitizedInput Integration', () => {
  test('should sanitize input on change', async () => {
    const onChangeMock = jest.fn();
    const onViolationMock = jest.fn();
    
    const { getByRole } = render(
      <SanitizedInput
        value=""
        onChange={onChangeMock}
        onSecurityViolation={onViolationMock}
        allowedTags={['b', 'i']}
      />
    );
    
    const input = getByRole('textbox');
    fireEvent.change(input, { 
      target: { value: '<script>alert("xss")</script><b>Safe</b>' }
    });
    
    await waitFor(() => {
      expect(onChangeMock).toHaveBeenCalledWith('<b>Safe</b>');
      expect(onViolationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'script_tag',
          severity: 'critical'
        })
      );
    });
  });
});
```

### 3. Security Testing

```typescript
// security.test.ts
import { securityPolicyTester } from '../services/securityPolicyTester';

describe('Security Policy Testing', () => {
  test('should block all XSS attack vectors', async () => {
    const testResult = await securityPolicyTester.runSecurityTestSuite([
      ContentType.USER_PROFILE,
      ContentType.PET_CARD_METADATA
    ]);
    
    // Verify all critical attacks are blocked
    const criticalFailures = testResult.results.filter(
      r => r.severity === 'critical' && !r.blocked
    );
    
    expect(criticalFailures).toHaveLength(0);
  });
  
  test('should meet performance requirements', async () => {
    const benchmark = await securityPolicyTester.runPerformanceBenchmark(
      ContentType.USER_PROFILE
    );
    
    expect(benchmark.averageProcessingTime).toBeLessThan(100); // ms
    expect(benchmark.throughput).toBeGreaterThan(50); // ops/sec
  });
});
```

### 4. End-to-End Testing

```typescript
// e2e.test.ts
import { test, expect } from '@playwright/test';

test('user profile sanitization flow', async ({ page }) => {
  await page.goto('/profile');
  
  // Try to input malicious content
  await page.fill('[data-testid="bio-input"]', 
    '<script>alert("xss")</script><p>My bio</p>'
  );
  
  await page.click('[data-testid="save-profile"]');
  
  // Verify sanitized content is saved
  await expect(page.locator('[data-testid="bio-display"]')).toContainText('My bio');
  await expect(page.locator('[data-testid="bio-display"]')).not.toContainText('<script>');
  
  // Verify security event was logged
  const securityEvents = await page.evaluate(() => 
    window.localStorage.getItem('security-events')
  );
  expect(JSON.parse(securityEvents)).toContainEqual(
    expect.objectContaining({
      type: 'script_tag',
      severity: 'critical'
    })
  );
});
```

## Performance Considerations

### 1. Sanitization Performance

Monitor and optimize sanitization performance:

```typescript
import { createSanitizationPerformanceSpan } from '../config/sentry';

async function performanceManagedSanitization(content: string, options?: SanitizeOptions) {
  const span = createSanitizationPerformanceSpan(
    'content_sanitization',
    options?.contentType || ContentType.DEFAULT,
    content.length
  );
  
  try {
    const startTime = performance.now();
    const result = await sanitizationService.sanitizeHTML(content, options);
    const processingTime = performance.now() - startTime;
    
    // Log performance metrics
    span?.setData('processing_time_ms', processingTime);
    span?.setData('content_length', content.length);
    span?.setData('violations_found', result.violations.length);
    
    // Alert on slow operations
    if (processingTime > 200) {
      console.warn(`Slow sanitization: ${processingTime}ms for ${content.length} chars`);
    }
    
    return result;
    
  } finally {
    span?.finish();
  }
}
```

### 2. Caching Strategy

Implement intelligent caching:

```typescript
import { sanitizationCache } from '../services/sanitizationCache';

class PerformantSanitizationService {
  async sanitizeWithCache(content: string, options?: SanitizeOptions) {
    // Generate cache key
    const cacheKey = this.generateCacheKey(content, options);
    
    // Check cache
    const cached = await sanitizationCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Sanitize and cache
    const result = await this.sanitize(content, options);
    
    // Only cache clean content to avoid caching attacks
    if (result.violations.length === 0) {
      await sanitizationCache.set(cacheKey, result, {
        ttl: this.getTTLForContentType(options?.contentType)
      });
    }
    
    return result;
  }
  
  private getTTLForContentType(type?: ContentType): number {
    switch (type) {
      case ContentType.SOCIAL_SHARING: return 3600; // 1 hour
      case ContentType.PET_CARD_METADATA: return 1800; // 30 minutes
      case ContentType.USER_PROFILE: return 900; // 15 minutes
      default: return 600; // 10 minutes
    }
  }
}
```

### 3. Lazy Loading

Implement lazy sanitization for better UX:

```typescript
import { lazySanitizationService } from '../services/lazySanitization';

function LazyContentDisplay({ content }: { content: string }) {
  const [sanitizedContent, setSanitizedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const sanitizeContent = async () => {
      try {
        const result = await lazySanitizationService.sanitizeWhenVisible(content);
        setSanitizedContent(result);
      } catch (error) {
        console.error('Lazy sanitization failed:', error);
        setSanitizedContent(''); // Safe fallback
      } finally {
        setIsLoading(false);
      }
    };
    
    sanitizeContent();
  }, [content]);
  
  if (isLoading) {
    return <div className="sanitization-loading">Processing content...</div>;
  }
  
  return (
    <SafeHTMLDisplay
      content={sanitizedContent}
      fallbackComponent={() => <p>Content unavailable</p>}
    />
  );
}
```

## Debugging and Troubleshooting

### 1. Debug Mode

Enable debug logging for sanitization:

```typescript
// Enable debug mode
localStorage.setItem('sanitization-debug', 'true');

// Or via environment variable
process.env.SANITIZATION_DEBUG = 'true';

// Debug logging will show:
// - Input content (truncated)
// - Sanitization options
// - Processing time
// - Violations found
// - Output content (truncated)
```

### 2. Common Issues

**Issue: Content being over-sanitized**

```typescript
// Check sanitization options
const result = await sanitizationService.sanitizeHTML(content, {
  allowedTags: ['b', 'i', 'em', 'strong', 'p'], // Add missing tags
  allowedAttributes: { 'p': ['class'] }, // Add missing attributes
  stripIgnoreTag: false, // Keep tag content
  stripIgnoreTagBody: [] // Don't strip tag bodies
});

// Debug what was removed
console.log('Removed elements:', result.removedElements);
console.log('Violations:', result.violations);
```

**Issue: Performance problems**

```typescript
// Check content size and complexity
console.log('Content length:', content.length);
console.log('Processing time:', result.processingTime);

// Use performance profiling
const span = createSanitizationPerformanceSpan('debug', ContentType.DEFAULT, content.length);
// ... sanitization code
span?.finish();
```

**Issue: Security violations not being caught**

```typescript
// Verify security policy configuration
const policy = securityPolicyManager.getPolicyForContentType(ContentType.USER_PROFILE);
console.log('Current policy:', policy);

// Test specific attack vectors
const testResult = await securityPolicyTester.runXSSTest({
  name: 'Custom Test',
  payload: suspiciousContent,
  expectedBlocked: true,
  severity: 'high',
  category: 'script_injection'
}, ContentType.USER_PROFILE);

console.log('Test result:', testResult);
```

### 3. Monitoring and Alerts

Set up monitoring for common issues:

```typescript
// Monitor sanitization failures
window.addEventListener('sanitization-error', (event) => {
  console.error('Sanitization error:', event.detail);
  
  // Report to monitoring service
  reportError(event.detail.error, {
    content_length: event.detail.contentLength,
    content_type: event.detail.contentType,
    user_id: getCurrentUserId()
  });
});

// Monitor performance degradation
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('sanitization') && entry.duration > 200) {
      console.warn(`Slow sanitization: ${entry.duration}ms`);
      
      // Alert if consistently slow
      reportPerformanceIssue({
        operation: entry.name,
        duration: entry.duration,
        threshold: 200
      });
    }
  }
});

performanceObserver.observe({ entryTypes: ['measure'] });
```

## Security Best Practices

### 1. Principle of Least Privilege

Only allow the minimum necessary HTML tags and attributes:

```typescript
// ❌ Too permissive
const badOptions = {
  allowedTags: ['*'], // Allows all tags
  allowedAttributes: { '*': ['*'] } // Allows all attributes
};

// ✅ Restrictive and specific
const goodOptions = {
  allowedTags: ['b', 'i', 'em', 'strong'], // Only formatting tags
  allowedAttributes: {}, // No attributes allowed
  stripIgnoreTag: true, // Remove unknown tags
  stripIgnoreTagBody: ['script', 'style'] // Remove dangerous content
};
```

### 2. Content Type Segregation

Use different policies for different content types:

```typescript
const getPolicyForContentType = (type: ContentType) => {
  const policies = {
    [ContentType.USER_PROFILE]: {
      allowedTags: ['b', 'i', 'em', 'strong', 'u', 's', 'br', 'p'],
      allowedAttributes: { 'p': ['class'] }
    },
    [ContentType.PET_CARD_METADATA]: {
      allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br'],
      allowedAttributes: {}
    },
    [ContentType.SOCIAL_SHARING]: {
      allowedTags: [], // Plain text only
      allowedAttributes: {}
    }
  };
  
  return policies[type] || policies[ContentType.SOCIAL_SHARING]; // Safe default
};
```

### 3. Input Validation

Validate input before sanitization:

```typescript
function validateAndSanitize(content: string, options?: SanitizeOptions) {
  // Length validation
  if (content.length > 10000) {
    throw new ValidationError('Content too long');
  }
  
  // Basic format validation
  if (content.includes('javascript:') || content.includes('data:')) {
    throw new SecurityError('Suspicious URL scheme detected');
  }
  
  // Sanitize after validation
  return sanitizationService.sanitizeHTML(content, options);
}
```

### 4. Error Handling

Fail securely when sanitization fails:

```typescript
async function secureSanitization(content: string, options?: SanitizeOptions) {
  try {
    const result = await sanitizationService.sanitizeHTML(content, options);
    
    // Check for critical violations
    const criticalViolations = result.violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      // Log and block
      await reportSecurityViolation(criticalViolations);
      return ''; // Safe fallback
    }
    
    return result.sanitizedContent;
    
  } catch (error) {
    // Log error and fail safely
    console.error('Sanitization failed:', error);
    await reportSanitizationError(error, content);
    return ''; // Safe fallback - empty string
  }
}
```

### 5. Regular Security Testing

Implement continuous security testing:

```typescript
// Run security tests in CI/CD
const runSecurityTests = async () => {
  const testSuite = await securityPolicyTester.runSecurityTestSuite();
  
  // Fail build if critical vulnerabilities found
  const criticalFailures = testSuite.results.filter(
    r => r.severity === 'critical' && !r.blocked
  );
  
  if (criticalFailures.length > 0) {
    throw new Error(`Critical security vulnerabilities found: ${criticalFailures.length}`);
  }
  
  // Generate security report
  const report = securityPolicyTester.generateSecurityReport(testSuite);
  console.log(report);
};

// Schedule regular security audits
setInterval(runSecurityTests, 24 * 60 * 60 * 1000); // Daily
```

## API Reference

### Core Services

#### SanitizationService

```typescript
interface SanitizationService {
  sanitizeHTML(content: string, options?: SanitizeOptions): Promise<SanitizedResult>;
  sanitizeUserProfile(profile: UserProfile): Promise<UserProfile>;
  sanitizePetCardMetadata(metadata: CardMetadata): Promise<CardMetadata>;
  validateContent(content: string): Promise<ValidationResult>;
}
```

#### SecurityPolicyManager

```typescript
interface SecurityPolicyManager {
  static getInstance(): SecurityPolicyManager;
  loadConfiguration(): Promise<SecurityPolicyConfiguration>;
  getConfiguration(): SecurityPolicyConfiguration;
  getPolicyForContentType(contentType: ContentType): DOMPurifyConfig;
  updatePolicy(updateRequest: PolicyUpdateRequest): Promise<PolicyValidationResult>;
  validateConfiguration(config: Partial<SecurityPolicyConfiguration>): PolicyValidationResult;
  calculateRiskLevel(violations: SecurityViolation[]): 'low' | 'medium' | 'high' | 'critical';
  onConfigurationUpdate(callback: Function): () => void;
  resetToDefaults(): void;
}
```

### React Hooks

#### useSanitizedContent

```typescript
interface UseSanitizedContentHook {
  sanitize: (content: string, options?: SanitizeOptions) => string;
  sanitizeAsync: (content: string, options?: SanitizeOptions) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}
```

### Components

#### SanitizedInput

```typescript
interface SanitizedInputProps {
  value: string;
  onChange: (sanitizedValue: string) => void;
  placeholder?: string;
  allowedTags?: string[];
  maxLength?: number;
  onSecurityViolation?: (violation: SecurityViolation) => void;
}
```

#### SafeHTMLDisplay

```typescript
interface SafeHTMLDisplayProps {
  content: string;
  className?: string;
  fallbackComponent?: React.ComponentType;
  onRenderError?: (error: Error) => void;
}
```

### Types

#### SecurityViolation

```typescript
interface SecurityViolation {
  type: 'script_tag' | 'dangerous_attribute' | 'suspicious_pattern';
  originalContent: string;
  sanitizedContent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}
```

#### SanitizedResult

```typescript
interface SanitizedResult {
  sanitizedContent: string;
  originalContent: string;
  removedElements: string[];
  securityViolations: SecurityViolation[];
  processingTime: number;
}
```

## Conclusion

This implementation guide provides the foundation for secure development with the DOMPurify integration. Always prioritize security over convenience, test thoroughly, and monitor continuously for new threats.

For additional support:
- Review the security policy documentation
- Check the incident response procedures
- Run the security test suite regularly
- Monitor Sentry for security alerts

Remember: Security is everyone's responsibility. When in doubt, choose the more restrictive option.