/**
 * Security Policy Manager
 * Handles configurable security policies for different content types
 */

import { 
  SecurityPolicy, 
  DOMPurifyConfig, 
  ContentType, 
  SanitizeOptions,
  ValidationResult,
  SecurityViolation 
} from '../types/sanitization';

// Enhanced security policy configuration
export interface SecurityPolicyConfiguration {
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

// Policy validation result
export interface PolicyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// Runtime policy update interface
export interface PolicyUpdateRequest {
  contentType?: ContentType;
  policy?: Partial<DOMPurifyConfig>;
  riskThresholds?: Partial<SecurityPolicyConfiguration['riskThresholds']>;
  performanceThresholds?: Partial<SecurityPolicyConfiguration['performanceThresholds']>;
  monitoring?: Partial<SecurityPolicyConfiguration['monitoring']>;
}

export class SecurityPolicyManager {
  private static instance: SecurityPolicyManager;
  private configuration: SecurityPolicyConfiguration;
  private configurationPath: string;
  private updateCallbacks: Array<(config: SecurityPolicyConfiguration) => void> = [];

  private constructor(configPath: string = '/config/security-policies.json') {
    this.configurationPath = configPath;
    this.configuration = this.loadDefaultConfiguration();
  }

  public static getInstance(configPath?: string): SecurityPolicyManager {
    if (!SecurityPolicyManager.instance) {
      SecurityPolicyManager.instance = new SecurityPolicyManager(configPath);
    }
    return SecurityPolicyManager.instance;
  }

  /**
   * Load security policy configuration
   */
  public async loadConfiguration(): Promise<SecurityPolicyConfiguration> {
    try {
      // In a real implementation, this would load from file system or API
      // For now, we'll use the default configuration
      const response = await fetch(this.configurationPath);
      if (response.ok) {
        const config = await response.json();
        this.configuration = this.validateAndNormalizeConfiguration(config);
      }
    } catch (error) {
      console.warn('Failed to load security policy configuration, using defaults:', error);
      this.configuration = this.loadDefaultConfiguration();
    }
    
    this.notifyConfigurationUpdate();
    return this.configuration;
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): SecurityPolicyConfiguration {
    return { ...this.configuration };
  }

  /**
   * Get policy for specific content type
   */
  public getPolicyForContentType(contentType: ContentType): DOMPurifyConfig {
    const policyKey = this.mapContentTypeToPolicy(contentType);
    return { ...this.configuration.policies[policyKey] };
  }

  /**
   * Update security policy at runtime
   */
  public async updatePolicy(updateRequest: PolicyUpdateRequest): Promise<PolicyValidationResult> {
    const validationResult = this.validatePolicyUpdate(updateRequest);
    
    if (!validationResult.isValid) {
      return validationResult;
    }

    // Apply updates
    if (updateRequest.contentType && updateRequest.policy) {
      const policyKey = this.mapContentTypeToPolicy(updateRequest.contentType);
      this.configuration.policies[policyKey] = {
        ...this.configuration.policies[policyKey],
        ...updateRequest.policy
      };
    }

    if (updateRequest.riskThresholds) {
      this.configuration.riskThresholds = {
        ...this.configuration.riskThresholds,
        ...updateRequest.riskThresholds
      };
    }

    if (updateRequest.performanceThresholds) {
      this.configuration.performanceThresholds = {
        ...this.configuration.performanceThresholds,
        ...updateRequest.performanceThresholds
      };
    }

    if (updateRequest.monitoring) {
      this.configuration.monitoring = {
        ...this.configuration.monitoring,
        ...updateRequest.monitoring
      };
    }

    // Update timestamp and version
    this.configuration.lastUpdated = new Date().toISOString();
    this.configuration.version = this.incrementVersion(this.configuration.version);

    // Notify listeners
    this.notifyConfigurationUpdate();

    // In a real implementation, persist the configuration
    await this.persistConfiguration();

    return validationResult;
  }

  /**
   * Validate policy configuration
   */
  public validateConfiguration(config: Partial<SecurityPolicyConfiguration>): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate policies structure
    if (config.policies) {
      for (const [policyName, policy] of Object.entries(config.policies)) {
        const policyValidation = this.validateDOMPurifyConfig(policy, policyName);
        errors.push(...policyValidation.errors);
        warnings.push(...policyValidation.warnings);
        recommendations.push(...policyValidation.recommendations);
      }
    }

    // Validate risk thresholds
    if (config.riskThresholds) {
      const thresholds = config.riskThresholds;
      if (thresholds.low && thresholds.medium && thresholds.low >= thresholds.medium) {
        errors.push('Risk threshold: low must be less than medium');
      }
      if (thresholds.medium && thresholds.high && thresholds.medium >= thresholds.high) {
        errors.push('Risk threshold: medium must be less than high');
      }
      if (thresholds.high && thresholds.critical && thresholds.high >= thresholds.critical) {
        errors.push('Risk threshold: high must be less than critical');
      }
    }

    // Validate performance thresholds
    if (config.performanceThresholds) {
      const perf = config.performanceThresholds;
      if (perf.maxProcessingTimeMs !== undefined && perf.maxProcessingTimeMs < 10) {
        warnings.push('Performance: maxProcessingTimeMs is very low, may cause timeouts');
      }
      if (perf.maxContentLength !== undefined && perf.maxContentLength < 100) {
        warnings.push('Performance: maxContentLength is very low, may reject valid content');
      }
      if (perf.maxConcurrentRequests !== undefined && perf.maxConcurrentRequests < 1) {
        errors.push('Performance: maxConcurrentRequests must be at least 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Get sanitization options for content type
   */
  public getSanitizeOptionsForContentType(contentType: ContentType): SanitizeOptions {
    const policy = this.getPolicyForContentType(contentType);
    
    return {
      allowedTags: policy.allowedTags,
      allowedAttributes: policy.allowedAttributes,
      allowedSchemes: policy.allowedSchemes,
      allowedSchemesByTag: policy.allowedSchemesByTag,
      stripIgnoreTag: policy.stripIgnoreTag,
      stripIgnoreTagBody: policy.stripIgnoreTagBody,
      keepContent: policy.keepContent,
      forbidTags: policy.forbidTags,
      forbidAttr: policy.forbidAttr
    };
  }

  /**
   * Calculate risk level based on violations
   */
  public calculateRiskLevel(violations: SecurityViolation[]): 'low' | 'medium' | 'high' | 'critical' {
    if (violations.length === 0) return 'low';

    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;
    const mediumCount = violations.filter(v => v.severity === 'medium').length;

    // If any critical violations exist, return critical
    if (criticalCount > 0) return 'critical';
    
    // If any high violations exist, return high
    if (highCount > 0) return 'high';
    
    // If any medium violations exist, return medium
    if (mediumCount > 0) return 'medium';
    
    // Otherwise return low
    return 'low';
  }

  /**
   * Subscribe to configuration updates
   */
  public onConfigurationUpdate(callback: (config: SecurityPolicyConfiguration) => void): () => void {
    this.updateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Reset to default configuration
   */
  public resetToDefaults(): void {
    this.configuration = this.loadDefaultConfiguration();
    this.notifyConfigurationUpdate();
  }

  // Private methods

  private loadDefaultConfiguration(): SecurityPolicyConfiguration {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      policies: {
        userProfiles: {
          allowedTags: ['b', 'i', 'em', 'strong', 'u', 's', 'br', 'p', 'span'],
          allowedAttributes: {
            span: ['class'],
            p: ['class']
          },
          allowedSchemes: ['http', 'https'],
          allowedSchemesByTag: {},
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style'],
          keepContent: true,
          forbidTags: [
            'script', 'object', 'embed', 'link', 'style', 'img', 'video', 'audio',
            'iframe', 'frame', 'frameset', 'applet', 'base', 'meta', 'title'
          ],
          forbidAttr: [
            'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus',
            'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown',
            'onkeypress', 'onkeyup', 'style', 'background', 'src', 'href'
          ]
        },
        petCardMetadata: {
          allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'span'],
          allowedAttributes: {
            span: ['class']
          },
          allowedSchemes: [],
          allowedSchemesByTag: {},
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style'],
          keepContent: true,
          forbidTags: [
            'script', 'object', 'embed', 'link', 'style', 'img', 'video', 'audio',
            'iframe', 'frame', 'frameset', 'applet', 'base', 'meta', 'title', 'p', 'div'
          ],
          forbidAttr: [
            'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus',
            'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown',
            'onkeypress', 'onkeyup', 'style', 'background', 'src', 'href', 'id'
          ]
        },
        comments: {
          allowedTags: ['b', 'i', 'em', 'strong', 'u', 's', 'br', 'p', 'span', 'blockquote'],
          allowedAttributes: {
            span: ['class'],
            p: ['class'],
            blockquote: ['class']
          },
          allowedSchemes: ['http', 'https'],
          allowedSchemesByTag: {},
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style'],
          keepContent: true,
          forbidTags: [
            'script', 'object', 'embed', 'link', 'style', 'img', 'video', 'audio',
            'iframe', 'frame', 'frameset', 'applet', 'base', 'meta', 'title'
          ],
          forbidAttr: [
            'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus',
            'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown',
            'onkeypress', 'onkeyup', 'style', 'background', 'src', 'href'
          ]
        },
        socialSharing: {
          allowedTags: [],
          allowedAttributes: {},
          allowedSchemes: [],
          allowedSchemesByTag: {},
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style'],
          keepContent: true,
          forbidTags: [
            'script', 'object', 'embed', 'link', 'style', 'img', 'video', 'audio',
            'iframe', 'frame', 'frameset', 'applet', 'base', 'meta', 'title',
            'b', 'i', 'em', 'strong', 'u', 's', 'br', 'p', 'span', 'div'
          ],
          forbidAttr: [
            'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus',
            'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown',
            'onkeypress', 'onkeyup', 'style', 'background', 'src', 'href', 'class', 'id'
          ]
        },
        defaultPolicy: {
          allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br'],
          allowedAttributes: {},
          allowedSchemes: [],
          allowedSchemesByTag: {},
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style'],
          keepContent: true,
          forbidTags: [
            'script', 'object', 'embed', 'link', 'style', 'img', 'video', 'audio',
            'iframe', 'frame', 'frameset', 'applet', 'base', 'meta', 'title'
          ],
          forbidAttr: [
            'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus',
            'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown',
            'onkeypress', 'onkeyup', 'style', 'background', 'src', 'href', 'class', 'id'
          ]
        }
      },
      riskThresholds: {
        low: 0.2,
        medium: 0.5,
        high: 0.8,
        critical: 0.95
      },
      performanceThresholds: {
        maxProcessingTimeMs: 100,
        maxContentLength: 10000,
        maxConcurrentRequests: 50
      },
      monitoring: {
        logSecurityViolations: true,
        alertOnCriticalViolations: true,
        trackPerformanceMetrics: true,
        auditTrailEnabled: true
      }
    };
  }

  private validateAndNormalizeConfiguration(config: any): SecurityPolicyConfiguration {
    const defaultConfig = this.loadDefaultConfiguration();
    
    // Merge with defaults to ensure all required fields are present
    return {
      version: config.version || defaultConfig.version,
      lastUpdated: config.lastUpdated || defaultConfig.lastUpdated,
      policies: { ...defaultConfig.policies, ...config.policies },
      riskThresholds: { ...defaultConfig.riskThresholds, ...config.riskThresholds },
      performanceThresholds: { ...defaultConfig.performanceThresholds, ...config.performanceThresholds },
      monitoring: { ...defaultConfig.monitoring, ...config.monitoring }
    };
  }

  private mapContentTypeToPolicy(contentType: ContentType): keyof SecurityPolicy {
    switch (contentType) {
      case ContentType.USER_PROFILE:
        return 'userProfiles';
      case ContentType.PET_CARD_METADATA:
        return 'petCardMetadata';
      case ContentType.COMMENT:
        return 'comments';
      case ContentType.SOCIAL_SHARING:
        return 'socialSharing';
      default:
        return 'defaultPolicy';
    }
  }

  private validatePolicyUpdate(updateRequest: PolicyUpdateRequest): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (updateRequest.policy && updateRequest.contentType) {
      const policyValidation = this.validateDOMPurifyConfig(
        updateRequest.policy as DOMPurifyConfig, 
        updateRequest.contentType
      );
      errors.push(...policyValidation.errors);
      warnings.push(...policyValidation.warnings);
      recommendations.push(...policyValidation.recommendations);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  private validateDOMPurifyConfig(config: Partial<DOMPurifyConfig>, context: string): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for dangerous combinations
    if (config.allowedTags?.includes('script')) {
      errors.push(`${context}: 'script' tag should never be allowed`);
    }

    if (config.allowedTags?.includes('iframe') && !config.allowedSchemes?.length) {
      warnings.push(`${context}: 'iframe' tag allowed without scheme restrictions`);
    }

    // Check for missing security attributes
    const dangerousEvents = ['onclick', 'onload', 'onerror', 'onmouseover'];
    const forbiddenAttrs = config.forbidAttr || [];
    const missingEvents = dangerousEvents.filter(event => !forbiddenAttrs.includes(event));
    
    if (missingEvents.length > 0) {
      warnings.push(`${context}: Consider forbidding event attributes: ${missingEvents.join(', ')}`);
    }

    // Performance recommendations
    if (config.allowedTags && config.allowedTags.length > 20) {
      recommendations.push(`${context}: Large number of allowed tags may impact performance`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private notifyConfigurationUpdate(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(this.configuration);
      } catch (error) {
        console.error('Error in configuration update callback:', error);
      }
    });
  }

  private async persistConfiguration(): Promise<void> {
    // In a real implementation, this would save to file system or API
    // For now, we'll just log the configuration
    console.log('Security policy configuration updated:', {
      version: this.configuration.version,
      lastUpdated: this.configuration.lastUpdated
    });
  }
}

// Export singleton instance
export const securityPolicyManager = SecurityPolicyManager.getInstance();