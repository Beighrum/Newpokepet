/**
 * Tests for Social Sharing Service with Sanitization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock navigator APIs before importing the service
const mockNavigator = {
  share: vi.fn(),
  clipboard: {
    writeText: vi.fn()
  }
};

// Mock window object for Node.js environment
const mockWindow = {
  navigator: mockNavigator,
  location: {
    href: 'https://example.com/card/123'
  }
};

// Set up global mocks before importing
Object.defineProperty(globalThis, 'window', {
  value: mockWindow,
  writable: true
});

Object.defineProperty(globalThis, 'navigator', {
  value: mockNavigator,
  writable: true
});

// Now import the service after mocks are set up
import { socialSharingService } from './socialSharingService';

describe('SocialSharingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSanitizedShareMetadata', () => {
    it('should generate sanitized sharing metadata for safe content', async () => {
      const result = await socialSharingService.generateSanitizedShareMetadata(
        'Fluffy',
        'Golden Retriever',
        'Rare',
        'A friendly and energetic dog',
        'https://example.com/image.jpg',
        ['playful', 'friendly', 'energetic']
      );

      expect(result.title).toContain('Fluffy');
      expect(result.title).toContain('Rare');
      expect(result.description).toContain('friendly and energetic dog');
      expect(result.hashtags).toContain('#PetCard');
      expect(result.hashtags).toContain('#RareCard');
      expect(result.hashtags).toContain('#playful');
      expect(result.sanitizationInfo.isValid).toBe(true);
      expect(result.sanitizationInfo.violationsFound).toBe(0);
    });

    it('should sanitize malicious content in sharing metadata', async () => {
      const result = await socialSharingService.generateSanitizedShareMetadata(
        'Fluffy<script>alert("xss")</script>',
        'Dog',
        'Common',
        'A pet<script>hack()</script> description',
        'https://example.com/image.jpg',
        ['playful<script>alert(1)</script>', 'friendly']
      );

      expect(result.title).not.toContain('<script>');
      expect(result.description).not.toContain('<script>');
      expect(result.hashtags.join(' ')).not.toContain('<script>');
      expect(result.sanitizationInfo.isValid).toBe(false);
      expect(result.sanitizationInfo.violationsFound).toBeGreaterThan(0);
      expect(result.sanitizationInfo.sanitizedFields.length).toBeGreaterThan(0);
    });

    it('should handle empty optional parameters', async () => {
      const result = await socialSharingService.generateSanitizedShareMetadata(
        'Fluffy',
        'Dog',
        'Common'
      );

      expect(result.title).toContain('Fluffy');
      expect(result.description).toContain('Common');
      expect(result.hashtags).toContain('#PetCard');
      expect(result.hashtags).toContain('#CommonCard');
      expect(result.sanitizationInfo.isValid).toBe(true);
    });

    it('should generate proper hashtags from custom tags', async () => {
      const result = await socialSharingService.generateSanitizedShareMetadata(
        'Fluffy',
        'Dog',
        'Rare',
        undefined,
        undefined,
        ['very playful', 'super-friendly', 'high energy!']
      );

      expect(result.hashtags).toContain('#veryplayful');
      expect(result.hashtags).toContain('#superfriendly');
      expect(result.hashtags).toContain('#highenergy');
    });
  });

  describe('generateSanitizedSocialUrls', () => {
    it('should generate proper social media URLs', () => {
      const shareMetadata = {
        title: 'Check out my Rare Fluffy card!',
        description: 'I just generated an awesome Rare trading card for my pet Fluffy!',
        imageUrl: 'https://example.com/image.jpg',
        url: 'https://example.com/card/123',
        hashtags: ['#PetCard', '#RareCard', '#playful'],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      const urls = socialSharingService.generateSanitizedSocialUrls(shareMetadata);

      expect(urls.twitter).toContain('twitter.com/intent/tweet');
      expect(urls.twitter).toContain(encodeURIComponent(shareMetadata.title));
      expect(urls.twitter).toContain(encodeURIComponent(shareMetadata.url));

      expect(urls.facebook).toContain('facebook.com/sharer/sharer.php');
      expect(urls.facebook).toContain(encodeURIComponent(shareMetadata.url));

      expect(urls.linkedin).toContain('linkedin.com/sharing/share-offsite');
      expect(urls.linkedin).toContain(encodeURIComponent(shareMetadata.title));

      expect(urls.reddit).toContain('reddit.com/submit');
      expect(urls.reddit).toContain(encodeURIComponent(shareMetadata.title));

      expect(urls.whatsapp).toContain('wa.me');
      expect(urls.whatsapp).toContain(encodeURIComponent(shareMetadata.title));
    });

    it('should properly encode special characters in URLs', () => {
      const shareMetadata = {
        title: 'Check out my pet "Fluffy" & friends!',
        description: 'Amazing card with 100% cuteness!',
        imageUrl: 'https://example.com/image.jpg',
        url: 'https://example.com/card/123?ref=share&utm=test',
        hashtags: ['#PetCard'],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      const urls = socialSharingService.generateSanitizedSocialUrls(shareMetadata);

      // Check that special characters are properly encoded
      expect(urls.twitter).toContain('%22'); // encoded quote
      expect(urls.twitter).toContain('%26'); // encoded ampersand
      expect(urls.facebook).toContain('%3F'); // encoded question mark
    });
  });

  describe('shareWithWebAPI', () => {
    it('should use Web Share API when available', async () => {
      mockNavigator.share.mockResolvedValue(undefined);

      const shareMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        imageUrl: '',
        hashtags: [],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      const result = await socialSharingService.shareWithWebAPI(shareMetadata);

      expect(result).toBe(true);
      expect(mockNavigator.share).toHaveBeenCalledWith({
        title: shareMetadata.title,
        text: shareMetadata.description,
        url: shareMetadata.url
      });
    });

    it('should return false when Web Share API is not available', async () => {
      const originalShare = mockNavigator.share;
      delete mockNavigator.share;

      const shareMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        imageUrl: '',
        hashtags: [],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      const result = await socialSharingService.shareWithWebAPI(shareMetadata);

      expect(result).toBe(false);

      // Restore
      mockNavigator.share = originalShare;
    });

    it('should handle Web Share API errors gracefully', async () => {
      mockNavigator.share.mockRejectedValue(new Error('User cancelled'));

      const shareMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        imageUrl: '',
        hashtags: [],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      const result = await socialSharingService.shareWithWebAPI(shareMetadata);

      expect(result).toBe(false);
    });
  });

  describe('copyToClipboard', () => {
    it('should copy share content to clipboard', async () => {
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);

      const shareMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        imageUrl: '',
        hashtags: ['#test', '#card'],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      const result = await socialSharingService.copyToClipboard(shareMetadata);

      expect(result).toBe(true);
      expect(mockNavigator.clipboard.writeText).toHaveBeenCalled();
      
      const clipboardContent = mockNavigator.clipboard.writeText.mock.calls[0][0];
      expect(clipboardContent).toContain(shareMetadata.title);
      expect(clipboardContent).toContain(shareMetadata.description);
      expect(clipboardContent).toContain(shareMetadata.url);
      expect(clipboardContent).toContain('#test #card');
    });

    it('should return false when clipboard API is not available', async () => {
      const originalClipboard = mockNavigator.clipboard;
      delete mockNavigator.clipboard;

      const shareMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        imageUrl: '',
        hashtags: [],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      const result = await socialSharingService.copyToClipboard(shareMetadata);

      expect(result).toBe(false);

      // Restore
      mockNavigator.clipboard = originalClipboard;
    });
  });

  describe('validateSharingContent', () => {
    it('should validate safe sharing content', async () => {
      const result = await socialSharingService.validateSharingContent(
        'Check out my pet card!',
        'A friendly pet card description',
        ['playful', 'friendly']
      );

      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.recommendedAction).toBe('allow');
      expect(result.violations.length).toBe(0);
    });

    it('should detect malicious sharing content', async () => {
      const result = await socialSharingService.validateSharingContent(
        'Check out my pet<script>alert("xss")</script>',
        'Description with <script>hack()</script>',
        ['tag<script>alert(1)</script>']
      );

      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe('critical');
      expect(result.recommendedAction).toBe('block');
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('generateOpenGraphTags', () => {
    it('should generate proper Open Graph meta tags', () => {
      const shareMetadata = {
        title: 'My Pet Card',
        description: 'Check out this awesome pet card!',
        imageUrl: 'https://example.com/image.jpg',
        url: 'https://example.com/card/123',
        hashtags: [],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      const tags = socialSharingService.generateOpenGraphTags(shareMetadata);

      expect(tags).toContain('<meta property="og:title" content="My Pet Card" />');
      expect(tags).toContain('<meta property="og:description" content="Check out this awesome pet card!" />');
      expect(tags).toContain('<meta property="og:image" content="https://example.com/image.jpg" />');
      expect(tags).toContain('<meta property="og:url" content="https://example.com/card/123" />');
      expect(tags).toContain('<meta property="og:type" content="website" />');
      expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    });
  });

  describe('logSharingActivity', () => {
    it('should log sharing activity without errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const shareMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        imageUrl: '',
        hashtags: [],
        sanitizationInfo: {
          violationsFound: 0,
          sanitizedFields: [],
          isValid: true
        }
      };

      await socialSharingService.logSharingActivity(shareMetadata, 'twitter', 'user123');

      expect(consoleSpy).toHaveBeenCalledWith('Sharing activity logged:', expect.any(Object));

      consoleSpy.mockRestore();
    });

    it('should log security warnings for content with violations', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const shareMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        imageUrl: '',
        hashtags: [],
        sanitizationInfo: {
          violationsFound: 2,
          sanitizedFields: ['title', 'description'],
          isValid: false
        }
      };

      await socialSharingService.logSharingActivity(shareMetadata, 'twitter', 'user123');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Sharing content had security violations:',
        expect.objectContaining({
          violationCount: 2,
          sanitizedFields: ['title', 'description'],
          userId: 'user123',
          platform: 'twitter'
        })
      );

      consoleWarnSpy.mockRestore();
    });
  });
});