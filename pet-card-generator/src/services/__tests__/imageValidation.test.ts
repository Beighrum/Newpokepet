import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validateImage, 
  getImageDimensions, 
  resizeImage, 
  convertImageFormat,
  generateThumbnail 
} from '../imageValidation';

// Mock Image constructor
const mockImage = {
  naturalWidth: 800,
  naturalHeight: 600,
  onload: null as any,
  onerror: null as any,
  src: ''
};

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'mock-url');
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(global, 'Image', {
  value: vi.fn(() => mockImage),
  writable: true
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  },
  writable: true
});

// Mock canvas and context
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '',
    fillRect: vi.fn()
  })),
  toBlob: vi.fn()
};

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: vi.fn(() => mockCanvas),
  writable: true
});

Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {};
  }),
  writable: true
});

describe('imageValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImage.naturalWidth = 800;
    mockImage.naturalHeight = 600;
  });

  describe('validateImage', () => {
    const createMockFile = (name: string, type: string, size: number) => {
      return new File([''], name, { type, lastModified: Date.now() }) as File & { size: number };
    };

    it('validates a valid image file', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024); // 1MB
      file.size = 1024 * 1024;

      // Mock successful image loading
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg', 'image/png']
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileSize).toBe(1024 * 1024);
      expect(result.format).toBe('image/jpeg');
    });

    it('rejects file with invalid format', async () => {
      const file = createMockFile('test.gif', 'image/gif', 1024 * 1024);
      file.size = 1024 * 1024;

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg', 'image/png']
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid file format. Accepted formats: JPEG, PNG');
    });

    it('rejects file that is too large', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 10 * 1024 * 1024); // 10MB
      file.size = 10 * 1024 * 1024;

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg', 'image/png']
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size too large. Maximum size: 5MB');
    });

    it('rejects empty file', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 0);
      file.size = 0;

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg', 'image/png']
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('validates image dimensions', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      file.size = 1024 * 1024;

      mockImage.naturalWidth = 100;
      mockImage.naturalHeight = 100;

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg'],
        minWidth: 200,
        minHeight: 200
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Image width too small. Minimum width: 200px');
      expect(result.errors).toContain('Image height too small. Minimum height: 200px');
    });

    it('detects square images', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      file.size = 1024 * 1024;

      mockImage.naturalWidth = 500;
      mockImage.naturalHeight = 500;

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg'],
        requireSquare: true
      });

      expect(result.isValid).toBe(true);
      expect(result.isSquare).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns about non-square images when square is required', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      file.size = 1024 * 1024;

      mockImage.naturalWidth = 800;
      mockImage.naturalHeight = 600;

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg'],
        requireSquare: true
      });

      expect(result.isValid).toBe(true);
      expect(result.isSquare).toBe(false);
      expect(result.warnings).toContain('Image will be cropped to square format');
    });

    it('warns about large images', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      file.size = 1024 * 1024;

      mockImage.naturalWidth = 3000;
      mockImage.naturalHeight = 2000;

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg']
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large image detected. Consider resizing for better performance.');
    });

    it('handles image loading errors', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      file.size = 1024 * 1024;

      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror();
      }, 0);

      const result = await validateImage(file, {
        maxSizeInMB: 5,
        acceptedFormats: ['image/jpeg']
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unable to read image dimensions. File may be corrupted.');
    });
  });

  describe('getImageDimensions', () => {
    it('returns correct dimensions for valid image', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

      mockImage.naturalWidth = 1920;
      mockImage.naturalHeight = 1080;

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const dimensions = await getImageDimensions(file);

      expect(dimensions.width).toBe(1920);
      expect(dimensions.height).toBe(1080);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('rejects when image fails to load', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror();
      }, 0);

      await expect(getImageDimensions(file)).rejects.toThrow('Failed to load image');
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('resizeImage', () => {
    it('resizes image to specified dimensions', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['resized'], { type: 'image/jpeg' });

      mockImage.width = 1000;
      mockImage.height = 800;
      mockCanvas.toBlob.mockImplementation((callback) => callback(mockBlob));

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await resizeImage(file, 500, 400, 0.8);

      expect(result).toBe(mockBlob);
      expect(mockCanvas.width).toBe(500);
      expect(mockCanvas.height).toBe(400);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.8
      );
    });

    it('handles canvas context not available', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      mockCanvas.getContext.mockReturnValue(null);

      await expect(resizeImage(file, 500, 400)).rejects.toThrow('Canvas context not available');
    });
  });

  describe('convertImageFormat', () => {
    it('converts image to specified format', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      const mockBlob = new Blob(['converted'], { type: 'image/jpeg' });

      mockImage.naturalWidth = 800;
      mockImage.naturalHeight = 600;
      mockCanvas.toBlob.mockImplementation((callback) => callback(mockBlob));

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await convertImageFormat(file, 'image/jpeg', 0.9);

      expect(result).toBe(mockBlob);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.9
      );
    });
  });

  describe('generateThumbnail', () => {
    it('generates square thumbnail from image', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['thumbnail'], { type: 'image/jpeg' });

      mockImage.width = 1000;
      mockImage.height = 800;
      mockCanvas.toBlob.mockImplementation((callback) => callback(mockBlob));

      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      const result = await generateThumbnail(file, 150, 0.7);

      expect(result).toBe(mockBlob);
      expect(mockCanvas.width).toBe(150);
      expect(mockCanvas.height).toBe(150);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.7
      );
    });
  });
});