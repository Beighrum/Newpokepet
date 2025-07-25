/**
 * Social Sharing Service with Sanitization
 * Handles sanitized social media sharing and URL generation
 */

import { sanitizationService } from './sanitization';
import { ContentType, SanitizedResult, SecurityViolation } from '../types/sanitization';

interface ShareMetadata {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  hashtags?: string[];
}

interface SanitizedShareMetadata extends ShareMetadata {
  sanitizationInfo: {
    violationsFound: number;
    sanitizedFields: string[];
    isValid: boolean;
  };
}

class SocialSharingService {
  /**
   * Generate sanitized sharing metadata for pet cards
   */
  async generateSanitizedShareMetadata(
    petName: string,
    petType: string,
    rarity: string,
    description?: string,
    imageUrl?: string,
    customTags?: string[]
  ): Promise<SanitizedShareMetadata> {
    const violations: SecurityViolation[] = [];
    const sanitizedFields: string[] = [];

    // Sanitize pet name for title
    const titleResult = await sanitizationService.sanitizeHTML(
      `Check out my ${rarity} ${petName} card!`,
      sanitizationService.getConfigForContentType(ContentType.SOCIAL_SHARING)
    );
    
    if (titleResult.securityViolations.length > 0) {
      violations.push(...titleResult.securityViolations);
      sanitizedFields.push('title');
    }

    // Create and sanitize description
    let shareDescription = description || `I just generated an awesome ${rarity} trading card for my pet ${petName}!`;
    const descriptionResult = await sanitizationService.sanitizeHTML(
      shareDescription,
      sanitizationService.getConfigForContentType(ContentType.SOCIAL_SHARING)
    );
    
    if (descriptionResult.securityViolations.length > 0) {
      violations.push(...descriptionResult.securityViolations);
      sanitizedFields.push('description');
    }

    // Sanitize hashtags
    let sanitizedHashtags: string[] = [];
    if (customTags && Array.isArray(customTags)) {
      for (const tag of customTags) {
        const tagResult = await sanitizationService.sanitizeHTML(
          tag,
          sanitizationService.getConfigForContentType(ContentType.SOCIAL_SHARING)
        );
        
        // Convert to hashtag format and sanitize
        const hashtag = `#${tagResult.sanitizedContent.replace(/[^a-zA-Z0-9]/g, '')}`;
        if (hashtag.length > 1) {
          sanitizedHashtags.push(hashtag);
        }
        
        if (tagResult.securityViolations.length > 0) {
          violations.push(...tagResult.securityViolations);
          if (!sanitizedFields.includes('hashtags')) {
            sanitizedFields.push('hashtags');
          }
        }
      }
    }

    // Add default hashtags
    const defaultHashtags = ['#PetCard', '#TradingCard', `#${rarity}Card`];
    sanitizedHashtags = [...new Set([...sanitizedHashtags, ...defaultHashtags])];

    return {
      title: titleResult.sanitizedContent,
      description: descriptionResult.sanitizedContent,
      imageUrl: imageUrl || '',
      url: window.location.href,
      hashtags: sanitizedHashtags,
      sanitizationInfo: {
        violationsFound: violations.length,
        sanitizedFields,
        isValid: violations.length === 0
      }
    };
  }

  /**
   * Generate sanitized URLs for social media platforms
   */
  generateSanitizedSocialUrls(shareMetadata: SanitizedShareMetadata): {
    twitter: string;
    facebook: string;
    linkedin: string;
    reddit: string;
    whatsapp: string;
  } {
    // Encode components for URL safety
    const encodedTitle = encodeURIComponent(shareMetadata.title);
    const encodedDescription = encodeURIComponent(shareMetadata.description);
    const encodedUrl = encodeURIComponent(shareMetadata.url);
    const encodedHashtags = shareMetadata.hashtags?.join(',') || '';

    return {
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=${encodeURIComponent(encodedHashtags)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDescription}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
    };
  }

  /**
   * Share using Web Share API with sanitized content
   */
  async shareWithWebAPI(shareMetadata: SanitizedShareMetadata): Promise<boolean> {
    if (!navigator.share) {
      return false;
    }

    try {
      await navigator.share({
        title: shareMetadata.title,
        text: shareMetadata.description,
        url: shareMetadata.url
      });
      return true;
    } catch (error) {
      console.error('Web Share API failed:', error);
      return false;
    }
  }

  /**
   * Copy sanitized share content to clipboard
   */
  async copyToClipboard(shareMetadata: SanitizedShareMetadata): Promise<boolean> {
    if (!navigator.clipboard) {
      return false;
    }

    try {
      let shareText = `${shareMetadata.title}\n\n${shareMetadata.description}\n\n${shareMetadata.url}`;
      if (shareMetadata.hashtags && shareMetadata.hashtags.length > 0) {
        shareText += `\n\n${shareMetadata.hashtags.join(' ')}`;
      }
      
      await navigator.clipboard.writeText(shareText);
      return true;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return false;
    }
  }

  /**
   * Validate sharing content for security
   */
  async validateSharingContent(
    title: string,
    description: string,
    hashtags?: string[]
  ): Promise<{
    isValid: boolean;
    violations: SecurityViolation[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendedAction: 'allow' | 'sanitize' | 'block' | 'flag';
  }> {
    const allViolations: SecurityViolation[] = [];
    
    // Validate title
    const titleValidation = await sanitizationService.validateContent(
      title,
      ContentType.SOCIAL_SHARING
    );
    allViolations.push(...titleValidation.violations);

    // Validate description
    const descriptionValidation = await sanitizationService.validateContent(
      description,
      ContentType.SOCIAL_SHARING
    );
    allViolations.push(...descriptionValidation.violations);

    // Validate hashtags
    if (hashtags && Array.isArray(hashtags)) {
      for (const hashtag of hashtags) {
        const hashtagValidation = await sanitizationService.validateContent(
          hashtag,
          ContentType.SOCIAL_SHARING
        );
        allViolations.push(...hashtagValidation.violations);
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
   * Generate Open Graph meta tags with sanitized content
   */
  generateOpenGraphTags(shareMetadata: SanitizedShareMetadata): string[] {
    return [
      `<meta property="og:title" content="${shareMetadata.title}" />`,
      `<meta property="og:description" content="${shareMetadata.description}" />`,
      `<meta property="og:image" content="${shareMetadata.imageUrl}" />`,
      `<meta property="og:url" content="${shareMetadata.url}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="Pet Card Generator" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${shareMetadata.title}" />`,
      `<meta name="twitter:description" content="${shareMetadata.description}" />`,
      `<meta name="twitter:image" content="${shareMetadata.imageUrl}" />`
    ];
  }

  /**
   * Log sharing activity for analytics and security monitoring
   */
  async logSharingActivity(
    shareMetadata: SanitizedShareMetadata,
    platform: string,
    userId?: string
  ): Promise<void> {
    try {
      const logData = {
        platform,
        userId,
        title: shareMetadata.title,
        hasViolations: shareMetadata.sanitizationInfo.violationsFound > 0,
        violationCount: shareMetadata.sanitizationInfo.violationsFound,
        sanitizedFields: shareMetadata.sanitizationInfo.sanitizedFields,
        timestamp: new Date().toISOString(),
        url: shareMetadata.url
      };

      // In a real implementation, this would send to analytics service
      console.log('Sharing activity logged:', logData);
      
      // If there were security violations, also log to security monitoring
      if (shareMetadata.sanitizationInfo.violationsFound > 0) {
        console.warn('Sharing content had security violations:', {
          violationCount: shareMetadata.sanitizationInfo.violationsFound,
          sanitizedFields: shareMetadata.sanitizationInfo.sanitizedFields,
          userId,
          platform
        });
      }
    } catch (error) {
      console.error('Failed to log sharing activity:', error);
    }
  }
}

// Export singleton instance
export const socialSharingService = new SocialSharingService();
export default socialSharingService;