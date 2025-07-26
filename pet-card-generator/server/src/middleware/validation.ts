import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'ValidationError',
        message: 'Request validation failed',
        details: errors
      });
    }

    // Replace the original property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // File upload validation
  uploadFile: Joi.object({
    petName: Joi.string().trim().min(1).max(50).required(),
    petType: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    style: Joi.string().valid('realistic', 'cartoon', 'fantasy', 'cyberpunk').default('realistic'),
    isPublic: Joi.boolean().default(false)
  }),

  // Pet card creation
  createPetCard: Joi.object({
    petName: Joi.string().trim().min(1).max(50).required(),
    petType: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    style: Joi.string().valid('realistic', 'cartoon', 'fantasy', 'cyberpunk').required(),
    imageUrl: Joi.string().uri().required(),
    rarity: Joi.string().valid('common', 'uncommon', 'rare', 'epic', 'legendary', 'secret_rare').required(),
    isPublic: Joi.boolean().default(false),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(10).optional()
  }),

  // Pet card update
  updatePetCard: Joi.object({
    petName: Joi.string().trim().min(1).max(50).optional(),
    petType: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    isPublic: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(10).optional()
  }),

  // User profile update
  updateProfile: Joi.object({
    displayName: Joi.string().trim().min(1).max(100).optional(),
    bio: Joi.string().trim().max(500).optional(),
    preferences: Joi.object({
      defaultStyle: Joi.string().valid('realistic', 'cartoon', 'fantasy', 'cyberpunk').optional(),
      publicProfile: Joi.boolean().optional(),
      emailNotifications: Joi.boolean().optional()
    }).optional()
  }),

  // Query parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'petName').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Search parameters
  search: Joi.object({
    q: Joi.string().trim().min(1).max(100).optional(),
    style: Joi.string().valid('realistic', 'cartoon', 'fantasy', 'cyberpunk').optional(),
    rarity: Joi.string().valid('common', 'uncommon', 'rare', 'epic', 'legendary', 'secret_rare').optional(),
    petType: Joi.string().trim().max(100).optional(),
    isPublic: Joi.boolean().optional()
  }),

  // ID parameter validation
  mongoId: Joi.object({
    id: Joi.string().required()
  }),

  // Generation request
  generateCard: Joi.object({
    uploadId: Joi.string().required(),
    style: Joi.string().valid('realistic', 'cartoon', 'fantasy', 'cyberpunk').required(),
    petName: Joi.string().trim().min(1).max(50).required(),
    petType: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    enhancePrompt: Joi.boolean().default(true)
  })
};

/**
 * File validation middleware
 */
export const validateFile = (options: {
  required?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
} = {}) => {
  const {
    required = true,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles = 1
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file as Express.Multer.File | undefined;

    // Check if file is required
    if (required && !file && (!files || files.length === 0)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'File is required'
      });
    }

    // If no file and not required, continue
    if (!file && (!files || files.length === 0)) {
      return next();
    }

    const filesToValidate = files || (file ? [file] : []);

    // Check number of files
    if (filesToValidate.length > maxFiles) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `Maximum ${maxFiles} file(s) allowed`
      });
    }

    // Validate each file
    for (const fileToValidate of filesToValidate) {
      // Check file size
      if (fileToValidate.size > maxSize) {
        return res.status(400).json({
          error: 'ValidationError',
          message: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`
        });
      }

      // Check file type
      if (!allowedTypes.includes(fileToValidate.mimetype)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: `File type must be one of: ${allowedTypes.join(', ')}`
        });
      }

      // Check if file has content
      if (fileToValidate.size === 0) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'File cannot be empty'
        });
      }
    }

    next();
  };
};

/**
 * Sanitize input middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Recursively sanitize object
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize request body, query, and params
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};