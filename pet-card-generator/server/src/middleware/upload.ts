import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import { storage } from '@/config/firebase';
import { AppError } from './errorHandler';

// File type validation
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * File filter function for multer
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new AppError(
      `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      400,
      'InvalidFileType'
    ));
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new AppError(
      `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
      400,
      'InvalidFileExtension'
    ));
  }

  cb(null, true);
};

/**
 * Memory storage configuration for processing before upload
 */
const memoryStorage = multer.memoryStorage();

/**
 * Multer configuration for pet image uploads
 */
export const uploadConfig = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 1 // Only allow single file upload
  }
});

/**
 * Image processing middleware
 */
export const processImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next();
    }

    const file = req.file;
    
    // Process image with Sharp
    const processedBuffer = await sharp(file.buffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 90,
        progressive: true
      })
      .toBuffer();

    // Get image metadata
    const metadata = await sharp(file.buffer).metadata();
    
    // Update file object with processed data
    req.file = {
      ...file,
      buffer: processedBuffer,
      size: processedBuffer.length,
      mimetype: 'image/jpeg',
      originalname: file.originalname.replace(/\.[^/.]+$/, '.jpg')
    };

    // Add metadata to request
    req.imageMetadata = {
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      originalFormat: metadata.format,
      originalSize: file.size,
      processedSize: processedBuffer.length
    };

    next();
  } catch (error) {
    console.error('Image processing error:', error);
    next(new AppError('Failed to process image', 500, 'ImageProcessingError'));
  }
};

/**
 * Upload to Firebase Storage
 */
export const uploadToStorage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next();
    }

    const file = req.file;
    const fileName = `uploads/${uuidv4()}-${Date.now()}.jpg`;
    const bucket = storage.bucket();
    const fileRef = bucket.file(fileName);

    // Upload file to Firebase Storage
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedBy: req.user?.uid || 'anonymous',
          uploadedAt: new Date().toISOString(),
          ...req.imageMetadata
        }
      }
    });

    // Make file publicly readable (optional - you might want to keep it private)
    // await fileRef.makePublic();

    // Get download URL
    const [downloadURL] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Far future date
    });

    // Add upload info to request
    req.uploadResult = {
      fileName,
      downloadURL,
      size: file.size,
      mimetype: file.mimetype,
      metadata: req.imageMetadata
    };

    next();
  } catch (error) {
    console.error('Storage upload error:', error);
    next(new AppError('Failed to upload file', 500, 'StorageUploadError'));
  }
};

/**
 * Generate thumbnail
 */
export const generateThumbnail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next();
    }

    const file = req.file;
    
    // Generate thumbnail
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 80
      })
      .toBuffer();

    const thumbnailFileName = `thumbnails/${uuidv4()}-${Date.now()}-thumb.jpg`;
    const bucket = storage.bucket();
    const thumbnailRef = bucket.file(thumbnailFileName);

    // Upload thumbnail
    await thumbnailRef.save(thumbnailBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          originalName: file.originalname,
          uploadedBy: req.user?.uid || 'anonymous',
          uploadedAt: new Date().toISOString(),
          type: 'thumbnail'
        }
      }
    });

    // Get thumbnail URL
    const [thumbnailURL] = await thumbnailRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });

    // Add thumbnail info to upload result
    if (req.uploadResult) {
      req.uploadResult.thumbnailURL = thumbnailURL;
      req.uploadResult.thumbnailFileName = thumbnailFileName;
    }

    next();
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    // Don't fail the request if thumbnail generation fails
    next();
  }
};

/**
 * Validate image dimensions
 */
export const validateImageDimensions = (minWidth = 100, minHeight = 100, maxWidth = 4096, maxHeight = 4096) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next();
      }

      const metadata = await sharp(req.file.buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        return next(new AppError('Unable to determine image dimensions', 400, 'InvalidImage'));
      }

      if (metadata.width < minWidth || metadata.height < minHeight) {
        return next(new AppError(
          `Image too small. Minimum dimensions: ${minWidth}x${minHeight}px`,
          400,
          'ImageTooSmall'
        ));
      }

      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        return next(new AppError(
          `Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}px`,
          400,
          'ImageTooLarge'
        ));
      }

      next();
    } catch (error) {
      console.error('Image validation error:', error);
      next(new AppError('Failed to validate image', 500, 'ImageValidationError'));
    }
  };
};

/**
 * Clean up uploaded files on error
 */
export const cleanupOnError = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Clean up uploaded files if there was an error
  if (req.uploadResult) {
    const bucket = storage.bucket();
    
    // Delete main file
    if (req.uploadResult.fileName) {
      bucket.file(req.uploadResult.fileName).delete().catch(console.error);
    }
    
    // Delete thumbnail
    if (req.uploadResult.thumbnailFileName) {
      bucket.file(req.uploadResult.thumbnailFileName).delete().catch(console.error);
    }
  }

  next(error);
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      imageMetadata?: {
        originalWidth?: number;
        originalHeight?: number;
        originalFormat?: string;
        originalSize: number;
        processedSize: number;
      };
      uploadResult?: {
        fileName: string;
        downloadURL: string;
        thumbnailURL?: string;
        thumbnailFileName?: string;
        size: number;
        mimetype: string;
        metadata?: any;
      };
    }
  }
}