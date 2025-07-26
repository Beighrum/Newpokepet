import express from 'express';
import { verifyToken, ensureUserExists } from '@/middleware/auth';
import { validate, schemas } from '@/middleware/validation';
import { asyncHandler, successResponse, AppError } from '@/middleware/errorHandler';
import { db } from '@/config/database';

const router = express.Router();

/**
 * GET /api/users/profile
 * Get user profile
 */
router.get(
  '/profile',
  verifyToken,
  ensureUserExists,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    const user = await db.getUser(req.user.uid);
    successResponse(res, user, 'User profile retrieved successfully');
  })
);

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put(
  '/profile',
  verifyToken,
  ensureUserExists,
  validate(schemas.updateProfile),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    await db.updateUser(req.user.uid, req.body);
    const updatedUser = await db.getUser(req.user.uid);
    
    successResponse(res, updatedUser, 'User profile updated successfully');
  })
);

export default router;