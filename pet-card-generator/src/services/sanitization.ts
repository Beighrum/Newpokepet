/**
 * Client-side sanitization service using DOMPurify
 */

import DOMPurify from 'dompurify';
import {
  SanitizeOptions,
  SanitizedResult,
  ValidationResult,
  SecurityViolation,
  ContentType,
  DOMPurifyConfig,
  SecurityPolicy
} from '../types/sanitization';
import { SecurityEventContext } from '../types/security-logging';
import { securityEventLogger } from './securityEventLogger';
import { securityPolicyManager } from './securityPolicyManager';
import { sanitizationCache } from './sanitizationCache';
import { lazySanitizationService } from './lazySanitization';
import { workerSanitizationService } from './workerSanitizationService';

// Setup DOMPurify for different environments
function createDOMPurify() {
  if (typeof window !== 'undefined') {
    // Browser environment
    return DOMPurify;
  } else {
    // Node.js environment - try to use jsdom
    try {
      // Dynamic import for jsdom in Node.js environment
      const jsdom = require('jsdom');
      const { JSDOM } = jsdom;
      const window = new JSDOM('').window;
      return DOMPurify(window as any);
    } catch (error) {
      console.warn('jsdom not available, using fallback sanitization');
      // Return a mock DOMPurify for testing
      return {
        sanitize: (content: string) => {
          // Basic fallback sanitization - remove script tags and dangerous attributes
          return content
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/\s(on\w+|javascript:|data:|vbscript:)[^>\s]*/gi, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
            .replace(/<object[^>]*>.*?<\/object>/gi, '')
            .replace(/<embed[^>]*>/gi, '');
        }
      };
    }
  }
}

class ClientSanitizationService {
  private purify: any;

  constructor() {
    this.purify = createDOMPurify();
    
    // Configure DOMPurify for client-side use
    this.configureDOMPurify();
    
    // Initialize security policy manager
    this.initializePolicyManager();
  }

  private async initializePolicyManager(): Promise<void> {
    try {
      await securityPolicyManager.loadConfiguration();
    } catch (error) {
      console.warn('Failed to initialize security policy manager:', error);
    }
  }

  private configureDOMPurify(): void {
    // Set up global DOMPurify configuration
    // Note: setConfig is not available in all DOMPurify versions, so we skip it
    // Configuration will be passed per-sanitization call instead
    if (typeof DOMPurify.setConfig === 'function') {
      DOMPurify.setConfig({
        WHOLE_DOCUMENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false,
        SANITIZE_DOM: true,
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false
      });
    }
  }

  /**
   * Get DOMPurify configuration for specific content type
   */
  getConfigForContentType(contentType: ContentType): DOMPurifyConfig {
    return securityPolicyManager.getPolicyForContentType(contentType);
  }

  /**
   * Synchronous HTML sanitization with caching
   */
  sanitizeSync(content: string, options?: SanitizeOptions, context?: SecurityEventContext): SanitizedResult {
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

      // Check cache first
      const contentType = context?.contentType || ContentType.GENERAL;
      const cachedResult = sanitizationCache.get(content, options, contentType);
      
      if (cachedResult) {
        // Update processing time to include cache lookup time
        const cacheResult = {
          ...cachedResult,
          processingTime: performance.now() - startTime
        };

        // Still log security events if violations found and context provided
        if (cachedResult.securityViolations.length > 0 && context) {
          this.logSecurityEvent(cachedResult.securityViolations, {
            ...context,
            originalContent: content,
            sanitizedContent: cachedResult.sanitizedContent
          });
        }

        // Log sanitization action for audit trail
        if (context) {
          this.logSanitizationAction(cacheResult, context);
        }

        return cacheResult;
      }

      // Prepare configuration
      const config = this.prepareDOMPurifyConfig(options);
      
      // Pre-sanitization analysis for security violations
      const securityViolations = this.analyzeSecurityViolations(content);
      
      // Perform sanitization
      const sanitizedContent = this.purify.sanitize(content, config);
      
      const processingTime = performance.now() - startTime;
      
      // Check performance threshold
      const performanceThresholds = securityPolicyManager.getConfiguration().performanceThresholds;
      if (processingTime > performanceThresholds.maxProcessingTimeMs) {
        console.warn(`Sanitization took ${processingTime}ms, exceeding threshold of ${performanceThresholds.maxProcessingTimeMs}ms`);
      }

      // Determine removed elements by comparing original and sanitized content
      const removedElements = this.detectRemovedElements(content, sanitizedContent);

      const result = {
        sanitizedContent,
        originalContent: content,
        removedElements,
        securityViolations,
        processingTime,
        isValid: securityViolations.length === 0
      };

      // Cache the result
      sanitizationCache.set(content, result, options, contentType);

      // Log security events if violations found and context provided
      if (securityViolations.length > 0 && context) {
        this.logSecurityEvent(securityViolations, {
          ...context,
          originalContent: content,
          sanitizedContent
        });
      }

      // Log sanitization action for audit trail
      if (context) {
        this.logSanitizationAction(result, context);
      }

      return result;

    } catch (error) {
      console.error('Sanitization error:', error);
      
      const criticalViolation = {
        type: 'suspicious_pattern' as const,
        originalContent: content,
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'critical' as const,
        description: `Sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      const result = {
        sanitizedContent: '', // Fail secure - return empty string
        originalContent: content,
        removedElements: [],
        securityViolations: [criticalViolation],
        processingTime: performance.now() - startTime,
        isValid: false
      };

      // Log critical security event
      if (context) {
        this.logSecurityEvent([criticalViolation], {
          ...context,
          originalContent: content,
          sanitizedContent: ''
        });
      }

      return result;
    }
  }

  /**
   * Analyze content for security violations before sanitization
   */
  private analyzeSecurityViolations(content: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    
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
  private detectRemovedElements(original: string, sanitized: string): string[] {
    const removedElements: string[] = [];
    
    // Simple detection of removed tags
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
   * Asynchronous HTML sanitization
   */
  async sanitizeHTML(content: string, options?: SanitizeOptions): Promise<SanitizedResult> {
    return new Promise((resolve) => {
      // Use setTimeout to make it async and prevent blocking
      setTimeout(() => {
        resolve(this.sanitizeSync(content, options));
      }, 0);
    });
  }

  /**
   * Validate content without sanitizing
   */
  async validateContent(content: string, contentType: ContentType = ContentType.GENERAL): Promise<ValidationResult> {
    const config = this.getConfigForContentType(contentType);
    const result = this.sanitizeSync(content, config);
    
    let riskLevel: ValidationResult['riskLevel'] = 'low';
    if (result.securityViolations.length > 0) {
      const criticalViolations = result.securityViolations.filter(v => v.severity === 'critical');
      const highViolations = result.securityViolations.filter(v => v.severity === 'high');
      
      if (criticalViolations.length > 0) {
        riskLevel = 'critical';
      } else if (highViolations.length > 0) {
        riskLevel = 'high';
      } else {
        riskLevel = 'medium';
      }
    }
    
    let recommendedAction: ValidationResult['recommendedAction'] = 'allow';
    if (riskLevel === 'critical') {
      recommendedAction = 'block';
    } else if (riskLevel === 'high') {
      recommendedAction = 'flag';
    } else if (riskLevel === 'medium') {
      recommendedAction = 'sanitize';
    }
    
    return {
      isValid: result.isValid,
      violations: result.securityViolations,
      riskLevel,
      recommendedAction,
      confidence: result.isValid ? 0.95 : Math.max(0.1, 1 - (result.securityViolations.length * 0.2))
    };
  }

  /**
   * Update security policy
   */
  updateSecurityPolicy(policy: Partial<SecurityPolicy>): void {
    console.warn('Direct policy updates are deprecated. Use SecurityPolicyManager.updatePolicy() instead.');
    // Invalidate cache when policy changes
    sanitizationCache.invalidateOnConfigChange();
  }

  /**
   * Clear sanitization cache
   */
  clearCache(): void {
    sanitizationCache.clear('manual');
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics() {
    return sanitizationCache.getMetrics();
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return sanitizationCache.getStatistics();
  }

  /**
   * Lazy sanitize content with batch processing
   */
  async lazySanitize(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType,
    priority: number = 1
  ): Promise<SanitizedResult> {
    return lazySanitizationService.lazySanitize(content, options, contentType, priority);
  }

  /**
   * Batch sanitize multiple content items
   */
  async batchSanitize(
    items: Array<{
      content: string;
      options?: SanitizeOptions;
      contentType?: ContentType;
      priority?: number;
    }>
  ): Promise<SanitizedResult[]> {
    return lazySanitizationService.batchSanitize(items);
  }

  /**
   * Stream sanitize large content
   */
  async streamSanitize(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType,
    onProgress?: (progress: number, chunk: string) => void
  ): Promise<SanitizedResult> {
    return lazySanitizationService.streamSanitize(content, options, contentType, onProgress);
  }

  /**
   * Sanitize using web worker for heavy tasks
   */
  async sanitizeWithWorker(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType
  ): Promise<SanitizedResult> {
    if (!workerSanitizationService.isWorkerAvailable()) {
      // Fallback to regular sanitization if worker is not available
      return this.sanitizeHTML(content, options);
    }
    
    return workerSanitizationService.sanitizeWithWorker(content, options, contentType);
  }

  /**
   * Batch sanitize using web worker
   */
  async batchSanitizeWithWorker(
    items: Array<{
      content: string;
      options?: SanitizeOptions;
      contentType?: ContentType;
    }>,
    onProgress?: (progress: { completed: number; total: number; progress: number }) => void
  ): Promise<SanitizedResult[]> {
    if (!workerSanitizationService.isWorkerAvailable()) {
      // Fallback to regular batch sanitization
      return this.batchSanitize(items);
    }
    
    return workerSanitizationService.batchSanitizeWithWorker(items, onProgress);
  }

  /**
   * Stream sanitize using web worker
   */
  async streamSanitizeWithWorker(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType,
    chunkSize: number = 1000,
    onProgress?: (progress: number, chunk: SanitizedResult) => void
  ): Promise<SanitizedResult> {
    if (!workerSanitizationService.isWorkerAvailable()) {
      // Fallback to regular stream sanitization
      return this.streamSanitize(content, options, contentType, onProgress);
    }
    
    return workerSanitizationService.streamSanitizeWithWorker(
      content,
      options,
      contentType,
      chunkSize,
      onProgress
    );
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      cache: this.getCacheStatistics(),
      queue: lazySanitizationService.getQueueStats(),
      worker: workerSanitizationService.getWorkerStats()
    };
  }

  /**
   * Update lazy sanitization configuration
   */
  updateLazyConfig(batchConfig?: any, streamingConfig?: any) {
    if (batchConfig) {
      lazySanitizationService.updateBatchConfig(batchConfig);
    }
    if (streamingConfig) {
      lazySanitizationService.updateStreamingConfig(streamingConfig);
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(violations: SecurityViolation[], context: SecurityEventContext): Promise<void> {
    try {
      await securityEventLogger.logSecurityEventWithContext(violations, context);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log sanitization action for audit trail
   */
  private async logSanitizationAction(result: SanitizedResult, context: SecurityEventContext): Promise<void> {
    try {
      const action = result.isValid ? 'sanitize' : 'block';
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (result.securityViolations.length > 0) {
        const criticalViolations = result.securityViolations.filter(v => v.severity === 'critical');
        const highViolations = result.securityViolations.filter(v => v.severity === 'high');
        
        if (criticalViolations.length > 0) {
          riskLevel = 'critical';
        } else if (highViolations.length > 0) {
          riskLevel = 'high';
        } else {
          riskLevel = 'medium';
        }
      }

      await securityEventLogger.logSanitizationAction(
        action,
        context,
        result.securityViolations,
        result.processingTime,
        riskLevel
      );
    } catch (error) {
      console.error('Failed to log sanitization action:', error);
    }
  }

  private prepareDOMPurifyConfig(options?: SanitizeOptions): any {
    const defaultPolicy = securityPolicyManager.getPolicyForContentType(ContentType.GENERAL);
    
    if (!options) {
      return {
        ALLOWED_TAGS: defaultPolicy.allowedTags,
        ALLOWED_ATTR: Object.values(defaultPolicy.allowedAttributes).flat(),
        ALLOWED_URI_REGEXP: defaultPolicy.allowedSchemes.length > 0 ? 
          new RegExp(`^(${defaultPolicy.allowedSchemes.join('|')}):`, 'i') : /^$/,
        FORBID_TAGS: defaultPolicy.forbidTags,
        FORBID_ATTR: defaultPolicy.forbidAttr,
        KEEP_CONTENT: defaultPolicy.keepContent,
        STRIP_IGNORE_TAG: defaultPolicy.stripIgnoreTag,
        STRIP_IGNORE_TAG_BODY: defaultPolicy.stripIgnoreTagBody,
        WHOLE_DOCUMENT: false,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false,
        SANITIZE_DOM: true,
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false
      };
    }

    return {
      ALLOWED_TAGS: options.allowedTags || defaultPolicy.allowedTags,
      ALLOWED_ATTR: options.allowedAttributes ? 
        Object.values(options.allowedAttributes).flat() : 
        Object.values(defaultPolicy.allowedAttributes).flat(),
      ALLOWED_URI_REGEXP: options.allowedSchemes && options.allowedSchemes.length > 0 ? 
        new RegExp(`^(${options.allowedSchemes.join('|')}):`, 'i') : 
        /^$/,
      FORBID_TAGS: defaultPolicy.forbidTags,
      FORBID_ATTR: defaultPolicy.forbidAttr,
      KEEP_CONTENT: options.keepContent ?? defaultPolicy.keepContent,
      STRIP_IGNORE_TAG: options.stripIgnoreTag ?? defaultPolicy.stripIgnoreTag,
      STRIP_IGNORE_TAG_BODY: options.stripIgnoreTagBody || defaultPolicy.stripIgnoreTagBody,
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_TRUSTED_TYPE: false,
      SANITIZE_DOM: true,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false
    };
  }
}

// Export singleton instance
export const sanitizationService = new ClientSanitizationService();
export default sanitizationService;