/**
 * Web Worker for heavy sanitization tasks
 * Offloads CPU-intensive sanitization to prevent blocking the main thread
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Worker message types
interface SanitizationMessage {
  id: string;
  type: 'sanitize' | 'batch_sanitize' | 'stream_chunk';
  payload: {
    content: string;
    options?: any;
    contentType?: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

interface SanitizationResponse {
  id: string;
  type: 'result' | 'error' | 'progress';
  payload: any;
}

// Setup DOMPurify for worker environment
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Configure DOMPurify for worker
purify.setConfig({
  WHOLE_DOCUMENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false,
  SANITIZE_DOM: true,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false
});

// Default security policies for different content types
const securityPolicies = {
  user_profile: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'i'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur']
  },
  pet_card_metadata: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'a'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'href']
  },
  comment: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'blockquote'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur']
  },
  social_sharing: {
    ALLOWED_TAGS: ['p', 'br'],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'a'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'href']
  },
  general: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'i', 'blockquote', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur']
  }
};

/**
 * Analyze content for security violations
 */
function analyzeSecurityViolations(content: string): any[] {
  const violations: any[] = [];
  
  // Check for script tags
  const scriptTagRegex = /<script[^>]*>.*?<\/script>/gi;
  const scriptMatches = content.match(scriptTagRegex);
  if (scriptMatches) {
    scriptMatches.forEach(match => {
      violations.push({
        type: 'script_tag',
        originalContent: match,
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'critical',
        description: 'Removed dangerous script tag'
      });
    });
  }

  // Check for dangerous attributes
  const dangerousAttrRegex = /\s(on\w+|javascript:|data:|vbscript:)/gi;
  const attrMatches = content.match(dangerousAttrRegex);
  if (attrMatches) {
    attrMatches.forEach(match => {
      violations.push({
        type: 'dangerous_attribute',
        originalContent: match.trim(),
        sanitizedContent: '',
        timestamp: new Date(),
        severity: match.toLowerCase().includes('javascript:') ? 'high' : 'medium',
        description: `Removed dangerous attribute: ${match.trim()}`
      });
    });
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];

  suspiciousPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        violations.push({
          type: 'suspicious_pattern',
          originalContent: match,
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'medium',
          description: `Detected suspicious pattern: ${match}`
        });
      });
    }
  });

  return violations;
}

/**
 * Detect removed elements by comparing original and sanitized content
 */
function detectRemovedElements(original: string, sanitized: string): string[] {
  const removedElements: string[] = [];
  
  const originalTags = original.match(/<\/?[^>]+>/g) || [];
  const sanitizedTags = sanitized.match(/<\/?[^>]+>/g) || [];
  
  const originalTagNames = originalTags.map(tag => tag.replace(/<\/?([^\s>]+).*?>/g, '$1').toLowerCase());
  const sanitizedTagNames = sanitizedTags.map(tag => tag.replace(/<\/?([^\s>]+).*?>/g, '$1').toLowerCase());
  
  originalTagNames.forEach(tagName => {
    if (!sanitizedTagNames.includes(tagName) && !removedElements.includes(tagName)) {
      removedElements.push(tagName);
    }
  });
  
  return removedElements;
}

/**
 * Sanitize content using DOMPurify
 */
function sanitizeContent(content: string, contentType: string = 'general', options: any = {}): any {
  const startTime = performance.now();
  
  try {
    if (!content || typeof content !== 'string') {
      return {
        sanitizedContent: '',
        originalContent: content || '',
        removedElements: [],
        securityViolations: [],
        processingTime: performance.now() - startTime,
        isValid: true
      };
    }

    // Get policy for content type
    const policy = securityPolicies[contentType as keyof typeof securityPolicies] || securityPolicies.general;
    
    // Merge with custom options
    const config = {
      ...policy,
      ...options
    };

    // Pre-sanitization analysis for security violations
    const securityViolations = analyzeSecurityViolations(content);
    
    // Perform sanitization
    const sanitizedContent = purify.sanitize(content, config);
    
    const processingTime = performance.now() - startTime;
    
    // Determine removed elements
    const removedElements = detectRemovedElements(content, sanitizedContent);

    return {
      sanitizedContent,
      originalContent: content,
      removedElements,
      securityViolations,
      processingTime,
      isValid: securityViolations.length === 0
    };

  } catch (error) {
    const criticalViolation = {
      type: 'suspicious_pattern',
      originalContent: content,
      sanitizedContent: '',
      timestamp: new Date(),
      severity: 'critical',
      description: `Sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };

    return {
      sanitizedContent: '', // Fail secure
      originalContent: content,
      removedElements: [],
      securityViolations: [criticalViolation],
      processingTime: performance.now() - startTime,
      isValid: false
    };
  }
}

/**
 * Handle worker messages
 */
self.onmessage = function(event: MessageEvent<SanitizationMessage>) {
  const { id, type, payload } = event.data;
  
  try {
    switch (type) {
      case 'sanitize':
        const result = sanitizeContent(payload.content, payload.contentType, payload.options);
        
        const response: SanitizationResponse = {
          id,
          type: 'result',
          payload: result
        };
        
        self.postMessage(response);
        break;
        
      case 'batch_sanitize':
        // Handle batch sanitization
        const batchResults = [];
        const items = payload.content; // Expecting array of items
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemResult = sanitizeContent(item.content, item.contentType, item.options);
          batchResults.push(itemResult);
          
          // Send progress update
          if (i % 5 === 0 || i === items.length - 1) {
            const progressResponse: SanitizationResponse = {
              id,
              type: 'progress',
              payload: {
                completed: i + 1,
                total: items.length,
                progress: ((i + 1) / items.length) * 100
              }
            };
            self.postMessage(progressResponse);
          }
        }
        
        const batchResponse: SanitizationResponse = {
          id,
          type: 'result',
          payload: batchResults
        };
        
        self.postMessage(batchResponse);
        break;
        
      case 'stream_chunk':
        const chunkResult = sanitizeContent(payload.content, payload.contentType, payload.options);
        
        const chunkResponse: SanitizationResponse = {
          id,
          type: 'result',
          payload: {
            ...chunkResult,
            chunkIndex: payload.chunkIndex,
            totalChunks: payload.totalChunks
          }
        };
        
        self.postMessage(chunkResponse);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
  } catch (error) {
    const errorResponse: SanitizationResponse = {
      id,
      type: 'error',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    };
    
    self.postMessage(errorResponse);
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('Worker error:', error);
};

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', function(event) {
  console.error('Worker unhandled rejection:', event.reason);
});

export {}; // Make this a module