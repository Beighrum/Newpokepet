/**
 * Profile content validation service
 * Provides real-time validation, user-friendly error messages, and content suggestions
 */

import { 
  userProfileSanitizationService,
  UserProfile,
  UserProfileValidationResult
} from './userProfileSanitization';
import { ValidationResult, SecurityViolation } from '../types/sanitization';

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info' | 'success';
  field: 'displayName' | 'bio' | 'general';
  message: string;
  suggestion?: string;
  canProceed: boolean;
}

export interface ContentSuggestion {
  original: string;
  suggested: string;
  reason: string;
  type: 'formatting' | 'security' | 'length' | 'content';
}

export interface ProfileValidationState {
  isValid: boolean;
  canSave: boolean;
  messages: ValidationMessage[];
  suggestions: ContentSuggestion[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  previewContent: {
    displayName: string;
    bio: string;
  };
}

export interface RealTimeValidationOptions {
  debounceMs?: number;
  showSuggestions?: boolean;
  strictMode?: boolean;
  maxDisplayNameLength?: number;
  maxBioLength?: number;
}

class ProfileContentValidationService {
  private readonly DEFAULT_OPTIONS: Required<RealTimeValidationOptions> = {
    debounceMs: 300,
    showSuggestions: true,
    strictMode: false,
    maxDisplayNameLength: 50,
    maxBioLength: 500
  };

  /**
   * Validate profile content in real-time
   */
  async validateProfileContent(
    displayName: string,
    bio: string = '',
    options: RealTimeValidationOptions = {}
  ): Promise<ProfileValidationState> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // Create temporary profile for validation
      const tempProfile: UserProfile = {
        id: 'temp',
        email: 'temp@example.com',
        displayName: displayName.trim(),
        bio: bio.trim(),
        createdAt: new Date()
      };

      // Validate the profile
      const validationResult = await userProfileSanitizationService.validateUserProfile(tempProfile);
      
      // Generate user-friendly messages
      const messages = this.generateValidationMessages(validationResult, opts);
      
      // Generate content suggestions
      const suggestions = this.generateContentSuggestions(displayName, bio, validationResult);
      
      // Generate preview content (sanitized)
      const previewContent = await this.generatePreviewContent(displayName, bio);
      
      // Determine if user can save
      const canSave = this.determineCanSave(validationResult, messages, opts.strictMode);

      return {
        isValid: validationResult.isValid,
        canSave,
        messages,
        suggestions: opts.showSuggestions ? suggestions : [],
        riskLevel: validationResult.overallRiskLevel,
        previewContent
      };
    } catch (error) {
      return {
        isValid: false,
        canSave: false,
        messages: [{
          type: 'error',
          field: 'general',
          message: 'Validation failed. Please try again.',
          canProceed: false
        }],
        suggestions: [],
        riskLevel: 'critical',
        previewContent: {
          displayName: '',
          bio: ''
        }
      };
    }
  }

  /**
   * Validate display name only
   */
  async validateDisplayName(
    displayName: string,
    options: RealTimeValidationOptions = {}
  ): Promise<{
    isValid: boolean;
    messages: ValidationMessage[];
    suggestions: ContentSuggestion[];
    preview: string;
  }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // Basic length validation
      const lengthMessages = this.validateDisplayNameLength(displayName, opts.maxDisplayNameLength);
      
      if (lengthMessages.length > 0) {
        return {
          isValid: false,
          messages: lengthMessages,
          suggestions: [],
          preview: displayName.substring(0, opts.maxDisplayNameLength)
        };
      }

      // Sanitization validation
      const sanitizationResult = await userProfileSanitizationService.sanitizeDisplayName(displayName);
      
      const messages = this.generateDisplayNameMessages(sanitizationResult);
      const suggestions = this.generateDisplayNameSuggestions(displayName, sanitizationResult);
      
      return {
        isValid: sanitizationResult.isValid,
        messages,
        suggestions: opts.showSuggestions ? suggestions : [],
        preview: sanitizationResult.sanitizedContent
      };
    } catch (error) {
      return {
        isValid: false,
        messages: [{
          type: 'error',
          field: 'displayName',
          message: error instanceof Error ? error.message : 'Display name validation failed',
          canProceed: false
        }],
        suggestions: [],
        preview: ''
      };
    }
  }

  /**
   * Validate bio content only
   */
  async validateBio(
    bio: string,
    options: RealTimeValidationOptions = {}
  ): Promise<{
    isValid: boolean;
    messages: ValidationMessage[];
    suggestions: ContentSuggestion[];
    preview: string;
  }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // Basic length validation
      const lengthMessages = this.validateBioLength(bio, opts.maxBioLength);
      
      if (lengthMessages.length > 0) {
        return {
          isValid: false,
          messages: lengthMessages,
          suggestions: [],
          preview: bio.substring(0, opts.maxBioLength)
        };
      }

      // Sanitization validation
      const sanitizationResult = await userProfileSanitizationService.sanitizeBio(bio);
      
      const messages = this.generateBioMessages(sanitizationResult);
      const suggestions = this.generateBioSuggestions(bio, sanitizationResult);
      
      return {
        isValid: sanitizationResult.isValid,
        messages,
        suggestions: opts.showSuggestions ? suggestions : [],
        preview: sanitizationResult.sanitizedContent
      };
    } catch (error) {
      return {
        isValid: false,
        messages: [{
          type: 'error',
          field: 'bio',
          message: error instanceof Error ? error.message : 'Bio validation failed',
          canProceed: false
        }],
        suggestions: [],
        preview: ''
      };
    }
  }

  /**
   * Get content formatting suggestions
   */
  getFormattingSuggestions(): {
    displayName: string[];
    bio: string[];
  } {
    return {
      displayName: [
        'Use only letters, numbers, and basic punctuation',
        'Keep it under 50 characters',
        'Avoid special characters like <, >, &',
        'Basic formatting like **bold** and *italic* is allowed'
      ],
      bio: [
        'You can use basic HTML formatting: <b>bold</b>, <i>italic</i>, <em>emphasis</em>',
        'Line breaks are allowed with <br> tags',
        'Paragraphs can be wrapped in <p> tags',
        'Keep it under 500 characters',
        'Avoid scripts, links, and images for security',
        'Use <span class="highlight"> for highlighting text'
      ]
    };
  }

  /**
   * Generate user-friendly validation messages
   */
  private generateValidationMessages(
    validationResult: UserProfileValidationResult,
    options: Required<RealTimeValidationOptions>
  ): ValidationMessage[] {
    const messages: ValidationMessage[] = [];

    // Display name messages
    if (validationResult.fieldValidations.displayName) {
      const displayNameMessages = this.generateFieldMessages(
        'displayName',
        validationResult.fieldValidations.displayName,
        options.strictMode
      );
      messages.push(...displayNameMessages);
    }

    // Bio messages
    if (validationResult.fieldValidations.bio) {
      const bioMessages = this.generateFieldMessages(
        'bio',
        validationResult.fieldValidations.bio,
        options.strictMode
      );
      messages.push(...bioMessages);
    }

    // Overall risk level message
    if (validationResult.overallRiskLevel !== 'low') {
      messages.push({
        type: validationResult.overallRiskLevel === 'critical' ? 'error' : 'warning',
        field: 'general',
        message: this.getRiskLevelMessage(validationResult.overallRiskLevel),
        canProceed: validationResult.overallRiskLevel !== 'critical'
      });
    }

    // Success message if everything is valid
    if (validationResult.isValid && messages.length === 0) {
      messages.push({
        type: 'success',
        field: 'general',
        message: 'Profile content looks good!',
        canProceed: true
      });
    }

    return messages;
  }

  /**
   * Generate field-specific validation messages
   */
  private generateFieldMessages(
    field: 'displayName' | 'bio',
    validation: ValidationResult,
    strictMode: boolean
  ): ValidationMessage[] {
    const messages: ValidationMessage[] = [];

    if (!validation.isValid && validation.violations.length > 0) {
      validation.violations.forEach(violation => {
        const message = this.getViolationMessage(field, violation);
        const canProceed = !strictMode && violation.severity !== 'critical';
        
        messages.push({
          type: violation.severity === 'critical' ? 'error' : 'warning',
          field,
          message: message.text,
          suggestion: message.suggestion,
          canProceed
        });
      });
    }

    return messages;
  }

  /**
   * Get user-friendly violation messages
   */
  private getViolationMessage(
    field: 'displayName' | 'bio',
    violation: SecurityViolation
  ): { text: string; suggestion?: string } {
    const fieldName = field === 'displayName' ? 'display name' : 'bio';
    
    switch (violation.type) {
      case 'script_tag':
        return {
          text: `Script tags are not allowed in your ${fieldName} for security reasons.`,
          suggestion: 'Remove any <script> tags and use plain text or basic formatting instead.'
        };
      
      case 'dangerous_attribute':
        return {
          text: `Dangerous attributes detected in your ${fieldName}.`,
          suggestion: 'Remove onclick, onload, and other event handlers. Use basic HTML tags only.'
        };
      
      case 'suspicious_pattern':
        if (violation.description?.includes('administrative terms')) {
          return {
            text: `Your ${fieldName} contains administrative terms that may be misleading.`,
            suggestion: 'Consider using a different name that doesn\'t imply special privileges.'
          };
        }
        if (violation.description?.includes('profanity')) {
          return {
            text: `Please keep your ${fieldName} family-friendly.`,
            suggestion: 'Remove or replace inappropriate language.'
          };
        }
        return {
          text: `Suspicious content detected in your ${fieldName}.`,
          suggestion: 'Please review and remove any potentially harmful content.'
        };
      
      default:
        return {
          text: `Content issue detected in your ${fieldName}.`,
          suggestion: 'Please review and modify the content.'
        };
    }
  }

  /**
   * Generate content suggestions
   */
  private generateContentSuggestions(
    displayName: string,
    bio: string,
    validationResult: UserProfileValidationResult
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    // Display name suggestions
    if (validationResult.fieldValidations.displayName?.violations.length > 0) {
      const displayNameSuggestions = this.generateDisplayNameSuggestions(
        displayName,
        { 
          sanitizedContent: displayName,
          originalContent: displayName,
          securityViolations: validationResult.fieldValidations.displayName.violations,
          removedElements: [],
          processingTime: 0,
          isValid: false
        }
      );
      suggestions.push(...displayNameSuggestions);
    }

    // Bio suggestions
    if (validationResult.fieldValidations.bio?.violations.length > 0) {
      const bioSuggestions = this.generateBioSuggestions(
        bio,
        {
          sanitizedContent: bio,
          originalContent: bio,
          securityViolations: validationResult.fieldValidations.bio.violations,
          removedElements: [],
          processingTime: 0,
          isValid: false
        }
      );
      suggestions.push(...bioSuggestions);
    }

    return suggestions;
  }

  /**
   * Generate display name specific suggestions
   */
  private generateDisplayNameSuggestions(
    original: string,
    sanitizationResult: any
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    // Length suggestion
    if (original.length > 50) {
      suggestions.push({
        original,
        suggested: original.substring(0, 47) + '...',
        reason: 'Display name is too long',
        type: 'length'
      });
    }

    // Remove HTML tags
    if (/<[^>]+>/.test(original)) {
      suggestions.push({
        original,
        suggested: original.replace(/<[^>]+>/g, ''),
        reason: 'HTML tags removed for display name',
        type: 'formatting'
      });
    }

    // Remove special characters
    if (/[<>&"']/.test(original)) {
      suggestions.push({
        original,
        suggested: original.replace(/[<>&"']/g, ''),
        reason: 'Special characters removed for security',
        type: 'security'
      });
    }

    // Suggestions based on security violations
    if (sanitizationResult.securityViolations) {
      sanitizationResult.securityViolations.forEach((violation: any) => {
        if (violation.type === 'suspicious_pattern' && violation.description?.includes('administrative terms')) {
          suggestions.push({
            original,
            suggested: original.replace(/admin|administrator|moderator|mod/gi, 'user'),
            reason: 'Administrative terms replaced with neutral alternatives',
            type: 'content'
          });
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate bio specific suggestions
   */
  private generateBioSuggestions(
    original: string,
    sanitizationResult: any
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];

    // Length suggestion
    if (original.length > 500) {
      suggestions.push({
        original,
        suggested: original.substring(0, 497) + '...',
        reason: 'Bio is too long',
        type: 'length'
      });
    }

    // Safe HTML formatting suggestions
    if (original.includes('<script>')) {
      suggestions.push({
        original,
        suggested: original.replace(/<script[^>]*>.*?<\/script>/gi, ''),
        reason: 'Script tags removed for security',
        type: 'security'
      });
    }

    // Convert unsafe formatting to safe alternatives
    if (original.includes('<a ')) {
      suggestions.push({
        original,
        suggested: original.replace(/<a [^>]*>(.*?)<\/a>/gi, '$1'),
        reason: 'Links converted to plain text for security',
        type: 'security'
      });
    }

    return suggestions;
  }

  /**
   * Generate preview content (sanitized)
   */
  private async generatePreviewContent(
    displayName: string,
    bio: string
  ): Promise<{ displayName: string; bio: string }> {
    try {
      const [sanitizedDisplayName, sanitizedBio] = await Promise.all([
        userProfileSanitizationService.sanitizeDisplayName(displayName),
        userProfileSanitizationService.sanitizeBio(bio)
      ]);

      return {
        displayName: sanitizedDisplayName.sanitizedContent,
        bio: sanitizedBio.sanitizedContent
      };
    } catch (error) {
      return {
        displayName: '',
        bio: ''
      };
    }
  }

  /**
   * Validate display name length
   */
  private validateDisplayNameLength(displayName: string, maxLength: number): ValidationMessage[] {
    const messages: ValidationMessage[] = [];

    if (displayName.trim().length === 0) {
      messages.push({
        type: 'error',
        field: 'displayName',
        message: 'Display name is required.',
        canProceed: false
      });
    } else if (displayName.length > maxLength) {
      messages.push({
        type: 'error',
        field: 'displayName',
        message: `Display name must be ${maxLength} characters or less. Currently ${displayName.length} characters.`,
        suggestion: `Try shortening to: "${displayName.substring(0, maxLength - 3)}..."`,
        canProceed: false
      });
    }

    return messages;
  }

  /**
   * Validate bio length
   */
  private validateBioLength(bio: string, maxLength: number): ValidationMessage[] {
    const messages: ValidationMessage[] = [];

    if (bio.length > maxLength) {
      messages.push({
        type: 'error',
        field: 'bio',
        message: `Bio must be ${maxLength} characters or less. Currently ${bio.length} characters.`,
        suggestion: `Try shortening your bio or removing some content.`,
        canProceed: false
      });
    }

    return messages;
  }

  /**
   * Generate display name specific messages
   */
  private generateDisplayNameMessages(sanitizationResult: any): ValidationMessage[] {
    const messages: ValidationMessage[] = [];

    if (!sanitizationResult.isValid) {
      sanitizationResult.securityViolations.forEach((violation: SecurityViolation) => {
        const violationMessage = this.getViolationMessage('displayName', violation);
        messages.push({
          type: violation.severity === 'critical' ? 'error' : 'warning',
          field: 'displayName',
          message: violationMessage.text,
          suggestion: violationMessage.suggestion,
          canProceed: violation.severity !== 'critical'
        });
      });
    }

    return messages;
  }

  /**
   * Generate bio specific messages
   */
  private generateBioMessages(sanitizationResult: any): ValidationMessage[] {
    const messages: ValidationMessage[] = [];

    if (!sanitizationResult.isValid) {
      sanitizationResult.securityViolations.forEach((violation: SecurityViolation) => {
        const violationMessage = this.getViolationMessage('bio', violation);
        messages.push({
          type: violation.severity === 'critical' ? 'error' : 'warning',
          field: 'bio',
          message: violationMessage.text,
          suggestion: violationMessage.suggestion,
          canProceed: violation.severity !== 'critical'
        });
      });
    }

    return messages;
  }

  /**
   * Get risk level message
   */
  private getRiskLevelMessage(riskLevel: 'medium' | 'high' | 'critical'): string {
    switch (riskLevel) {
      case 'medium':
        return 'Some content may need review. Your profile will be sanitized before saving.';
      case 'high':
        return 'Suspicious content detected. Your profile will be flagged for review.';
      case 'critical':
        return 'Dangerous content detected. Please remove harmful content before saving.';
      default:
        return 'Content validation completed.';
    }
  }

  /**
   * Determine if user can save based on validation results
   */
  private determineCanSave(
    validationResult: UserProfileValidationResult,
    messages: ValidationMessage[],
    strictMode: boolean
  ): boolean {
    // In strict mode, any violation prevents saving
    if (strictMode && !validationResult.isValid) {
      return false;
    }

    // Critical violations always prevent saving
    if (validationResult.overallRiskLevel === 'critical') {
      return false;
    }

    // Check if any message prevents proceeding
    const blockingMessages = messages.filter(msg => !msg.canProceed);
    return blockingMessages.length === 0;
  }
}

// Export singleton instance
export const profileContentValidationService = new ProfileContentValidationService();
export default profileContentValidationService;