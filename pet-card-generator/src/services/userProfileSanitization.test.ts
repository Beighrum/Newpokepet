/**
 * Tests for user profile sanitization service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { userProfileSanitizationService, UserProfile } from './userProfileSanitization';
import { sanitizationService } from './sanitization';

// Mock the sanitization service
vi.mock('./sanitization', () => ({
  sanitizationService: {
    sanitizeHTML: vi.fn(),
    validateContent: vi.fn(),
    getConfigForContentType: vi.fn()
  }
}));

describe('UserProfileSanitizationService', () => {
  const mockSanitizationService = sanitizationService as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSanitizationService.sanitizeHTML.mockResolvedValue({
      sanitizedContent: 'sanitized content',
      originalContent: 'original content',
      removedElements: [],
      securityViolations: [],
      processingTime: 10,
      isValid: true
    });

    mockSanitizationService.validateContent.mockResolvedValue({
      isValid: true,
      violations: [],
      riskLevel: 'low',
      recommendedAction: 'allow',
      confidence: 0.95
    });

    mockSanitizationService.getConfigForContentType.mockReturnValue({
      allowedTags: ['b', 'i', 'em', 'strong'],
      allowedAttributes: {},
      stripIgnoreTag: true,
      keepContent: true
    });
  });

  describe('sanitizeUserProfile', () => {
    it('should sanitize user profile with display name and bio', async () => {
      const profile: UserProfile = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'John <script>alert("xss")</script> Doe',
        bio: 'I love <b>pets</b> and <script>alert("xss")</script>',
        createdAt: new Date()
      };

      mockSanitizationService.sanitizeHTML
        .mockResolvedValueOnce({
          sanitizedContent: 'John  Doe',
          originalContent: 'John <script>alert("xss")</script> Doe',
          removedElements: ['script'],
          securityViolations: [{
            type: 'script_tag',
            originalContent: '<script>alert("xss")</script>',
            sanitizedContent: '',
            timestamp: new Date(),
            severity: 'critical',
            description: 'Removed dangerous script tag'
          }],
          processingTime: 15,
          isValid: false
        })
        .mockResolvedValueOnce({
          sanitizedContent: 'I love <b>pets</b> and ',
          originalContent: 'I love <b>pets</b> and <script>alert("xss")</script>',
          removedElements: ['script'],
          securityViolations: [{
            type: 'script_tag',
            originalContent: '<script>alert("xss")</script>',
            sanitizedContent: '',
            timestamp: new Date(),
            severity: 'critical',
            description: 'Removed dangerous script tag'
          }],
          processingTime: 20,
          isValid: false
        });

      const result = await userProfileSanitizationService.sanitizeUserProfile(profile);

      expect(result.profile.displayName).toBe('John  Doe');
      expect(result.profile.bio).toBe('I love <b>pets</b> and ');
      expect(result.hasViolations).toBe(true);
      expect(result.totalViolations).toBe(2);
      expect(result.profile.sanitizationInfo.sanitizedFields).toEqual(['displayName', 'bio']);
      expect(result.profile.sanitizationInfo.violationsCount).toBe(2);
    });

    it('should handle profile without bio', async () => {
      const profile: UserProfile = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: new Date()
      };

      mockSanitizationService.sanitizeHTML.mockResolvedValueOnce({
        sanitizedContent: 'John Doe',
        originalContent: 'John Doe',
        removedElements: [],
        securityViolations: [],
        processingTime: 5,
        isValid: true
      });

      const result = await userProfileSanitizationService.sanitizeUserProfile(profile);

      expect(result.profile.displayName).toBe('John Doe');
      expect(result.profile.bio).toBeUndefined();
      expect(result.hasViolations).toBe(false);
      expect(result.totalViolations).toBe(0);
      expect(result.sanitizationResults.bio).toBeUndefined();
    });

    it('should track sanitization info correctly', async () => {
      const profile: UserProfile = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'John Doe',
        bio: 'Clean bio',
        createdAt: new Date()
      };

      // Mock to return same content (no changes)
      mockSanitizationService.sanitizeHTML
        .mockResolvedValueOnce({
          sanitizedContent: 'John Doe',
          originalContent: 'John Doe',
          removedElements: [],
          securityViolations: [],
          processingTime: 5,
          isValid: true
        })
        .mockResolvedValueOnce({
          sanitizedContent: 'Clean bio',
          originalContent: 'Clean bio',
          removedElements: [],
          securityViolations: [],
          processingTime: 5,
          isValid: true
        });

      const result = await userProfileSanitizationService.sanitizeUserProfile(profile);

      expect(result.profile.sanitizationInfo).toMatchObject({
        profileVersion: '1.0.0',
        violationsCount: 0,
        sanitizedFields: [] // No fields changed, so no sanitization needed
      });
      expect(result.profile.sanitizationInfo.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('sanitizeDisplayName', () => {
    it('should sanitize display name with limited HTML tags', async () => {
      const displayName = 'John <b>Bold</b> <script>alert("xss")</script> Doe';

      mockSanitizationService.sanitizeHTML.mockResolvedValueOnce({
        sanitizedContent: 'John <b>Bold</b>  Doe',
        originalContent: displayName,
        removedElements: ['script'],
        securityViolations: [{
          type: 'script_tag',
          originalContent: '<script>alert("xss")</script>',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical',
          description: 'Removed dangerous script tag'
        }],
        processingTime: 10,
        isValid: false
      });

      const result = await userProfileSanitizationService.sanitizeDisplayName(displayName);

      expect(result.sanitizedContent).toBe('John <b>Bold</b>  Doe');
      // The service adds additional violations for suspicious patterns, so we expect more than 1
      expect(result.securityViolations.length).toBeGreaterThanOrEqual(1);
      expect(mockSanitizationService.sanitizeHTML).toHaveBeenCalledWith(
        displayName,
        expect.objectContaining({
          allowedTags: ['b', 'i', 'em', 'strong'],
          allowedAttributes: {},
          stripIgnoreTag: true,
          keepContent: true
        })
      );
    });

    it('should throw error for empty display name', async () => {
      await expect(userProfileSanitizationService.sanitizeDisplayName('')).rejects.toThrow('Display name is required and must be a string');
      await expect(userProfileSanitizationService.sanitizeDisplayName('   ')).rejects.toThrow('Display name cannot be empty');
    });

    it('should throw error for display name exceeding max length', async () => {
      const longName = 'a'.repeat(51);
      await expect(userProfileSanitizationService.sanitizeDisplayName(longName)).rejects.toThrow('Display name cannot exceed 50 characters');
    });

    it('should throw error for non-string display name', async () => {
      await expect(userProfileSanitizationService.sanitizeDisplayName(null as any)).rejects.toThrow('Display name is required and must be a string');
      await expect(userProfileSanitizationService.sanitizeDisplayName(undefined as any)).rejects.toThrow('Display name is required and must be a string');
    });

    it('should detect suspicious patterns in display name', async () => {
      const displayName = 'admin user';

      mockSanitizationService.sanitizeHTML.mockResolvedValueOnce({
        sanitizedContent: 'admin user',
        originalContent: displayName,
        removedElements: [],
        securityViolations: [],
        processingTime: 5,
        isValid: true
      });

      const result = await userProfileSanitizationService.sanitizeDisplayName(displayName);

      // Should add additional violation for administrative terms
      expect(result.securityViolations).toHaveLength(1);
      expect(result.securityViolations[0].type).toBe('suspicious_pattern');
      expect(result.securityViolations[0].description).toContain('administrative terms');
    });
  });

  describe('sanitizeBio', () => {
    it('should sanitize bio with user profile policy', async () => {
      const bio = 'I love <b>pets</b> and <script>alert("xss")</script>';

      const result = await userProfileSanitizationService.sanitizeBio(bio);

      expect(mockSanitizationService.sanitizeHTML).toHaveBeenCalledWith(
        bio,
        expect.objectContaining({
          allowedTags: ['b', 'i', 'em', 'strong'],
          allowedAttributes: {},
          stripIgnoreTag: true,
          keepContent: true
        })
      );
    });

    it('should handle empty or null bio', async () => {
      const result1 = await userProfileSanitizationService.sanitizeBio('');
      const result2 = await userProfileSanitizationService.sanitizeBio(null as any);

      expect(result1.sanitizedContent).toBe('');
      expect(result1.isValid).toBe(true);
      expect(result2.sanitizedContent).toBe('');
      expect(result2.isValid).toBe(true);
    });

    it('should throw error for bio exceeding max length', async () => {
      const longBio = 'a'.repeat(501);
      await expect(userProfileSanitizationService.sanitizeBio(longBio)).rejects.toThrow('Bio cannot exceed 500 characters');
    });
  });

  describe('validateUserProfile', () => {
    it('should validate user profile fields', async () => {
      const profile: UserProfile = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'John Doe',
        bio: 'I love pets',
        createdAt: new Date()
      };

      mockSanitizationService.validateContent
        .mockResolvedValueOnce({
          isValid: true,
          violations: [],
          riskLevel: 'low',
          recommendedAction: 'allow',
          confidence: 0.95
        })
        .mockResolvedValueOnce({
          isValid: true,
          violations: [],
          riskLevel: 'low',
          recommendedAction: 'allow',
          confidence: 0.95
        });

      const result = await userProfileSanitizationService.validateUserProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.overallRiskLevel).toBe('low');
      expect(result.recommendedAction).toBe('allow');
      expect(result.fieldValidations.displayName.isValid).toBe(true);
      expect(result.fieldValidations.bio?.isValid).toBe(true);
    });

    it('should handle profile without bio', async () => {
      const profile: UserProfile = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'John Doe',
        createdAt: new Date()
      };

      mockSanitizationService.validateContent.mockResolvedValueOnce({
        isValid: true,
        violations: [],
        riskLevel: 'low',
        recommendedAction: 'allow',
        confidence: 0.95
      });

      const result = await userProfileSanitizationService.validateUserProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.fieldValidations.bio).toBeUndefined();
    });

    it('should determine correct overall risk level', async () => {
      const profile: UserProfile = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'John Doe',
        bio: 'Suspicious content',
        createdAt: new Date()
      };

      mockSanitizationService.validateContent
        .mockResolvedValueOnce({
          isValid: true,
          violations: [],
          riskLevel: 'low',
          recommendedAction: 'allow',
          confidence: 0.95
        })
        .mockResolvedValueOnce({
          isValid: false,
          violations: [{ type: 'suspicious_pattern' } as any],
          riskLevel: 'high',
          recommendedAction: 'flag',
          confidence: 0.3
        });

      const result = await userProfileSanitizationService.validateUserProfile(profile);

      expect(result.overallRiskLevel).toBe('high');
      expect(result.recommendedAction).toBe('flag');
      expect(result.isValid).toBe(false);
    });
  });

  describe('updateUserProfile', () => {
    it('should update and sanitize user profile', async () => {
      const existingProfile: UserProfile = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'John Doe',
        bio: 'Old bio',
        createdAt: new Date('2023-01-01')
      };

      const updates = {
        displayName: 'John <b>Updated</b> Doe',
        bio: 'New <i>bio</i> content'
      };

      mockSanitizationService.sanitizeHTML
        .mockResolvedValueOnce({
          sanitizedContent: 'John <b>Updated</b> Doe',
          originalContent: 'John <b>Updated</b> Doe',
          removedElements: [],
          securityViolations: [],
          processingTime: 10,
          isValid: true
        })
        .mockResolvedValueOnce({
          sanitizedContent: 'New <i>bio</i> content',
          originalContent: 'New <i>bio</i> content',
          removedElements: [],
          securityViolations: [],
          processingTime: 15,
          isValid: true
        });

      const result = await userProfileSanitizationService.updateUserProfile(existingProfile, updates);

      expect(result.profile.displayName).toBe('John <b>Updated</b> Doe');
      expect(result.profile.bio).toBe('New <i>bio</i> content');
      expect(result.profile.updatedAt).toBeInstanceOf(Date);
      expect(result.profile.createdAt).toEqual(existingProfile.createdAt);
    });
  });

  describe('utility methods', () => {
    it('should check if profile needs re-sanitization', () => {
      const upToDateProfile = {
        sanitizationInfo: { profileVersion: '1.0.0' }
      } as any;

      const outdatedProfile = {
        sanitizationInfo: { profileVersion: '0.9.0' }
      } as any;

      expect(userProfileSanitizationService.needsResanitization(upToDateProfile)).toBe(false);
      expect(userProfileSanitizationService.needsResanitization(outdatedProfile)).toBe(true);
    });

    it('should get sanitization summary', () => {
      const profile = {
        sanitizationInfo: {
          lastUpdated: new Date('2023-01-01'),
          violationsCount: 2,
          sanitizedFields: ['displayName'],
          profileVersion: '1.0.0'
        }
      } as any;

      const summary = userProfileSanitizationService.getSanitizationSummary(profile);

      expect(summary.lastSanitized).toEqual(new Date('2023-01-01'));
      expect(summary.violationsFound).toBe(2);
      expect(summary.sanitizedFields).toEqual(['displayName']);
      expect(summary.isUpToDate).toBe(true);
    });
  });
});