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
        set: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      })),
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => ({
              get: vi.fn(() => ({
                docs: [],
                size: 0
              }))
            }))
          }))
        }))
      }))
    }))
  },
  storage: {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: vi.fn(),
        getSignedUrl: vi.fn(() => Promise.resolve(['https://example.com/file.jpg'])),
        delete: vi.fn()
      }))
    }))
  }
}));

// Mock Sharp
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(() => Promise.resolve(Buffer.from('processed-image'))),
    metadata: vi.fn(() => Promise.resolve({
      width: 800,
      height: 600,
      format: 'jpeg'
    }))
  }));
  return { default: mockSharp };
});

describe('Upload API', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User'
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

  describe('POST /api/upload', () => {
    it('should upload a file successfully', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('petName', 'Fluffy')
        .field('petType', 'Cat')
        .field('description', 'A cute cat')
        .field('style', 'realistic')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('uploadId');
      expect(response.body.data).toHaveProperty('downloadURL');
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/upload')
        .field('petName', 'Fluffy')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('petName', 'Fluffy');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should reject upload without pet name', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('petName', 'Fluffy')
        .attach('image', Buffer.from('fake-image-data'), 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidFileType');
    });

    it('should handle authentication errors', async () => {
      (auth.verifyIdToken as any).mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer invalid-token`)
        .field('petName', 'Fluffy')
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/upload/:uploadId', () => {
    it('should get upload details successfully', async () => {
      // Mock database response
      const mockUpload = {
        id: 'upload-123',
        userId: mockUser.uid,
        fileName: 'test.jpg',
        downloadURL: 'https://example.com/test.jpg'
      };

      const response = await request(app)
        .get('/api/upload/upload-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get('/api/upload/upload-123');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('DELETE /api/upload/:uploadId', () => {
    it('should delete upload successfully', async () => {
      const response = await request(app)
        .delete('/api/upload/upload-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject unauthorized deletion', async () => {
      const response = await request(app)
        .delete('/api/upload/upload-123');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/upload/user/uploads', () => {
    it('should get user uploads with pagination', async () => {
      const response = await request(app)
        .get('/api/upload/user/uploads')
        .set('Authorization', `Bearer ${mockToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should use default pagination values', async () => {
      const response = await request(app)
        .get('/api/upload/user/uploads')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});