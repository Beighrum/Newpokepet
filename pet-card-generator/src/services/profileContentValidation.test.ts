/**
 * Tests for profile content validation service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { profileContentValidationService } from './profileContentValidation';
import { userProfileSanitizationService } from './userProfileSanitization';

// Mock the user profile sanitization service
vi.mock('./userProfileSanitization', () => ({
  userProfileSanitizationService: {
    validateUserProfile: vi.fn(),
    sanitizeDisplayName: vi.fn(),
    sanitizeBio: vi.fn()
  }
}));

describe('ProfileContentValidationService', () => {
  const mockSanitizationService = userProfileSanitizationService as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateProfileContent', () => {
    it('should validate clean profile content successfully', async () => {
      mockSanitizationService.validateUserProfile.mockResolvedValue({
        isValid: true,
        fieldValidations: {
          displayName: {
            isValid: true,
            violations: [],
            riskLevel: 'low',
            recommendedAction: 'allow'
          },
          bio: {
            isValid: true,
            violations: [],
            riskLevel: 'low',
            recommendedAction: 'allow'
          }
        },
        overallRiskLevel: 'low',
        recommendedAction: 'allow'
      });

      mockSanitizationService.sanitizeDisplayName.mockResolvedValue({
        sanitizedContent: 'John Doe',
        originalContent: 'John Doe',
        securityViolations: [],
        isValid: true
      });

      mockSanitizationService.sanitizeBio.mockResolvedValue({
        sanitizedContent: 'I love pets',
        originalContent: 'I love pets',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateProfileContent(
        'John Doe',
        'I love pets'
      );

      expect(result.isValid).toBe(true);
      expect(result.canSave).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe('success');
      expect(result.previewContent.displayName).toBe('John Doe');
      expect(result.previewContent.bio).toBe('I love pets');
    });

    it('should handle profile content with security violations', async () => {
      mockSanitizationService.validateUserProfile.mockResolvedValue({
        isValid: false,
        fieldValidations: {
          displayName: {
            isValid: false,
            violations: [{
              type: 'script_tag',
              originalContent: '<script>alert("xss")</script>',
              sanitizedContent: '',
              timestamp: new Date(),
              severity: 'critical',
              description: 'Script tag detected'
            }],
            riskLevel: 'critical',
            recommendedAction: 'block'
          }
        },
        overallRiskLevel: 'critical',
        recommendedAction: 'block'
      });

      mockSanitizationService.sanitizeDisplayName.mockResolvedValue({
        sanitizedContent: 'John',
        originalContent: 'John<script>alert("xss")</script>',
        securityViolations: [{
          type: 'script_tag',
          originalContent: '<script>alert("xss")</script>',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical',
          description: 'Script tag detected'
        }],
        isValid: false
      });

      mockSanitizationService.sanitizeBio.mockResolvedValue({
        sanitizedContent: '',
        originalContent: '',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateProfileContent(
        'John<script>alert("xss")</script>',
        ''
      );

      expect(result.isValid).toBe(false);
      expect(result.canSave).toBe(false);
      expect(result.riskLevel).toBe('critical');
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages.some(msg => msg.type === 'error')).toBe(true);
      expect(result.previewContent.displayName).toBe('John');
    });

    it('should generate appropriate suggestions for problematic content', async () => {
      mockSanitizationService.validateUserProfile.mockResolvedValue({
        isValid: false,
        fieldValidations: {
          displayName: {
            isValid: false,
            violations: [{
              type: 'suspicious_pattern',
              originalContent: 'admin',
              sanitizedContent: 'admin',
              timestamp: new Date(),
              severity: 'medium',
              description: 'Contains administrative terms'
            }],
            riskLevel: 'medium',
            recommendedAction: 'sanitize'
          }
        },
        overallRiskLevel: 'medium',
        recommendedAction: 'sanitize'
      });

      mockSanitizationService.sanitizeDisplayName.mockResolvedValue({
        sanitizedContent: 'admin',
        originalContent: 'admin',
        securityViolations: [{
          type: 'suspicious_pattern',
          originalContent: 'admin',
          sanitizedContent: 'admin',
          timestamp: new Date(),
          severity: 'medium',
          description: 'Contains administrative terms'
        }],
        isValid: false
      });

      mockSanitizationService.sanitizeBio.mockResolvedValue({
        sanitizedContent: '',
        originalContent: '',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateProfileContent(
        'admin',
        '',
        { showSuggestions: true }
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.canSave).toBe(true); // Medium risk allows saving
      expect(result.messages.some(msg => msg.suggestion)).toBe(true);
    });
  });

  describe('validateDisplayName', () => {
    it('should validate display name length', async () => {
      const longName = 'a'.repeat(60);
      
      const result = await profileContentValidationService.validateDisplayName(longName);

      expect(result.isValid).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe('error');
      expect(result.messages[0].message).toContain('50 characters or less');
      expect(result.preview).toBe(longName.substring(0, 50));
    });

    it('should validate empty display name', async () => {
      const result = await profileContentValidationService.validateDisplayName('   ');

      expect(result.isValid).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].message).toContain('required');
    });

    it('should validate display name with HTML tags', async () => {
      mockSanitizationService.sanitizeDisplayName.mockResolvedValue({
        sanitizedContent: 'John Doe',
        originalContent: 'John <b>Doe</b>',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateDisplayName('John <b>Doe</b>');

      expect(result.isValid).toBe(true);
      expect(result.preview).toBe('John Doe');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].type).toBe('formatting');
    });

    it('should handle sanitization errors', async () => {
      mockSanitizationService.sanitizeDisplayName.mockRejectedValue(new Error('Sanitization failed'));

      const result = await profileContentValidationService.validateDisplayName('test');

      expect(result.isValid).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe('error');
      expect(result.preview).toBe('');
    });
  });

  describe('validateBio', () => {
    it('should validate bio length', async () => {
      const longBio = 'a'.repeat(600);
      
      const result = await profileContentValidationService.validateBio(longBio);

      expect(result.isValid).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe('error');
      expect(result.messages[0].message).toContain('500 characters or less');
      expect(result.preview).toBe(longBio.substring(0, 500));
    });

    it('should validate bio with safe HTML', async () => {
      mockSanitizationService.sanitizeBio.mockResolvedValue({
        sanitizedContent: 'I love <b>pets</b>',
        originalContent: 'I love <b>pets</b>',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateBio('I love <b>pets</b>');

      expect(result.isValid).toBe(true);
      expect(result.preview).toBe('I love <b>pets</b>');
      expect(result.messages).toHaveLength(0);
    });

    it('should validate bio with dangerous content', async () => {
      mockSanitizationService.sanitizeBio.mockResolvedValue({
        sanitizedContent: 'I love pets',
        originalContent: 'I love <script>alert("xss")</script> pets',
        securityViolations: [{
          type: 'script_tag',
          originalContent: '<script>alert("xss")</script>',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical',
          description: 'Script tag detected'
        }],
        isValid: false
      });

      const result = await profileContentValidationService.validateBio('I love <script>alert("xss")</script> pets');

      expect(result.isValid).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0].type).toBe('error');
      expect(result.preview).toBe('I love pets');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getFormattingSuggestions', () => {
    it('should return formatting suggestions for display name and bio', () => {
      const suggestions = profileContentValidationService.getFormattingSuggestions();

      expect(suggestions.displayName).toBeInstanceOf(Array);
      expect(suggestions.bio).toBeInstanceOf(Array);
      expect(suggestions.displayName.length).toBeGreaterThan(0);
      expect(suggestions.bio.length).toBeGreaterThan(0);
      expect(suggestions.displayName[0]).toContain('letters, numbers');
      expect(suggestions.bio[0]).toContain('HTML formatting');
    });
  });

  describe('content suggestions', () => {
    it('should suggest removing HTML tags from display name', async () => {
      mockSanitizationService.sanitizeDisplayName.mockResolvedValue({
        sanitizedContent: 'John Doe',
        originalContent: 'John <b>Doe</b>',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateDisplayName('John <b>Doe</b>');

      expect(result.suggestions.length).toBeGreaterThan(0);
      const htmlSuggestion = result.suggestions.find(s => s.type === 'formatting');
      expect(htmlSuggestion).toBeDefined();
      expect(htmlSuggestion?.suggested).toBe('John Doe');
      expect(htmlSuggestion?.reason).toContain('HTML tags removed');
    });

    it('should suggest removing special characters for security', async () => {
      mockSanitizationService.sanitizeDisplayName.mockResolvedValue({
        sanitizedContent: 'John Doe',
        originalContent: 'John<>&Doe',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateDisplayName('John<>&Doe');

      expect(result.suggestions.length).toBeGreaterThan(0);
      const securitySuggestion = result.suggestions.find(s => s.type === 'security');
      expect(securitySuggestion).toBeDefined();
      expect(securitySuggestion?.suggested).toBe('JohnDoe');
      expect(securitySuggestion?.reason).toContain('Special characters removed');
    });

    it('should suggest removing script tags from bio', async () => {
      mockSanitizationService.sanitizeBio.mockResolvedValue({
        sanitizedContent: 'I love pets',
        originalContent: 'I love <script>alert("xss")</script> pets',
        securityViolations: [{
          type: 'script_tag',
          originalContent: '<script>alert("xss")</script>',
          sanitizedContent: '',
          timestamp: new Date(),
          severity: 'critical'
        }],
        isValid: false
      });

      const result = await profileContentValidationService.validateBio('I love <script>alert("xss")</script> pets');

      expect(result.suggestions.length).toBeGreaterThan(0);
      const scriptSuggestion = result.suggestions.find(s => s.type === 'security' && s.reason.includes('Script tags'));
      expect(scriptSuggestion).toBeDefined();
      expect(scriptSuggestion?.suggested).toBe('I love  pets');
    });
  });

  describe('strict mode', () => {
    it('should prevent saving in strict mode with any violations', async () => {
      mockSanitizationService.validateUserProfile.mockResolvedValue({
        isValid: false,
        fieldValidations: {
          displayName: {
            isValid: false,
            violations: [{
              type: 'suspicious_pattern',
              severity: 'low'
            }],
            riskLevel: 'low',
            recommendedAction: 'allow'
          }
        },
        overallRiskLevel: 'low',
        recommendedAction: 'allow'
      });

      mockSanitizationService.sanitizeDisplayName.mockResolvedValue({
        sanitizedContent: 'test',
        originalContent: 'test',
        securityViolations: [],
        isValid: true
      });

      mockSanitizationService.sanitizeBio.mockResolvedValue({
        sanitizedContent: '',
        originalContent: '',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateProfileContent(
        'test',
        '',
        { strictMode: true }
      );

      expect(result.canSave).toBe(false);
    });

    it('should allow saving in normal mode with low risk violations', async () => {
      mockSanitizationService.validateUserProfile.mockResolvedValue({
        isValid: false,
        fieldValidations: {
          displayName: {
            isValid: false,
            violations: [{
              type: 'suspicious_pattern',
              severity: 'low'
            }],
            riskLevel: 'low',
            recommendedAction: 'allow'
          }
        },
        overallRiskLevel: 'low',
        recommendedAction: 'allow'
      });

      mockSanitizationService.sanitizeDisplayName.mockResolvedValue({
        sanitizedContent: 'test',
        originalContent: 'test',
        securityViolations: [],
        isValid: true
      });

      mockSanitizationService.sanitizeBio.mockResolvedValue({
        sanitizedContent: '',
        originalContent: '',
        securityViolations: [],
        isValid: true
      });

      const result = await profileContentValidationService.validateProfileContent(
        'test',
        '',
        { strictMode: false }
      );

      expect(result.canSave).toBe(true);
    });
  });
});