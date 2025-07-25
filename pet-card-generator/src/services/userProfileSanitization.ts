/**
 * User profile sanitization service
 * Handles sanitization of user profile content including display names and bio
 */

import { sanitizationService } from './sanitization';
import {
  ContentType,
  SanitizedResult,
  ValidationResult,
  SecurityViolation
} from '../types/sanitization';

// Enhanced user profile interfaces with sanitization tracking
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  createdAt: any; // Firebase Timestamp
  updatedAt?: any; // Firebase Timestamp
}

export interface SanitizedUserProfile extends UserProfile {
  sanitizationInfo: {
    lastUpdated: Date;
    profileVersion: string;
    violationsCount: number;
    sanitizedFields: string[];
  };
}

export interface UserProfileSanitizationResult {
  profile: SanitizedUserProfile;
  sanitizationResults: {
    displayName: SanitizedResult;
    bio?: SanitizedResult;
  };
  hasViolations: boolean;
  totalViolations: number;
}

export interface UserProfileValidationResult {
  isValid: boolean;
  fieldValidations: {
    displayName: ValidationResult;
    bio?: ValidationResult;
  };
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: 'allow' | 'sanitize' | 'block' | 'flag';
}

class UserProfileSanitizationService {
  private readonly PROFILE_VERSION = '1.0.0';
  private readonly MAX_DISPLAY_NAME_LENGTH = 50;
  private readonly MAX_BIO_LENGTH = 500;

  /**
   * Sanitize user profile content
   */
  async sanitizeUserProfile(profile: UserProfile): Promise<UserProfileSanitizationResult> {
    const sanitizationResults: UserProfileSanitizationResult['sanitizationResults'] = {
      displayName: await this.sanitizeDisplayName(profile.displayName),
      bio: profile.bio ? await this.sanitizeBio(profile.bio) : undefined
    };

    // Count total violations
    let totalViolations = sanitizationResults.displayName.securityViolations.length;
    if (sanitizationResults.bio) {
      totalViolations += sanitizationResults.bio.securityViolations.length;
    }

    // Determine which fields were sanitized
    const sanitizedFields: string[] = [];
    if (sanitizationResults.displayName.originalContent !== sanitizationResults.displayName.sanitizedContent) {
      sanitizedFields.push('displayName');
    }
    if (sanitizationResults.bio && sanitizationResults.bio.originalContent !== sanitizationResults.bio.sanitizedContent) {
      sanitizedFields.push('bio');
    }

    // Create sanitized profile
    const sanitizedProfile: SanitizedUserProfile = {
      ...profile,
      displayName: sanitizationResults.displayName.sanitizedContent,
      bio: sanitizationResults.bio?.sanitizedContent,
      sanitizationInfo: {
        lastUpdated: new Date(),
        profileVersion: this.PROFILE_VERSION,
        violationsCount: totalViolations,
        sanitizedFields
      }
    };

    return {
      profile: sanitizedProfile,
      sanitizationResults,
      hasViolations: totalViolations > 0,
      totalViolations
    };
  }

  /**
   * Sanitize display name with specific rules for user names
   */
  async sanitizeDisplayName(displayName: string): Promise<SanitizedResult> {
    if (!displayName || typeof displayName !== 'string') {
      throw new Error('Display name is required and must be a string');
    }

    // Trim and check length
    const trimmedName = displayName.trim();
    if (trimmedName.length === 0) {
      throw new Error('Display name cannot be empty');
    }

    if (trimmedName.length > this.MAX_DISPLAY_NAME_LENGTH) {
      throw new Error(`Display name cannot exceed ${this.MAX_DISPLAY_NAME_LENGTH} characters`);
    }

    // For display names, we're more restrictive - only allow basic text formatting
    const result = await sanitizationService.sanitizeHTML(trimmedName, {
      allowedTags: ['b', 'i', 'em', 'strong'], // Very limited HTML for display names
      allowedAttributes: {},
      stripIgnoreTag: true,
      keepContent: true
    });

    // Additional validation for display names
    const additionalViolations = this.validateDisplayNameContent(result.sanitizedContent);
    result.securityViolations.push(...additionalViolations);

    return result;
  }

  /**
   * Sanitize bio content with user profile policy
   */
  async sanitizeBio(bio: string): Promise<SanitizedResult> {
    if (!bio || typeof bio !== 'string') {
      return {
        sanitizedContent: '',
        originalContent: bio || '',
        removedElements: [],
        securityViolations: [],
        processingTime: 0,
        isValid: true
      };
    }

    // Trim and check length
    const trimmedBio = bio.trim();
    if (trimmedBio.length > this.MAX_BIO_LENGTH) {
      throw new Error(`Bio cannot exceed ${this.MAX_BIO_LENGTH} characters`);
    }

    // Use user profile content type for bio sanitization
    const config = sanitizationService.getConfigForContentType(ContentType.USER_PROFILE);
    return await sanitizationService.sanitizeHTML(trimmedBio, config);
  }

  /**
   * Validate user profile content without sanitizing
   */
  async validateUserProfile(profile: UserProfile): Promise<UserProfileValidationResult> {
    const fieldValidations: UserProfileValidationResult['fieldValidations'] = {
      displayName: await sanitizationService.validateContent(profile.displayName, ContentType.USER_PROFILE),
      bio: profile.bio ? await sanitizationService.validateContent(profile.bio, ContentType.USER_PROFILE) : undefined
    };

    // Determine overall risk level
    const riskLevels = [fieldValidations.displayName.riskLevel];
    if (fieldValidations.bio) {
      riskLevels.push(fieldValidations.bio.riskLevel);
    }

    const overallRiskLevel = this.determineOverallRiskLevel(riskLevels);
    
    // Determine recommended action
    let recommendedAction: UserProfileValidationResult['recommendedAction'] = 'allow';
    if (overallRiskLevel === 'critical') {
      recommendedAction = 'block';
    } else if (overallRiskLevel === 'high') {
      recommendedAction = 'flag';
    } else if (overallRiskLevel === 'medium') {
      recommendedAction = 'sanitize';
    }

    const isValid = fieldValidations.displayName.isValid && 
                   (fieldValidations.bio?.isValid ?? true);

    return {
      isValid,
      fieldValidations,
      overallRiskLevel,
      recommendedAction
    };
  }

  /**
   * Update existing user profile with sanitization
   */
  async updateUserProfile(
    existingProfile: UserProfile, 
    updates: Partial<Pick<UserProfile, 'displayName' | 'bio'>>
  ): Promise<UserProfileSanitizationResult> {
    // Create updated profile
    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date()
    };

    // Sanitize the updated profile
    return await this.sanitizeUserProfile(updatedProfile);
  }

  /**
   * Check if profile needs re-sanitization based on version
   */
  needsResanitization(profile: SanitizedUserProfile): boolean {
    return profile.sanitizationInfo.profileVersion !== this.PROFILE_VERSION;
  }

  /**
   * Get sanitization summary for profile
   */
  getSanitizationSummary(profile: SanitizedUserProfile): {
    lastSanitized: Date;
    violationsFound: number;
    sanitizedFields: string[];
    isUpToDate: boolean;
  } {
    return {
      lastSanitized: profile.sanitizationInfo.lastUpdated,
      violationsFound: profile.sanitizationInfo.violationsCount,
      sanitizedFields: profile.sanitizationInfo.sanitizedFields,
      isUpToDate: !this.needsResanitization(profile)
    };
  }

  /**
   * Additional validation for display name content
   */
  private validateDisplayNameContent(displayName: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Check for suspicious patterns in display names
    const suspiciousPatterns = [
      { pattern: /admin|administrator|moderator|mod/gi, severity: 'medium' as const, description: 'Contains administrative terms' },
      { pattern: /\b(fuck|shit|damn|bitch|asshole)\b/gi, severity: 'low' as const, description: 'Contains profanity' },
      { pattern: /[<>]/g, severity: 'high' as const, description: 'Contains HTML brackets' },
      { pattern: /javascript:|data:|vbscript:/gi, severity: 'critical' as const, description: 'Contains dangerous URL schemes' }
    ];

    suspiciousPatterns.forEach(({ pattern, severity, description }) => {
      const matches = displayName.match(pattern);
      if (matches) {
        matches.forEach(match => {
          violations.push({
            type: 'suspicious_pattern',
            originalContent: match,
            sanitizedContent: '',
            timestamp: new Date(),
            severity,
            description: `Display name ${description.toLowerCase()}: ${match}`
          });
        });
      }
    });

    return violations;
  }

  /**
   * Determine overall risk level from multiple field risk levels
   */
  private determineOverallRiskLevel(riskLevels: Array<'low' | 'medium' | 'high' | 'critical'>): 'low' | 'medium' | 'high' | 'critical' {
    if (riskLevels.includes('critical')) return 'critical';
    if (riskLevels.includes('high')) return 'high';
    if (riskLevels.includes('medium')) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const userProfileSanitizationService = new UserProfileSanitizationService();
export default userProfileSanitizationService;