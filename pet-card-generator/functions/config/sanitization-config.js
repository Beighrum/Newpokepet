/**
 * Server-side sanitization configuration for Firebase Functions
 * Uses DOMPurify with jsdom for Node.js environment
 */

const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

// Create a jsdom window for DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Load security policies
const securityPolicies = require('../../config/security-policies.json');

/**
 * Get DOMPurify configuration for specific content type
 * @param {string} contentType - Type of content to sanitize
 * @returns {Object} DOMPurify configuration
 */
function getDOMPurifyConfig(contentType = 'defaultPolicy') {
  const policy = securityPolicies.policies[contentType] || securityPolicies.policies.defaultPolicy;
  
  return {
    ALLOWED_TAGS: policy.allowedTags,
    ALLOWED_ATTR: Object.keys(policy.allowedAttributes).reduce((acc, tag) => {
      return acc.concat(policy.allowedAttributes[tag]);
    }, []),
    ALLOWED_URI_REGEXP: policy.allowedSchemes.length > 0 
      ? new RegExp(`^(${policy.allowedSchemes.join('|')}):`, 'i')
      : /^$/,
    FORBID_TAGS: policy.forbidTags,
    FORBID_ATTR: policy.forbidAttr,
    KEEP_CONTENT: policy.keepContent,
    STRIP_IGNORE_TAG: policy.stripIgnoreTag,
    STRIP_IGNORE_TAG_BODY: policy.stripIgnoreTagBody,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
    SANITIZE_DOM: true,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false
  };
}

/**
 * Sanitize HTML content using DOMPurify
 * @param {string} content - HTML content to sanitize
 * @param {string} contentType - Type of content for policy selection
 * @returns {Object} Sanitization result
 */
function sanitizeHTML(content, contentType = 'defaultPolicy') {
  const startTime = Date.now();
  
  try {
    if (!content || typeof content !== 'string') {
      return {
        sanitizedContent: '',
        originalContent: content || '',
        removedElements: [],
        securityViolations: [],
        processingTime: Date.now() - startTime,
        isValid: true
      };
    }

    const config = getDOMPurifyConfig(contentType);
    
    // Pre-sanitization analysis for security violations
    const securityViolations = analyzeSecurityViolations(content);
    
    // Perform sanitization
    const sanitizedContent = DOMPurify.sanitize(content, config);
    
    // Determine removed elements by comparing original and sanitized content
    const removedElements = detectRemovedElements(content, sanitizedContent);
    
    const processingTime = Date.now() - startTime;
    
    // Check performance threshold
    if (processingTime > securityPolicies.performanceThresholds.maxProcessingTimeMs) {
      console.warn(`Sanitization took ${processingTime}ms, exceeding threshold of ${securityPolicies.performanceThresholds.maxProcessingTimeMs}ms`);
    }

    return {
      sanitizedContent,
      originalContent: content,
      removedElements: [...new Set(removedElements)], // Remove duplicates
      securityViolations,
      processingTime,
      isValid: securityViolations.length === 0
    };

  } catch (error) {
    console.error('Sanitization error:', error);
    
    return {
      sanitizedContent: '', // Fail secure - return empty string
      originalContent: content,
      removedElements: [],
      securityViolations: [{
        type: 'suspicious_pattern',
        originalContent: content,
        sanitizedContent: '',
        timestamp: new Date(),
        severity: 'critical',
        description: `Sanitization failed: ${error.message}`
      }],
      processingTime: Date.now() - startTime,
      isValid: false
    };
  }
}

/**
 * Validate content without sanitizing
 * @param {string} content - Content to validate
 * @param {string} contentType - Type of content for policy selection
 * @returns {Object} Validation result
 */
function validateContent(content, contentType = 'defaultPolicy') {
  const result = sanitizeHTML(content, contentType);
  
  let riskLevel = 'low';
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
  
  let recommendedAction = 'allow';
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
 * Get security policy for content type
 * @param {string} contentType - Type of content
 * @returns {Object} Security policy configuration
 */
function getSecurityPolicy(contentType = 'defaultPolicy') {
  return securityPolicies.policies[contentType] || securityPolicies.policies.defaultPolicy;
}

/**
 * Analyze content for security violations before sanitization
 * @param {string} content - Content to analyze
 * @returns {Array} Array of security violations
 */
function analyzeSecurityViolations(content) {
  const violations = [];
  
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
 * @param {string} original - Original content
 * @param {string} sanitized - Sanitized content
 * @returns {Array} Array of removed element names
 */
function detectRemovedElements(original, sanitized) {
  const removedElements = [];
  
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
 * Update security policies (for runtime configuration updates)
 * @param {Object} newPolicies - New policy configurations
 */
function updateSecurityPolicies(newPolicies) {
  Object.assign(securityPolicies.policies, newPolicies);
  console.log('Security policies updated:', Object.keys(newPolicies));
}

module.exports = {
  sanitizeHTML,
  validateContent,
  getSecurityPolicy,
  updateSecurityPolicies,
  getDOMPurifyConfig,
  DOMPurify,
  securityPolicies
};