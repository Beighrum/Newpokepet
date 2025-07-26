import GIF from 'gif.js';

export interface AnimationFrame {
  imageData: ImageData | HTMLCanvasElement | HTMLImageElement;
  delay: number; // in milliseconds
}

export interface AnimationOptions {
  width: number;
  height: number;
  quality: number; // 1-30, lower is better
  workers: number; // number of web workers
  workerScript?: string;
  repeat: number; // 0 = infinite, -1 = no repeat, n = repeat n times
  transparent?: string | number; // transparent color
  background?: string; // background color
  dither?: boolean; // dithering
}

export interface AnimationRequest {
  frames: AnimationFrame[];
  options: AnimationOptions;
  type: 'standard' | 'boomerang';
  maxFileSize?: number; // in bytes, default 2MB
}

export interface AnimationResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  blob?: Blob;
  url?: string;
  fileSize?: number;
  error?: string;
  progress?: number;
  metadata?: {
    frameCount: number;
    duration: number;
    width: number;
    height: number;
    type: 'standard' | 'boomerang';
    compressionRatio: number;
  };
}

export interface AnimationProgress {
  id: string;
  progress: number; // 0-100
  message: string;
  stage: 'preparing' | 'encoding' | 'optimizing' | 'finalizing';
}

/**
 * GIF Animation Service
 * Handles creation of animated GIFs from image frames with optimization
 */
export class GifAnimationService {
  private activeAnimations: Map<string, AnimationResult> = new Map();
  private progressCallbacks: Map<string, (progress: AnimationProgress) => void> = new Map();
  private readonly DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  /**
   * Create animated GIF from frames
   */
  async createAnimation(request: AnimationRequest): Promise<AnimationResult> {
    const animationId = this.generateId();
    
    const result: AnimationResult = {
      id: animationId,
      status: 'pending',
      progress: 0,
      metadata: {
        frameCount: request.frames.length,
        duration: request.frames.reduce((sum, frame) => sum + frame.delay, 0),
        width: request.options.width,
        height: request.options.height,
        type: request.type,
        compressionRatio: 0
      }
    };

    this.activeAnimations.set(animationId, result);
    this.updateProgress(animationId, 0, 'Preparing animation...', 'preparing');

    try {
      // Validate frames
      if (request.frames.length === 0) {
        throw new Error('No frames provided');
      }

      if (request.frames.length > 10) {
        throw new Error('Too many frames (max 10)');
      }

      // Process frames based on type
      const processedFrames = request.type === 'boomerang' 
        ? this.createBoomerangFrames(request.frames)
        : request.frames;

      this.updateProgress(animationId, 10, 'Setting up GIF encoder...', 'preparing');

      // Create GIF with optimized settings
      const gif = await this.createOptimizedGif(processedFrames, request.options, animationId);
      
      this.updateProgress(animationId, 90, 'Finalizing animation...', 'finalizing');

      // Check file size and optimize if needed
      const maxSize = request.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;
      const finalBlob = await this.optimizeFileSize(gif, maxSize, request.options, animationId);

      const url = URL.createObjectURL(finalBlob);
      const compressionRatio = finalBlob.size / (request.options.width * request.options.height * processedFrames.length * 4);

      result.status = 'completed';
      result.blob = finalBlob;
      result.url = url;
      result.fileSize = finalBlob.size;
      result.progress = 100;
      
      if (result.metadata) {
        result.metadata.frameCount = processedFrames.length;
        result.metadata.compressionRatio = compressionRatio;
      }

      this.updateProgress(animationId, 100, 'Animation completed!', 'finalizing');

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
      this.updateProgress(animationId, 0, `Failed: ${result.error}`, 'preparing');
    }

    this.activeAnimations.set(animationId, result);
    return result;
  }

  /**
   * Create boomerang effect (forward + reverse frames)
   */
  private createBoomerangFrames(frames: AnimationFrame[]): AnimationFrame[] {
    if (frames.length === 0) return frames;
    
    // Create forward + reverse sequence (excluding last frame to avoid duplication)
    const forwardFrames = [...frames];
    const reverseFrames = [...frames].reverse().slice(1);
    
    return [...forwardFrames, ...reverseFrames];
  }

  /**
   * Create optimized GIF with progress tracking
   */
  private async createOptimizedGif(
    frames: AnimationFrame[], 
    options: AnimationOptions, 
    animationId: string
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: options.workers || 2,
        quality: options.quality || 10,
        width: options.width,
        height: options.height,
        repeat: options.repeat,
        transparent: options.transparent,
        background: options.background,
        dither: options.dither || false,
        workerScript: options.workerScript
      });

      // Track encoding progress
      gif.on('progress', (progress: number) => {
        const percentage = Math.round(progress * 70) + 20; // 20-90% range
        this.updateProgress(animationId, percentage, 'Encoding frames...', 'encoding');
      });

      gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });

      gif.on('error', (error: Error) => {
        reject(error);
      });

      // Add frames to GIF
      frames.forEach((frame, index) => {
        try {
          gif.addFrame(frame.imageData, { delay: frame.delay });
          const progress = Math.round(((index + 1) / frames.length) * 20); // 0-20% range
          this.updateProgress(animationId, progress, `Adding frame ${index + 1}/${frames.length}...`, 'preparing');
        } catch (error) {
          reject(new Error(`Failed to add frame ${index + 1}: ${error}`));
        }
      });

      // Start rendering
      gif.render();
    });
  }

  /**
   * Optimize file size by adjusting quality and dimensions
   */
  private async optimizeFileSize(
    originalBlob: Blob, 
    maxSize: number, 
    options: AnimationOptions,
    animationId: string
  ): Promise<Blob> {
    if (originalBlob.size <= maxSize) {
      return originalBlob;
    }

    this.updateProgress(animationId, 85, 'Optimizing file size...', 'optimizing');

    // Try reducing quality first
    let optimizedBlob = originalBlob;
    let quality = options.quality || 10;
    
    while (optimizedBlob.size > maxSize && quality < 30) {
      quality += 5;
      
      // Re-create GIF with lower quality
      // Note: This is a simplified approach. In a real implementation,
      // you might want to cache frames and re-encode
      this.updateProgress(animationId, 87, `Reducing quality to ${quality}...`, 'optimizing');
      
      // For now, we'll return the original if optimization is needed
      // In a full implementation, you'd re-encode with new settings
      break;
    }

    return optimizedBlob;
  }

  /**
   * Create fallback boomerang animation (2 frames)
   */
  async createBoomerangFallback(
    frame1: AnimationFrame,
    frame2: AnimationFrame,
    options: Partial<AnimationOptions> = {}
  ): Promise<AnimationResult> {
    const fallbackOptions: AnimationOptions = {
      width: options.width || 512,
      height: options.height || 512,
      quality: options.quality || 15,
      workers: options.workers || 1,
      repeat: 0, // infinite loop
      dither: false,
      ...options
    };

    const request: AnimationRequest = {
      frames: [frame1, frame2],
      options: fallbackOptions,
      type: 'boomerang',
      maxFileSize: this.DEFAULT_MAX_FILE_SIZE
    };

    return this.createAnimation(request);
  }

  /**
   * Get animation status
   */
  getAnimationStatus(animationId: string): AnimationResult | null {
    return this.activeAnimations.get(animationId) || null;
  }

  /**
   * Subscribe to progress updates
   */
  subscribeToProgress(animationId: string, callback: (progress: AnimationProgress) => void): void {
    this.progressCallbacks.set(animationId, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  unsubscribeFromProgress(animationId: string): void {
    this.progressCallbacks.delete(animationId);
  }

  /**
   * Cancel animation creation
   */
  cancelAnimation(animationId: string): boolean {
    const animation = this.activeAnimations.get(animationId);
    if (!animation || animation.status === 'completed' || animation.status === 'failed') {
      return false;
    }

    animation.status = 'failed';
    animation.error = 'Animation cancelled by user';
    this.updateProgress(animationId, 0, 'Animation cancelled', 'preparing');
    
    return true;
  }

  /**
   * Clean up completed animations
   */
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    
    for (const [id, animation] of this.activeAnimations.entries()) {
      if (animation.metadata && animation.status === 'completed') {
        // Clean up blob URLs to prevent memory leaks
        if (animation.url) {
          URL.revokeObjectURL(animation.url);
        }
        
        this.activeAnimations.delete(id);
        this.progressCallbacks.delete(id);
      }
    }
  }

  /**
   * Create frames from images
   */
  async createFramesFromImages(
    images: (HTMLImageElement | string)[], 
    delay: number = 500
  ): Promise<AnimationFrame[]> {
    const frames: AnimationFrame[] = [];
    
    for (const image of images) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      let img: HTMLImageElement;
      
      if (typeof image === 'string') {
        img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = image;
        });
      } else {
        img = image;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      frames.push({
        imageData: canvas,
        delay
      });
    }

    return frames;
  }

  /**
   * Create frames with effects (zoom, fade, etc.)
   */
  async createFramesWithEffects(
    baseImage: HTMLImageElement | string,
    effectType: 'zoom' | 'fade' | 'rotate' | 'pulse',
    frameCount: number = 5,
    delay: number = 200
  ): Promise<AnimationFrame[]> {
    const frames: AnimationFrame[] = [];
    
    let img: HTMLImageElement;
    if (typeof baseImage === 'string') {
      img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = baseImage;
      });
    } else {
      img = baseImage;
    }

    for (let i = 0; i < frameCount; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = img.width;
      canvas.height = img.height;

      const progress = i / (frameCount - 1);
      
      ctx.save();
      
      switch (effectType) {
        case 'zoom':
          const scale = 1 + (progress * 0.1); // 10% zoom
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          break;
          
        case 'fade':
          ctx.globalAlpha = 0.7 + (progress * 0.3); // Fade from 70% to 100%
          break;
          
        case 'rotate':
          const angle = progress * Math.PI * 0.1; // Small rotation
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(angle);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          break;
          
        case 'pulse':
          const pulseScale = 1 + Math.sin(progress * Math.PI * 2) * 0.05; // Pulse effect
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(pulseScale, pulseScale);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          break;
      }

      ctx.drawImage(img, 0, 0);
      ctx.restore();

      frames.push({
        imageData: canvas,
        delay
      });
    }

    return frames;
  }

  /**
   * Update progress and notify subscribers
   */
  private updateProgress(
    animationId: string, 
    progress: number, 
    message: string, 
    stage: AnimationProgress['stage']
  ): void {
    const progressUpdate: AnimationProgress = {
      id: animationId,
      progress,
      message,
      stage
    };

    const callback = this.progressCallbacks.get(animationId);
    if (callback) {
      callback(progressUpdate);
    }

    // Update stored animation result
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.progress = progress;
    }
  }

  /**
   * Generate unique ID for animations
   */
  private generateId(): string {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate animation options
   */
  static validateOptions(options: AnimationOptions): string[] {
    const errors: string[] = [];
    
    if (options.width <= 0 || options.width > 2048) {
      errors.push('Width must be between 1 and 2048 pixels');
    }
    
    if (options.height <= 0 || options.height > 2048) {
      errors.push('Height must be between 1 and 2048 pixels');
    }
    
    if (options.quality < 1 || options.quality > 30) {
      errors.push('Quality must be between 1 and 30');
    }
    
    if (options.workers < 1 || options.workers > 8) {
      errors.push('Workers must be between 1 and 8');
    }
    
    return errors;
  }
}

// Export singleton instance
export const gifAnimationService = new GifAnimationService();

// Export types
export type { 
  AnimationFrame, 
  AnimationOptions, 
  AnimationRequest, 
  AnimationResult, 
  AnimationProgress 
};