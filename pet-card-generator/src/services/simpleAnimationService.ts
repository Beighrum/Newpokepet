export interface AnimationConfig {
  type: 'fade' | 'zoom' | 'slide' | 'bounce' | 'pulse' | 'boomerang';
  duration: number; // in milliseconds
  frames: number; // number of animation frames
  loop: boolean;
  reverse: boolean;
}

export interface AnimationResult {
  id: string;
  type: 'css' | 'gif' | 'fallback';
  config: AnimationConfig;
  cssAnimation?: string;
  gifBlob?: Blob;
  gifUrl?: string;
  fileSize?: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface AnimationFrame {
  imageUrl: string;
  delay: number;
  transform?: string;
  opacity?: number;
}

/**
 * Simple Animation Service
 * Creates lightweight animations using CSS and simple frame sequences
 */
export class SimpleAnimationService {
  private animations: Map<string, AnimationResult> = new Map();

  /**
   * Create CSS-based animation
   */
  createCSSAnimation(config: AnimationConfig): AnimationResult {
    const animationId = this.generateId();
    
    const result: AnimationResult = {
      id: animationId,
      type: 'css',
      config,
      status: 'pending'
    };

    try {
      const cssAnimation = this.generateCSSAnimation(config);
      
      result.cssAnimation = cssAnimation;
      result.status = 'completed';
      
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'CSS animation creation failed';
    }

    this.animations.set(animationId, result);
    return result;
  }

  /**
   * Create simple frame-based animation
   */
  async createFrameAnimation(
    baseImageUrl: string,
    config: AnimationConfig
  ): Promise<AnimationResult> {
    const animationId = this.generateId();
    
    const result: AnimationResult = {
      id: animationId,
      type: 'gif',
      config,
      status: 'pending'
    };

    try {
      // Create frames based on animation type
      const frames = await this.generateFrames(baseImageUrl, config);
      
      // For now, we'll create a simple data structure
      // In a full implementation, this would generate an actual GIF
      result.status = 'completed';
      result.fileSize = this.estimateFileSize(frames);
      
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Frame animation creation failed';
    }

    this.animations.set(animationId, result);
    return result;
  }

  /**
   * Create fallback boomerang animation
   */
  createBoomerangFallback(imageUrl: string): AnimationResult {
    const config: AnimationConfig = {
      type: 'boomerang',
      duration: 1000,
      frames: 2,
      loop: true,
      reverse: true
    };

    const animationId = this.generateId();
    
    const result: AnimationResult = {
      id: animationId,
      type: 'fallback',
      config,
      status: 'completed',
      cssAnimation: this.generateBoomerangCSS()
    };

    this.animations.set(animationId, result);
    return result;
  }

  /**
   * Generate CSS animation based on config
   */
  private generateCSSAnimation(config: AnimationConfig): string {
    const animationName = `pet-card-${config.type}`;
    const duration = config.duration / 1000; // Convert to seconds
    const iteration = config.loop ? 'infinite' : '1';
    const direction = config.reverse ? 'alternate' : 'normal';

    let keyframes = '';
    
    switch (config.type) {
      case 'fade':
        keyframes = `
          @keyframes ${animationName} {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }
        `;
        break;
        
      case 'zoom':
        keyframes = `
          @keyframes ${animationName} {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `;
        break;
        
      case 'slide':
        keyframes = `
          @keyframes ${animationName} {
            0% { transform: translateX(0); }
            25% { transform: translateX(2px); }
            75% { transform: translateX(-2px); }
            100% { transform: translateX(0); }
          }
        `;
        break;
        
      case 'bounce':
        keyframes = `
          @keyframes ${animationName} {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
        `;
        break;
        
      case 'pulse':
        keyframes = `
          @keyframes ${animationName} {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.02); opacity: 0.9; }
            100% { transform: scale(1); opacity: 1; }
          }
        `;
        break;
        
      case 'boomerang':
        keyframes = `
          @keyframes ${animationName} {
            0% { transform: rotateY(0deg); }
            50% { transform: rotateY(180deg); }
            100% { transform: rotateY(360deg); }
          }
        `;
        break;
        
      default:
        keyframes = `
          @keyframes ${animationName} {
            0%, 100% { transform: none; }
          }
        `;
    }

    return `
      ${keyframes}
      
      .pet-card-animated {
        animation: ${animationName} ${duration}s ease-in-out ${iteration} ${direction};
        transform-origin: center;
      }
    `;
  }

  /**
   * Generate boomerang CSS for fallback
   */
  private generateBoomerangCSS(): string {
    return `
      @keyframes pet-card-boomerang-fallback {
        0% { transform: scaleX(1); }
        50% { transform: scaleX(-1); }
        100% { transform: scaleX(1); }
      }
      
      .pet-card-boomerang-fallback {
        animation: pet-card-boomerang-fallback 1s ease-in-out infinite;
        transform-origin: center;
      }
    `;
  }

  /**
   * Generate animation frames
   */
  private async generateFrames(
    baseImageUrl: string,
    config: AnimationConfig
  ): Promise<AnimationFrame[]> {
    const frames: AnimationFrame[] = [];
    const frameDelay = config.duration / config.frames;

    for (let i = 0; i < config.frames; i++) {
      const progress = i / (config.frames - 1);
      
      let transform = '';
      let opacity = 1;

      switch (config.type) {
        case 'fade':
          opacity = 0.7 + (Math.sin(progress * Math.PI) * 0.3);
          break;
          
        case 'zoom':
          const scale = 1 + (Math.sin(progress * Math.PI) * 0.05);
          transform = `scale(${scale})`;
          break;
          
        case 'pulse':
          const pulseScale = 1 + (Math.sin(progress * Math.PI * 2) * 0.02);
          transform = `scale(${pulseScale})`;
          opacity = 1 - (Math.sin(progress * Math.PI * 2) * 0.1);
          break;
          
        case 'bounce':
          const bounceY = Math.sin(progress * Math.PI) * -5;
          transform = `translateY(${bounceY}px)`;
          break;
      }

      frames.push({
        imageUrl: baseImageUrl,
        delay: frameDelay,
        transform,
        opacity
      });
    }

    // Add reverse frames for boomerang effect
    if (config.type === 'boomerang') {
      const reverseFrames = [...frames].reverse().slice(1);
      frames.push(...reverseFrames);
    }

    return frames;
  }

  /**
   * Estimate file size for animation
   */
  private estimateFileSize(frames: AnimationFrame[]): number {
    // Simple estimation: assume each frame is ~50KB
    const baseFrameSize = 50 * 1024; // 50KB
    const compressionRatio = 0.7; // 70% compression
    
    return Math.round(frames.length * baseFrameSize * compressionRatio);
  }

  /**
   * Get animation by ID
   */
  getAnimation(animationId: string): AnimationResult | null {
    return this.animations.get(animationId) || null;
  }

  /**
   * Check if file size is under limit
   */
  isUnderSizeLimit(animation: AnimationResult, maxSize: number = 2 * 1024 * 1024): boolean {
    return (animation.fileSize || 0) <= maxSize;
  }

  /**
   * Get animation CSS for injection
   */
  getAnimationCSS(animationId: string): string | null {
    const animation = this.animations.get(animationId);
    return animation?.cssAnimation || null;
  }

  /**
   * Clean up animations
   */
  cleanup(): void {
    // Clean up blob URLs to prevent memory leaks
    for (const [id, animation] of this.animations.entries()) {
      if (animation.gifUrl) {
        URL.revokeObjectURL(animation.gifUrl);
      }
    }
    this.animations.clear();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get supported animation types
   */
  static getSupportedTypes(): AnimationConfig['type'][] {
    return ['fade', 'zoom', 'slide', 'bounce', 'pulse', 'boomerang'];
  }

  /**
   * Get default config for animation type
   */
  static getDefaultConfig(type: AnimationConfig['type']): AnimationConfig {
    const baseConfig = {
      duration: 2000,
      frames: 5,
      loop: true,
      reverse: false
    };

    switch (type) {
      case 'fade':
        return { ...baseConfig, type, duration: 3000 };
      case 'zoom':
        return { ...baseConfig, type, duration: 2000 };
      case 'slide':
        return { ...baseConfig, type, duration: 1500 };
      case 'bounce':
        return { ...baseConfig, type, duration: 1000 };
      case 'pulse':
        return { ...baseConfig, type, duration: 2500 };
      case 'boomerang':
        return { ...baseConfig, type, duration: 1000, frames: 2, reverse: true };
      default:
        return { ...baseConfig, type };
    }
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const simpleAnimationService = new SimpleAnimationService();

// Export types
export type { AnimationConfig, AnimationResult, AnimationFrame };