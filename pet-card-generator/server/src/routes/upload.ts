import express from 'express';
import { verifyToken, ensureUserExists } from '@/middleware/auth';
import { validate, schemas, validateFile } from '@/middleware/validation';
import { 
  uploadConfig, 
  processImage, 
  uploadToStorage, 
  generateThumbnail,
  validateImageDimensions,
  cleanupOnError
} from '@/middleware/upload';
import { asyncHandler, successResponse, AppError } from '@/middleware/errorHandler';
import { db } from '@/config/database';

const router = express.Router();

/**
 * POST /api/upload
 * Upload a pet image for card generation
 */
router.post(
  '/',
  verifyToken,
  ensureUserExists,
  uploadConfig.single('image'),
  validateFile({
    required: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  }),
  validate(schemas.uploadFile),
  validateImageDimensions(100, 100, 4096, 4096),
  processImage,
  uploadToStorage,
  generateThumbnail,
  asyncHandler(async (req, res) => {
    if (!req.uploadResult) {
      throw new AppError('Upload failed', 500, 'UploadError');
    }

    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    // Save upload record to database
    const uploadRecord = await db.createUploadRecord({
      userId: req.user.uid,
      fileName: req.uploadResult.fileName,
      originalName: req.file?.originalname,
      downloadURL: req.uploadResult.downloadURL,
      thumbnailURL: req.uploadResult.thumbnailURL,
      size: req.uploadResult.size,
      mimetype: req.uploadResult.mimetype,
      metadata: {
        ...req.uploadResult.metadata,
        petName: req.body.petName,
        petType: req.body.petType,
        description: req.body.description,
        style: req.body.style,
        isPublic: req.body.isPublic
      },
      status: 'uploaded'
    });

    successResponse(res, {
      uploadId: uploadRecord.id,
      downloadURL: req.uploadResult.downloadURL,
      thumbnailURL: req.uploadResult.thumbnailURL,
      fileName: req.uploadResult.fileName,
      size: req.uploadResult.size,
      metadata: req.uploadResult.metadata
    }, 'File uploaded successfully', 201);
  }),
  cleanupOnError
);

/**
 * GET /api/upload/:uploadId
 * Get upload details
 */
router.get(
  '/:uploadId',
  verifyToken,
  ensureUserExists,
  validate(schemas.mongoId, 'params'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    const upload = await db.getUploadRecord(req.params.uploadId);
    
    if (!upload) {
      throw new AppError('Upload not found', 404, 'NotFoundError');
    }

    // Check if user owns this upload
    if (upload.userId !== req.user.uid) {
      throw new AppError('Access denied', 403, 'AuthorizationError');
    }

    successResponse(res, upload, 'Upload retrieved successfully');
  })
);

/**
 * DELETE /api/upload/:uploadId
 * Delete an upload and its associated files
 */
router.delete(
  '/:uploadId',
  verifyToken,
  ensureUserExists,
  validate(schemas.mongoId, 'params'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    const upload = await db.getUploadRecord(req.params.uploadId);
    
    if (!upload) {
      throw new AppError('Upload not found', 404, 'NotFoundError');
    }

    // Check if user owns this upload
    if (upload.userId !== req.user.uid) {
      throw new AppError('Access denied', 403, 'AuthorizationError');
    }

    // Delete files from storage
    const { storage } = require('@/config/firebase');
    const bucket = storage.bucket();

    try {
      // Delete main file
      if (upload.fileName) {
        await bucket.file(upload.fileName).delete();
      }

      // Delete thumbnail
      if (upload.thumbnailFileName) {
        await bucket.file(upload.thumbnailFileName).delete();
      }
    } catch (error) {
      console.error('Error deleting files from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete upload record from database
    await db.deleteUploadRecord(req.params.uploadId);

    successResponse(res, null, 'Upload deleted successfully');
  })
);

/**
 * GET /api/upload/user/uploads
 * Get user's uploads with pagination
 */
router.get(
  '/user/uploads',
  verifyToken,
  ensureUserExists,
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    const { page, limit, sortBy, sortOrder } = req.query as any;
    const offset = (page - 1) * limit;

    const uploads = await db.getUserUploads(req.user.uid, limit, offset, sortBy, sortOrder);
    const total = await db.getUserUploadsCount(req.user.uid);

    const paginatedResponse = require('@/middleware/errorHandler').paginatedResponse;
    paginatedResponse(res, uploads, total, page, limit, 'Uploads retrieved successfully');
  })
);

export default router;