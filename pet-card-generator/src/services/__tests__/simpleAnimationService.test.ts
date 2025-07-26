import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimpleAnimationService, AnimationConfig } from '../simpleAnimationService';

describe('SimpleAnimationService', () => {
  let service: SimpleAnimationService;

  beforeEach(() => {
    service = new SimpleAnimationService();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('createCSSAnimation', () => {
    it('should create CSS animation successfully', () => {
      const config: AnimationConfig = {
        type: 'fade',
        duration: 2000,
        frames: 5,
        loop: true,
        reverse: false
      };

      const result = service.createCSSAnimation(config);

      expect(result.status).toBe('completed');
      expect(result.type).toBe('css');
      expect(result.config).toEqual(config);
      expect(result.cssAnimation).toBeDefined();
      expect(result.cssAnimation).toContain('@keyframes');
      expect(result.cssAnimation).toContain('pet-card-fade');
    });

    it('should generate different CSS for different animation types', () => {
      const fadeResult = service.createCSSAnimation({
        type: 'fade',
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: false
      });

      const zoomResult = service.createCSSAnimation({
        type: 'zoom',
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: false
      });

      expect(fadeResult.cssAnimation).toContain('opacity');
      expect(zoomResult.cssAnimation).toContain('scale');
      expect(fadeResult.cssAnimation).not.toEqual(zoomResult.cssAnimation);
    });

    it('should handle all supported animation types', () => {
      const types: AnimationConfig['type'][] = ['fade', 'zoom', 'slide', 'bounce', 'pulse', 'boomerang'];

      types.forEach(type => {
        const config: AnimationConfig = {
          type,
          duration: 1000,
          frames: 3,
          loop: true,
          reverse: false
        };

        const result = service.createCSSAnimation(config);

        expect(result.status).toBe('completed');
        expect(result.cssAnimation).toBeDefined();
        expect(result.cssAnimation).toContain(`pet-card-${type}`);
      });
    });

    it('should include animation properties in CSS', () => {
      const config: AnimationConfig = {
        type: 'pulse',
        duration: 3000,
        frames: 5,
        loop: true,
        reverse: true
      };

      const result = service.createCSSAnimation(config);

      expect(result.cssAnimation).toContain('3s'); // duration
      expect(result.cssAnimation).toContain('infinite'); // loop
      expect(result.cssAnimation).toContain('alternate'); // reverse
      expect(result.cssAnimation).toContain('ease-in-out');
    });
  });

  describe('createFrameAnimation', () => {
    it('should create frame animation successfully', async () => {
      const imageUrl = 'https://example.com/pet.jpg';
      const config: AnimationConfig = {
        type: 'zoom',
        duration: 2000,
        frames: 4,
        loop: true,
        reverse: false
      };

      const result = await service.createFrameAnimation(imageUrl, config);

      expect(result.status).toBe('completed');
      expect(result.type).toBe('gif');
      expect(result.config).toEqual(config);
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should estimate reasonable file sizes', async () => {
      const imageUrl = 'https://example.com/pet.jpg';
      
      const smallConfig: AnimationConfig = {
        type: 'fade',
        duration: 1000,
        frames: 2,
        loop: true,
        reverse: false
      };

      const largeConfig: AnimationConfig = {
        type: 'pulse',
        duration: 3000,
        frames: 8,
        loop: true,
        reverse: false
      };

      const smallResult = await service.createFrameAnimation(imageUrl, smallConfig);
      const largeResult = await service.createFrameAnimation(imageUrl, largeConfig);

      expect(smallResult.fileSize).toBeLessThan(largeResult.fileSize!);
      expect(smallResult.fileSize).toBeGreaterThan(0);
      expect(largeResult.fileSize).toBeGreaterThan(0);
    });
  });

  describe('createBoomerangFallback', () => {
    it('should create boomerang fallback animation', () => {
      const imageUrl = 'https://example.com/pet.jpg';
      
      const result = service.createBoomerangFallback(imageUrl);

      expect(result.status).toBe('completed');
      expect(result.type).toBe('fallback');
      expect(result.config.type).toBe('boomerang');
      expect(result.config.frames).toBe(2);
      expect(result.config.loop).toBe(true);
      expect(result.config.reverse).toBe(true);
      expect(result.cssAnimation).toBeDefined();
      expect(result.cssAnimation).toContain('boomerang-fallback');
    });

    it('should generate CSS with scaleX transformation', () => {
      const imageUrl = 'https://example.com/pet.jpg';
      
      const result = service.createBoomerangFallback(imageUrl);

      expect(result.cssAnimation).toContain('scaleX(1)');
      expect(result.cssAnimation).toContain('scaleX(-1)');
    });
  });

  describe('getAnimation', () => {
    it('should retrieve animation by ID', () => {
      const config: AnimationConfig = {
        type: 'fade',
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: false
      };

      const result = service.createCSSAnimation(config);
      const retrieved = service.getAnimation(result.id);

      expect(retrieved).toEqual(result);
    });

    it('should return null for non-existent animation', () => {
      const retrieved = service.getAnimation('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('isUnderSizeLimit', () => {
    it('should check if animation is under size limit', async () => {
      const imageUrl = 'https://example.com/pet.jpg';
      const config: AnimationConfig = {
        type: 'fade',
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: false
      };

      const result = await service.createFrameAnimation(imageUrl, config);
      
      const isUnderDefault = service.isUnderSizeLimit(result);
      const isUnderSmall = service.isUnderSizeLimit(result, 1000); // 1KB limit
      const isUnderLarge = service.isUnderSizeLimit(result, 10 * 1024 * 1024); // 10MB limit

      expect(typeof isUnderDefault).toBe('boolean');
      expect(isUnderSmall).toBe(false); // Should be over 1KB
      expect(isUnderLarge).toBe(true); // Should be under 10MB
    });
  });

  describe('getAnimationCSS', () => {
    it('should return CSS for existing animation', () => {
      const config: AnimationConfig = {
        type: 'bounce',
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: false
      };

      const result = service.createCSSAnimation(config);
      const css = service.getAnimationCSS(result.id);

      expect(css).toBe(result.cssAnimation);
      expect(css).toContain('@keyframes');
    });

    it('should return null for non-existent animation', () => {
      const css = service.getAnimationCSS('non-existent-id');
      expect(css).toBeNull();
    });
  });

  describe('static methods', () => {
    it('should return supported animation types', () => {
      const types = SimpleAnimationService.getSupportedTypes();
      
      expect(types).toContain('fade');
      expect(types).toContain('zoom');
      expect(types).toContain('slide');
      expect(types).toContain('bounce');
      expect(types).toContain('pulse');
      expect(types).toContain('boomerang');
      expect(types).toHaveLength(6);
    });

    it('should return default config for each type', () => {
      const types = SimpleAnimationService.getSupportedTypes();
      
      types.forEach(type => {
        const config = SimpleAnimationService.getDefaultConfig(type);
        
        expect(config.type).toBe(type);
        expect(config.duration).toBeGreaterThan(0);
        expect(config.frames).toBeGreaterThan(0);
        expect(typeof config.loop).toBe('boolean');
        expect(typeof config.reverse).toBe('boolean');
      });
    });

    it('should format file sizes correctly', () => {
      expect(SimpleAnimationService.formatFileSize(0)).toBe('0 Bytes');
      expect(SimpleAnimationService.formatFileSize(1024)).toBe('1 KB');
      expect(SimpleAnimationService.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(SimpleAnimationService.formatFileSize(1536)).toBe('1.5 KB');
      expect(SimpleAnimationService.formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('cleanup', () => {
    it('should clear all animations', () => {
      const config: AnimationConfig = {
        type: 'fade',
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: false
      };

      const result = service.createCSSAnimation(config);
      expect(service.getAnimation(result.id)).toBeDefined();

      service.cleanup();
      expect(service.getAnimation(result.id)).toBeNull();
    });
  });

  describe('animation generation', () => {
    it('should generate unique IDs for each animation', () => {
      const config: AnimationConfig = {
        type: 'fade',
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: false
      };

      const result1 = service.createCSSAnimation(config);
      const result2 = service.createCSSAnimation(config);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^anim_\d+_[a-z0-9]+$/);
      expect(result2.id).toMatch(/^anim_\d+_[a-z0-9]+$/);
    });

    it('should handle boomerang type with reverse frames', () => {
      const config: AnimationConfig = {
        type: 'boomerang',
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: true
      };

      const result = service.createCSSAnimation(config);

      expect(result.status).toBe('completed');
      expect(result.cssAnimation).toContain('rotateY');
      expect(result.cssAnimation).toContain('360deg');
    });
  });

  describe('error handling', () => {
    it('should handle invalid animation types gracefully', () => {
      const config = {
        type: 'invalid-type' as AnimationConfig['type'],
        duration: 1000,
        frames: 3,
        loop: true,
        reverse: false
      };

      const result = service.createCSSAnimation(config);

      expect(result.status).toBe('completed'); // Should still complete with default keyframes
      expect(result.cssAnimation).toBeDefined();
    });
  });
});