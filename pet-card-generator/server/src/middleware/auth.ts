import { Request, Response, NextFunction } from 'express';
import { auth } from '@/config/firebase';
import { db } from '@/config/database';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        emailVerified: boolean;
        displayName?: string;
        photoURL?: string;
        customClaims?: Record<string, any>;
      };
    }
  }
}

/**
 * Middleware to verify Firebase ID token
 */
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authorization header provided'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Get additional user info
    const userRecord = await auth.getUser(decodedToken.uid);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      customClaims: userRecord.customClaims
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error instanceof Error) {
      // Handle specific Firebase Auth errors
      if (error.message.includes('expired')) {
        return res.status(401).json({
          error: 'TokenExpired',
          message: 'Token has expired'
        });
      }
      
      if (error.message.includes('invalid')) {
        return res.status(401).json({
          error: 'InvalidToken',
          message: 'Invalid token provided'
        });
      }
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token verification failed'
    });
  }
};

/**
 * Middleware to require email verification
 */
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'EmailNotVerified',
      message: 'Email verification required'
    });
  }

  next();
};

/**
 * Middleware to check if user exists in database and create if not
 */
export const ensureUserExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Check if user exists in database
    let user = await db.getUser(req.user.uid);
    
    if (!user) {
      // Create user in database
      await db.createUser(req.user.uid, {
        email: req.user.email,
        displayName: req.user.displayName,
        photoURL: req.user.photoURL,
        emailVerified: req.user.emailVerified
      });
      
      user = await db.getUser(req.user.uid);
    }

    // Attach database user to request
    req.user = { ...req.user, ...user };
    
    next();
  } catch (error) {
    console.error('User creation error:', error);
    return res.status(500).json({
      error: 'InternalError',
      message: 'Failed to process user data'
    });
  }
};

/**
 * Middleware to check user permissions
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userPermissions = req.user.customClaims?.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission '${permission}' required`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  const isAdmin = req.user.customClaims?.admin === true;
  
  if (!isAdmin) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return next();
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const userRecord = await auth.getUser(decodedToken.uid);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      customClaims: userRecord.customClaims
    };

    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue without user
    next();
  }
};