import express from 'express';
import { verifyToken, ensureUserExists } from '@/middleware/auth';
import { validate, schemas } from '@/middleware/validation';
import { asyncHandler, successResponse, AppError } from '@/middleware/errorHandler';
import { db } from '@/config/database';

const router = express.Router();

/**
 * POST /api/pet-cards
 * Create a new pet card
 */
router.post(
  '/',
  verifyToken,
  ensureUserExists,
  validate(schemas.createPetCard),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    const cardData = {
      ...req.body,
      userId: req.user.uid
    };

    const card = await db.createPetCard(cardData);
    successResponse(res, card, 'Pet card created successfully', 201);
  })
);

/**
 * GET /api/pet-cards
 * Get user's pet cards with pagination
 */
router.get(
  '/',
  verifyToken,
  ensureUserExists,
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    const { page, limit } = req.query as any;
    const offset = (page - 1) * limit;

    const cards = await db.getUserPetCards(req.user.uid, limit, offset);
    
    const paginatedResponse = require('@/middleware/errorHandler').paginatedResponse;
    paginatedResponse(res, cards, cards.length, page, limit, 'Pet cards retrieved successfully');
  })
);

/**
 * GET /api/pet-cards/:id
 * Get a specific pet card
 */
router.get(
  '/:id',
  verifyToken,
  ensureUserExists,
  validate(schemas.mongoId, 'params'),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AuthenticationError');
    }

    const card = await db.getPetCard(req.params.id);
    
    if (!card) {
      throw new AppError('Pet card not found', 404, 'NotFoundError');
    }

    // Check if user owns this card or if it's public
    if (card.userId !== req.user.uid && !card.isPublic) {
      throw new AppError('Access denied', 403, 'AuthorizationError');
    }

    successResponse(res, card, 'Pet card retrieved successfully');
  })
);

export default router;