/**
 * Tests for Pet Card Sanitization Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { petCardSanitizationService } from './petCardSanitization';
import { PetCard, ContentType } from '../types/sanitization';

describe('PetCardSanitizationService', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe('sanitizePetCardMetadata', () => {
    it('should sanitize malicious content in pet name', async () => {
      const result = await petCardSanitizationService.sanitizePetCardMetadata(
        'Fluffy<script>alert("xss")</script>',
        'Dog',
        undefined,
        undefined
      );

      expect(result.sanitizedMetadata.petName).toBe('Fluffy');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedMetadata.sanitizedFields).toContain('petName');
    });

    it('should sanitize malicious content in pet type', async () => {
      const result = await petCardSanitizationService.sanitizePetCardMetadata(
        'Fluffy',
        'Dog<img src=x onerror=alert(1)>',
        undefined,
        undefined
      );

      expect(result.sanitizedMetadata.breed).toBe('Dog');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedMetadata.sanitizedFields).toContain('breed');
    });

    it('should sanitize description content', async () => {
      const result = await petCardSanitizationService.sanitizePetCardMetadata(
        'Fluffy',
        'Dog',
        'A lovely pet<script>alert("hack")</script> that loves to play',
        undefined
      );

      expect(result.sanitizedMetadata.description).toBe('A lovely pet that loves to play');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedMetadata.sanitizedFields).toContain('description');
    });

    it('should sanitize custom tags', async () => {
      const result = await petCardSanitizationService.sanitizePetCardMetadata(
        'Fluffy',
        'Dog',
        undefined,
        ['playful', 'friendly<script>alert(1)</script>', 'energetic']
      );

      expect(result.sanitizedMetadata.customTags).toEqual(['playful', 'friendly', 'energetic']);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedMetadata.sanitizedFields).toContain('customTags');
    });

    it('should handle safe content without violations', async () => {
      const result = await petCardSanitizationService.sanitizePetCardMetadata(
        'Fluffy',
        'Golden Retriever',
        'A friendly and energetic dog',
        ['playful', 'friendly', 'energetic']
      );

      expect(result.sanitizedMetadata.petName).toBe('Fluffy');
      expect(result.sanitizedMetadata.breed).toBe('Golden Retriever');
      expect(result.sanitizedMetadata.description).toBe('A friendly and energetic dog');
      expect(result.sanitizedMetadata.customTags).toEqual(['playful', 'friendly', 'energetic']);
      expect(result.violations.length).toBe(0);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedMetadata.sanitizedFields).toEqual([]);
    });

    it('should handle empty optional fields', async () => {
      const result = await petCardSanitizationService.sanitizePetCardMetadata(
        'Fluffy',
        'Dog',
        undefined,
        undefined
      );

      expect(result.sanitizedMetadata.petName).toBe('Fluffy');
      expect(result.sanitizedMetadata.breed).toBe('Dog');
      expect(result.sanitizedMetadata.description).toBeUndefined();
      expect(result.sanitizedMetadata.customTags).toEqual([]);
      expect(result.violations.length).toBe(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePetCardContent', () => {
    it('should validate safe content as low risk', async () => {
      const result = await petCardSanitizationService.validatePetCardContent(
        'Fluffy',
        'Dog',
        'A friendly pet',
        ['playful', 'friendly']
      );

      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.recommendedAction).toBe('allow');
      expect(result.violations.length).toBe(0);
    });

    it('should validate malicious content as high risk', async () => {
      const result = await petCardSanitizationService.validatePetCardContent(
        'Fluffy<script>alert(1)</script>',
        'Dog',
        'A friendly pet',
        ['playful']
      );

      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe('critical');
      expect(result.recommendedAction).toBe('block');
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('createSanitizedPetCard', () => {
    it('should create a sanitized pet card with metadata', async () => {
      const mockCard: PetCard = {
        id: 'test-card-1',
        petName: 'Fluffy',
        petType: 'Dog',
        rarity: 'Common',
        stats: { cuteness: 80, energy: 70 },
        images: { original: 'test.jpg' },
        userId: 'user-1',
        createdAt: new Date()
      };

      const sanitizationResult = {
        sanitizedMetadata: {
          petName: 'Fluffy',
          breed: 'Dog',
          description: undefined,
          customTags: [],
          sanitizedFields: []
        },
        violations: [],
        isValid: true
      };

      const result = await petCardSanitizationService.createSanitizedPetCard(
        mockCard,
        sanitizationResult
      );

      expect(result.id).toBe('test-card-1');
      expect(result.petName).toBe('Fluffy');
      expect(result.petType).toBe('Dog');
      expect(result.sanitizationInfo).toBeDefined();
      expect(result.sanitizationInfo.isValid).toBe(true);
      expect(result.sanitizationInfo.violationsFound).toBe(0);
      expect(result.sanitizationInfo.sanitizationVersion).toBe('1.0.0');
    });
  });

  describe('sanitizeExistingPetCard', () => {
    it('should sanitize an existing pet card', async () => {
      const mockCard: PetCard = {
        id: 'test-card-1',
        petName: 'Fluffy<script>alert(1)</script>',
        petType: 'Dog',
        rarity: 'Common',
        stats: { cuteness: 80, energy: 70 },
        images: { original: 'test.jpg' },
        metadata: {
          description: 'A lovely pet<script>hack()</script>',
          customTags: ['playful', 'friendly<script>alert(1)</script>']
        },
        userId: 'user-1',
        createdAt: new Date()
      };

      const result = await petCardSanitizationService.sanitizeExistingPetCard(mockCard);

      expect(result.petName).toBe('Fluffy');
      expect(result.petType).toBe('Dog');
      expect(result.metadata?.description).toBe('A lovely pet');
      expect(result.metadata?.customTags).toEqual(['playful', 'friendly']);
      expect(result.sanitizationInfo.violationsFound).toBeGreaterThan(0);
      expect(result.sanitizationInfo.isValid).toBe(false);
    });
  });

  describe('getSanitizationSummary', () => {
    it('should provide sanitization summary', async () => {
      const mockCard: PetCard = {
        id: 'test-card-1',
        petName: 'Fluffy',
        petType: 'Dog',
        rarity: 'Common',
        stats: { cuteness: 80, energy: 70 },
        images: { original: 'test.jpg' },
        userId: 'user-1',
        createdAt: new Date()
      };

      const sanitizationResult = {
        sanitizedMetadata: {
          petName: 'Fluffy',
          breed: 'Dog',
          description: undefined,
          customTags: [],
          sanitizedFields: ['petName']
        },
        violations: [{ type: 'script_tag', severity: 'critical' }],
        isValid: false
      };

      const sanitizedCard = await petCardSanitizationService.createSanitizedPetCard(
        mockCard,
        sanitizationResult
      );

      const summary = petCardSanitizationService.getSanitizationSummary(sanitizedCard);

      expect(summary.hasSanitization).toBe(true);
      expect(summary.violationsFound).toBe(1);
      expect(summary.sanitizedFields).toEqual(['petName']);
      expect(summary.isValid).toBe(false);
    });
  });
});