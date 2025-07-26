import { imageOptimizationService } from '../imageOptimizationService';

// Mock canvas and image APIs
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
    drawImage: jest.fn()
  })),
  toBlob: jest.fn((callback, type, quality) => {
    const mockBlob = new Blob(['mock-image-data'], { type });
    callback(mockBlob);
  })
};

const mockImage = {
  width: 800,
  height: 600,
  naturalWidth: 800,
  naturalHeight: 600,
  onload: null as any,
  onerror: null as any,
  src: ''
};

// Mock DOM APIs
Object.defineProperty(document, 'createElement', {
  value: jest.fn((tagName) => {
    if (tagName === 'canvas') return mockCanvas;
    if (tagName === 'img') return mockImage;
    return {};
  })
});

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn()
  }
});

Object.defineProperty(window, 'FileReader', {
  value: jest.fn(() => ({
    onload: null as any,
    onerror: null as any,
    readAsDataURL: jest.fn(function(this: any) {
      setTimeout(() => {
        this.onload({ target: { result: 'data:image/jpeg;base64,mock-data' } });
      }, 0);
    })
  }))
});

describe('ImageOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('optimizeImage', () => {
    it('should optimize a file successfully', async () => {
      const mockFile = new File(['mock-data'], 'test.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Mock image loading
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await imageOptimizationService.optimizeImage(mockFile, {
        quality: 80,
        maxWidth: 1200,
        maxHeight: 1200,
        format: 'webp'
      });

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('originalSize');
      expect(result).toHaveProperty('optimizedSize');
      expect(result).toHaveProperty('compressionRatio');
      expect(result).toHaveProperty('format', 'webp');
      expect(result).toHaveProperty('dimensions');
    });

    it('should handle image loading errors', async () => {
      const mockFile = new File(['mock-data'], 'test.jpg', { type: 'image/jpeg' });

      // Mock image loading error
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror();
        }
      }, 0);

      await expect(imageOptimizationService.optimizeImage(mockFile))
        .rejects.toThrow('Failed to optimize image');
    });

    it('should calculate optimal dimensions correctly', async () => {
      const mockFile = new File(['mock-data'], 'test.jpg', { type: 'image/jpeg' });
      
      // Set up large image dimensions
      mockImage.width = 2400;
      mockImage.height = 1800;
      mockImage.naturalWidth = 2400;
      mockImage.naturalHeight = 1800;

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const result = await imageOptimizationService.optimizeImage(mockFile, {
        maxWidth: 1200,
        maxHeight: 1200
      });

      expect(result.dimensions.width).toBeLessThanOrEqual(1200);
      expect(result.dimensions.height).toBeLessThanOrEqual(1200);
    });
  });

  describe('generateImageVariants', () => {
    it('should generate multiple image variants', async () => {
      const mockFile = new File(['mock-data'], 'test.jpg', { type: 'image/jpeg' });

      // Mock successful image loading for all variants
      let loadCount = 0;
      const originalOnload = mockImage.onload;
      
      Object.defineProperty(mockImage, 'onload', {
        set: function(handler) {
          setTimeout(() => {
            if (handler) {
              handler();
            }
          }, loadCount * 10); // Stagger the loads
          loadCount++;
        },
        get: function() {
          return originalOnload;
        }
      });

      const variants = await imageOptimizationService.generateImageVariants(mockFile);

      expect(variants).toHaveLength(5); // thumbnail, small, medium, large, original
      expect(variants[0].size).toBe('thumbnail');
      expect(variants[1].size).toBe('small');
      expect(variants[2].size).toBe('medium');
      expect(variants[3].size).toBe('large');
      expect(variants[4].size).toBe('original');

      variants.forEach(variant => {
        expect(variant).toHaveProperty('url');
        expect(variant).toHaveProperty('width');
        expect(variant).toHaveProperty('height');
        expect(variant).toHaveProperty('fileSize');
      });
    });
  });

  describe('batchOptimize', () => {
    it('should optimize multiple files with progress tracking', async () => {
      const mockFiles = [
        new File(['mock-data-1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['mock-data-2'], 'test2.jpg', { type: 'image/jpeg' }),
        new File(['mock-data-3'], 'test3.jpg', { type: 'image/jpeg' })
      ];

      const progressCallback = jest.fn();

      // Mock image loading for all files
      let loadCount = 0;
      Object.defineProperty(mockImage, 'onload', {
        set: function(handler) {
          setTimeout(() => {
            if (handler) {
              handler();
            }
          }, loadCount * 10);
          loadCount++;
        }
      });

      const results = await imageOptimizationService.batchOptimize(
        mockFiles,
        { quality: 85 },
        progressCallback
      );

      expect(results).toHaveLength(3);
      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenCalledWith(100, 3, 3); // Final call
    });
  });

  describe('getImageMetadata', () => {
    it('should extract image metadata', async () => {
      const mockFile = new File(['mock-data'], 'test.jpg', { 
        type: 'image/jpeg',
        lastModified: 1234567890
      });

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const metadata = await imageOptimizationService.getImageMetadata(mockFile);

      expect(metadata).toEqual({
        width: mockImage.naturalWidth,
        height: mockImage.naturalHeight,
        size: mockFile.size,
        type: mockFile.type,
        lastModified: mockFile.lastModified
      });
    });
  });

  describe('supportsWebP', () => {
    it('should detect WebP support', () => {
      // Mock canvas toDataURL for WebP support
      mockCanvas.toDataURL = jest.fn((format) => {
        if (format === 'image/webp') {
          return 'data:image/webp;base64,mock-webp-data';
        }
        return 'data:image/png;base64,mock-png-data';
      });

      const supportsWebP = imageOptimizationService.supportsWebP();
      expect(typeof supportsWebP).toBe('boolean');
    });
  });

  describe('cleanup', () => {
    it('should revoke object URLs', () => {
      const mockUrls = [
        'blob:mock-url-1',
        'blob:mock-url-2',
        'https://example.com/image.jpg' // Should not be revoked
      ];

      imageOptimizationService.cleanup(mockUrls);

      expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-1');
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-2');
    });
  });
});