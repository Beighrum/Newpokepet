export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageValidationOptions {
  maxSizeInMB: number;
  acceptedFormats: string[];
  requireSquare?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileSize: number;
  dimensions?: ImageDimensions;
  format: string;
  isSquare?: boolean;
}

/**
 * Validates an image file against specified criteria
 */
export const validateImage = async (
  file: File,
  options: ImageValidationOptions
): Promise<ImageValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const result: ImageValidationResult = {
    isValid: false,
    errors,
    warnings,
    fileSize: file.size,
    format: file.type
  };

  // Check file type
  if (!options.acceptedFormats.includes(file.type)) {
    errors.push(
      `Invalid file format. Accepted formats: ${options.acceptedFormats
        .map(f => f.split('/')[1].toUpperCase())
        .join(', ')}`
    );
  }

  // Check file size
  const maxSizeInBytes = options.maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    errors.push(`File size too large. Maximum size: ${options.maxSizeInMB}MB`);
  }

  // Check if file is empty
  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Get image dimensions
  try {
    const dimensions = await getImageDimensions(file);
    result.dimensions = dimensions;
    result.isSquare = dimensions.width === dimensions.height;

    // Check minimum dimensions
    if (options.minWidth && dimensions.width < options.minWidth) {
      errors.push(`Image width too small. Minimum width: ${options.minWidth}px`);
    }

    if (options.minHeight && dimensions.height < options.minHeight) {
      errors.push(`Image height too small. Minimum height: ${options.minHeight}px`);
    }

    // Check maximum dimensions
    if (options.maxWidth && dimensions.width > options.maxWidth) {
      errors.push(`Image width too large. Maximum width: ${options.maxWidth}px`);
    }

    if (options.maxHeight && dimensions.height > options.maxHeight) {
      errors.push(`Image height too large. Maximum height: ${options.maxHeight}px`);
    }

    // Check square requirement
    if (options.requireSquare && !result.isSquare) {
      warnings.push('Image will be cropped to square format');
    }

    // Performance warnings
    if (dimensions.width > 2048 || dimensions.height > 2048) {
      warnings.push('Large image detected. Consider resizing for better performance.');
    }

  } catch (error) {
    errors.push('Unable to read image dimensions. File may be corrupted.');
  }

  result.isValid = errors.length === 0;
  return result;
};

/**
 * Gets the dimensions of an image file
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Resizes an image file to specified dimensions
 */
export const resizeImage = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and resize image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Converts image to specified format
 */
export const convertImageFormat = (
  file: File,
  targetFormat: string,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      URL.revokeObjectURL(url);

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Fill with white background for JPEG
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image'));
          }
        },
        targetFormat,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Generates a thumbnail from an image file
 */
export const generateThumbnail = (
  file: File,
  size: number = 150,
  quality: number = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate crop dimensions for square thumbnail
      const { width, height } = img;
      const cropSize = Math.min(width, height);
      const cropX = (width - cropSize) / 2;
      const cropY = (height - cropSize) / 2;

      canvas.width = size;
      canvas.height = size;

      // Draw cropped and resized image
      ctx.drawImage(
        img,
        cropX, cropY, cropSize, cropSize,
        0, 0, size, size
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};