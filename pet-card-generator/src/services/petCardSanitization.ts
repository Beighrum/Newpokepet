/**
 * Pet Card Sanitization Service
 * Handles sanitization of pet card metadata and content
 */

import { sanitizationService } from './sanitization';
import {
  PetCard,
  SanitizedPetCard,
  SanitizedCardMetadata,
  ContentType,
  SecurityViolation,
  SanitizedResult
} from '../types/sanitization';

class PetCardSanitizationService {
  /**
   * Sanitize pet card metadata for safe storage and display
   */
  async sanitizePetCardMetadata(
    petName: string,
    petType: string,
    description?: string,
    customTags?: string[]
  ): Promise<{
    sanitizedMetadata: SanitizedCardMetadata;
    violations: SecurityViolation[];
    isValid: boolean;
  }> {
    const violations: SecurityViolation[] = [];
    const sanitizedFields: string[] = [];

    // Sanitize pet name
    const petNameResult = await sanitizationService.sanitizeHTML(
      petName,
      sanitizationService.getConfigForContentType(ContentType.PET_CARD_METADATA)
    );
    
    if (petNameResult.securityViolations.length > 0) {
      violations.push(...petNameResult.securityViolations);
      sanitizedFields.push('petName');
    }

    // Sanitize pet type (breed)
    const petTypeResult = await sanitizationService.sanitizeHTML(
      petType,
      sanitizationService.getConfigForContentType(ContentType.PET_CARD_METADATA)
    );
    
    if (petTypeResult.securityViolations.length > 0) {
      violations.push(...petTypeResult.securityViolations);
      sanitizedFields.push('breed');
    }

    // Sanitize description if provided
    let sanitizedDescription: string | undefined;
    if (description) {
      const descriptionResult = await sanitizationService.sanitizeHTML(
        description,
        sanitizationService.getConfigForContentType(ContentType.PET_CARD_METADATA)
      );
      
      sanitizedDescription = descriptionResult.sanitizedContent;
      
      if (descriptionResult.securityViolations.length > 0) {
        violations.push(...descriptionResult.securityViolations);
        sanitizedFields.push('description');
      }
    }

    // Sanitize custom tags if provided
    let sanitizedCustomTags: string[] = [];
    if (customTags && Array.isArray(customTags)) {
      for (const tag of customTags) {
        const tagResult = await sanitizationService.sanitizeHTML(
          tag,
          sanitizationService.getConfigForContentType(ContentType.PET_CARD_METADATA)
        );
        
        sanitizedCustomTags.push(tagResult.sanitizedContent);
        
        if (tagResult.securityViolations.length > 0) {
          violations.push(...tagResult.securityViolations);
          if (!sanitizedFields.includes('customTags')) {
            sanitizedFields.push('customTags');
          }
        }
      }
    }

    const sanitizedMetadata: SanitizedCardMetadata = {
      petName: petNameResult.sanitizedContent,
      breed: petTypeResult.sanitizedContent,
      description: sanitizedDescription,
      customTags: sanitizedCustomTags,
      sanitizedFields
    };

    return {
      sanitizedMetadata,
      violations,
      isValid: violations.length === 0
    };
  }

  /**
   * Create a sanitized pet card with sanitization metadata
   */
  async createSanitizedPetCard(
    cardData: PetCard,
    sanitizationResult: {
      sanitizedMetadata: SanitizedCardMetadata;
      violations: SecurityViolation[];
      isValid: boolean;
    }
  ): Promise<SanitizedPetCard> {
    const sanitizedCard: SanitizedPetCard = {
      ...cardData,
      // Update the card with sanitized values
      petName: sanitizationResult.sanitizedMetadata.petName,
      petType: sanitizationResult.sanitizedMetadata.breed,
      metadata: {
        ...cardData.metadata,
        ...sanitizationResult.sanitizedMetadata
      },
      sanitizationInfo: {
        lastSanitized: new Date(),
        violationsFound: sanitizationResult.violations.length,
        sanitizationVersion: '1.0.0',
        isValid: sanitizationResult.isValid
      }
    };

    return sanitizedCard;
  }

  /**
   * Validate pet card content before creation
   */
  async validatePetCardContent(
    petName: string,
    petType: string,
    description?: string,
    customTags?: string[]
  ): Promise<{
    isValid: boolean;
    violations: SecurityViolation[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendedAction: 'allow' | 'sanitize' | 'block' | 'flag';
  }> {
    const allViolations: SecurityViolation[] = [];
    
    // Validate pet name
    const petNameValidation = await sanitizationService.validateContent(
      petName,
      ContentType.PET_CARD_METADATA
    );
    allViolations.push(...petNameValidation.violations);

    // Validate pet type
    const petTypeValidation = await sanitizationService.validateContent(
      petType,
      ContentType.PET_CARD_METADATA
    );
    allViolations.push(...petTypeValidation.violations);

    // Validate description if provided
    if (description) {
      const descriptionValidation = await sanitizationService.validateContent(
        description,
        ContentType.PET_CARD_METADATA
      );
      allViolations.push(...descriptionValidation.violations);
    }

    // Validate custom tags if provided
    if (customTags && Array.isArray(customTags)) {
      for (const tag of customTags) {
        const tagValidation = await sanitizationService.validateContent(
          tag,
          ContentType.PET_CARD_METADATA
        );
        allViolations.push(...tagValidation.violations);
      }
    }

    // Determine overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (allViolations.length > 0) {
      const criticalViolations = allViolations.filter(v => v.severity === 'critical');
      const highViolations = allViolations.filter(v => v.severity === 'high');
      
      if (criticalViolations.length > 0) {
        riskLevel = 'critical';
      } else if (highViolations.length > 0) {
        riskLevel = 'high';
      } else {
        riskLevel = 'medium';
      }
    }

    // Determine recommended action
    let recommendedAction: 'allow' | 'sanitize' | 'block' | 'flag' = 'allow';
    if (riskLevel === 'critical') {
      recommendedAction = 'block';
    } else if (riskLevel === 'high') {
      recommendedAction = 'flag';
    } else if (riskLevel === 'medium') {
      recommendedAction = 'sanitize';
    }

    return {
      isValid: allViolations.length === 0,
      violations: allViolations,
      riskLevel,
      recommendedAction
    };
  }

  /**
   * Sanitize existing pet card for updates
   */
  async sanitizeExistingPetCard(card: PetCard): Promise<SanitizedPetCard> {
    const sanitizationResult = await this.sanitizePetCardMetadata(
      card.petName,
      card.petType,
      card.metadata?.description,
      card.metadata?.customTags
    );

    return this.createSanitizedPetCard(card, sanitizationResult);
  }

  /**
   * Batch sanitize multiple pet cards
   */
  async sanitizeMultiplePetCards(cards: PetCard[]): Promise<SanitizedPetCard[]> {
    const sanitizedCards: SanitizedPetCard[] = [];
    
    for (const card of cards) {
      try {
        const sanitizedCard = await this.sanitizeExistingPetCard(card);
        sanitizedCards.push(sanitizedCard);
      } catch (error) {
        console.error(`Failed to sanitize card ${card.id}:`, error);
        // Create a fallback sanitized card with error info
        const fallbackCard: SanitizedPetCard = {
          ...card,
          metadata: {
            ...card.metadata,
            petName: card.petName,
            breed: card.petType,
            description: card.metadata?.description,
            customTags: card.metadata?.customTags || [],
            sanitizedFields: []
          },
          sanitizationInfo: {
            lastSanitized: new Date(),
            violationsFound: 0,
            sanitizationVersion: '1.0.0',
            isValid: false
          }
        };
        sanitizedCards.push(fallbackCard);
      }
    }
    
    return sanitizedCards;
  }

  /**
   * Get sanitization summary for a card
   */
  getSanitizationSummary(card: SanitizedPetCard): {
    hasSanitization: boolean;
    violationsFound: number;
    sanitizedFields: string[];
    lastSanitized: Date;
    isValid: boolean;
  } {
    return {
      hasSanitization: !!card.sanitizationInfo,
      violationsFound: card.sanitizationInfo?.violationsFound || 0,
      sanitizedFields: card.metadata?.sanitizedFields || [],
      lastSanitized: card.sanitizationInfo?.lastSanitized || new Date(),
      isValid: card.sanitizationInfo?.isValid ?? true
    };
  }
}

// Export singleton instance
export const petCardSanitizationService = new PetCardSanitizationService();
export default petCardSanitizationService;