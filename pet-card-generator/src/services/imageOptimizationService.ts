interface ImageOptimizationOptions {
  quality?: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
  progressive?: boolean;
}

interface OptimizedImage {
  url: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface ImageVariant {
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original';
  url: string;
  width: number;
  height: number;
  fileSize: number;
}

class ImageOptimizationService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Optimize a single image
  async optimizeImage(
    file: File | string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const {
      quality = 85,
      maxWidth = 1920,
      maxHeight = 1920,
      format = 'webp',
      progressive = true
    } = options;

    try {
      const img = await this.loadImage(file);
      const originalSize = typeof file === 'string' ? 0 : file.size;
      
      // Calculate new dimensions
      const { width, height } = this.calculateOptimalDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      // Resize and compress
      const optimizedBlob = await this.resizeAndCompress(
        img,
        width,
        height,
        format,
        quality / 100,
        progressive
      );

      const optimizedUrl = URL.createObjectURL(optimizedBlob);
      const optimizedSize = optimizedBlob.size;
      const compressionRatio = originalSize > 0 ? (originalSize - optimizedSize) / originalSize : 0;

      return {
        url: optimizedUrl,
        originalSize,
        optimizedSize,
        compressionRatio,
        format,
        dimensions: { width, height }
      };
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw new Error('Failed to optimize image');
    }
  }

  // Generate multiple variants of an image
  async generateImageVariants(file: File): Promise<ImageVariant[]> {
    const variants: Array<{ size: ImageVariant['size']; maxWidth: number; maxHeight: number; quality: number }> = [
      { size: 'thumbnail', maxWidth: 150, maxHeight: 150, quality: 80 },
      { size: 'small', maxWidth: 400, maxHeight: 400, quality: 85 },
      { size: 'medium', maxWidth: 800, maxHeight: 800, quality: 90 },
      { size: 'large', maxWidth: 1200, maxHeight: 1200, quality: 95 },
      { size: 'original', maxWidth: 1920, maxHeight: 1920, quality: 95 }
    ];

    const results: ImageVariant[] = [];

    for (const variant of variants) {
      try {
        const optimized = await this.optimizeImage(file, {
          maxWidth: variant.maxWidth,
          maxHeight: variant.maxHeight,
          quality: variant.quality,
          format: 'webp'
        });

        results.push({
          size: variant.size,
          url: optimized.url,
          width: optimized.dimensions.width,
          height: optimized.dimensions.height,
          fileSize: optimized.optimizedSize
        });
      } catch (error) {
        console.error(`Failed to generate ${variant.size} variant:`, error);
      }
    }

    return results;
  }

  // Batch optimize multiple images
  async batchOptimize(
    files: File[],
    options: ImageOptimizationOptions = {},
    onProgress?: (progress: number, completed: number, total: number) => void
  ): Promise<OptimizedImage[]> {
    const results: OptimizedImage[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      try {
        const optimized = await this.optimizeImage(files[i], options);
        results.push(optimized);
        
        if (onProgress) {
          onProgress((i + 1) / total * 100, i + 1, total);
        }
      } catch (error) {
        console.error(`Failed to optimize image ${i + 1}:`, error);
      }
    }

    return results;
  }

  // Load image from file or URL
  private loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(source);
      }
    });
  }

  // Calculate optimal dimensions while maintaining aspect ratio
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if too large
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  // Resize and compress image
  private async resizeAndCompress(
    img: HTMLImageElement,
    width: number,
    height: number,
    format: string,
    quality: number,
    progressive: boolean
  ): Promise<Blob> {
    this.canvas.width = width;
    this.canvas.height = height;

    // Use high-quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Draw resized image
    this.ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob with compression
    return new Promise((resolve, reject) => {
      const mimeType = `image/${format}`;
      
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  // Get image metadata without loading full image
  async getImageMetadata(file: File): Promise<{
    width: number;
    height: number;
    size: number;
    type: string;
    lastModified: number;
  }> {
    const img = await this.loadImage(file);
    
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };
  }

  // Check if WebP is supported
  supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // Clean up object URLs to prevent memory leaks
  cleanup(urls: string[]): void {
    urls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }
}

// Export singleton instance
export const imageOptimizationService = new ImageOptimizationService();
export default imageOptimizationService;