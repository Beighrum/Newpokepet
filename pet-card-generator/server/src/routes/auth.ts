import express from 'express';
import { verifyToken, ensureUserExists } from '@/middleware/auth';
import { asyncHandler, successResponse } from '@/middleware/errorHandler';

const router = express.Router();

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  verifyToken,
  ensureUserExists,
  asyncHandler(async (req, res) => {
    successResponse(res, req.user, 'User profile retrieved successfully');
  })
);

/**
 * POST /api/auth/verify
 * Verify authentication token
 */
router.post(
  '/verify',
  verifyToken,
  asyncHandler(async (req, res) => {
    successResponse(res, { 
      valid: true, 
      user: req.user 
    }, 'Token is valid');
  })
);

export default router;