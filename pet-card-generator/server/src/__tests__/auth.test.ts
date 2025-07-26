import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../app';
import { auth } from '../config/firebase';

// Mock Firebase Admin
vi.mock('../config/firebase', () => ({
  auth: {
    verifyIdToken: vi.fn(),
    getUser: vi.fn()
  },
  firestore: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => ({
          exists: true,
          id: 'user-123',
          data: () => ({
            email: 'test@example.com',
            displayName: 'Test User'
          })
        })),
        set: vi.fn(),
        update: vi.fn()
      }))
    }))
  }
}));

describe('Auth API', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User',
    photoURL: null,
    customClaims: {}
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful token verification
    (auth.verifyIdToken as any).mockResolvedValue(mockUser);
    (auth.getUser as any).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile for valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uid', mockUser.uid);
      expect(response.body.data).toHaveProperty('email', mockUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject request with invalid token', async () => {
      (auth.verifyIdToken as any).mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer invalid-token`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should handle expired token', async () => {
      (auth.verifyIdToken as any).mockRejectedValue(new Error('Token expired'));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer expired-token`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('TokenExpired');
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify valid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.user).toHaveProperty('uid', mockUser.uid);
    });

    it('should reject invalid token', async () => {
      (auth.verifyIdToken as any).mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer invalid-token`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Authentication middleware', () => {
    it('should handle user creation on first request', async () => {
      // Mock user doesn't exist in database initially
      const mockFirestore = require('../config/firebase').firestore;
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: false
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(mockFirestore.collection().doc().set).toHaveBeenCalled();
    });

    it('should handle Firebase Auth service errors', async () => {
      (auth.verifyIdToken as any).mockRejectedValue(new Error('Firebase service unavailable'));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });
});