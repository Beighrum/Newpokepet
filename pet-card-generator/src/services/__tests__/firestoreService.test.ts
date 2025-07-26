import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FirestoreService } from '../firestoreService';
import { Card, User, createDefaultUser, createCardFromGeneration } from '@/models/Card';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: vi.fn((ms: number) => ({ toMillis: () => ms }))
  }
}));

vi.mock('@/lib/firebase', () => ({
  db: {}
}));

// Import mocked functions
import { 
  doc, 
  collection, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  writeBatch, 
  increment, 
  arrayUnion, 
  arrayRemove,
  Timestamp
} from 'firebase/firestore';

const mockDoc = vi.mocked(doc);
const mockCollection = vi.mocked(collection);
const mockGetDoc = vi.mocked(getDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockAddDoc = vi.mocked(addDoc);
const mockUpdateDoc = vi.mocked(updateDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);
const mockStartAfter = vi.mocked(startAfter);
const mockWriteBatch = vi.mocked(writeBatch);
const mockIncrement = vi.mocked(increment);
const mockArrayUnion = vi.mocked(arrayUnion);
const mockArrayRemove = vi.mocked(arrayRemove);
const mockTimestamp = vi.mocked(Timestamp);

describe('FirestoreService', () => {
  let service: FirestoreService;
  let mockBatch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FirestoreService();
    
    mockBatch = {
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn()
    };
    mockWriteBatch.mockReturnValue(mockBatch);
    mockIncrement.mockImplementation((value) => ({ _increment: value }));
    mockArrayUnion.mockImplementation((value) => ({ _arrayUnion: value }));
    mockArrayRemove.mockImplementation((value) => ({ _arrayRemove: value }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Operations', () => {
    const mockUser: User = createDefaultUser({
      uid: 'user_123',
      email: 'test@example.com',
      displayName: 'Test User'
    });

    describe('createUser', () => {
      it('should create user successfully', async () => {
        mockDoc.mockReturnValue({ id: 'user_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        await service.createUser(mockUser);

        expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'user_123');
        expect(mockUpdateDoc).toHaveBeenCalled();
      });

      it('should validate user before creation', async () => {
        const invalidUser = { ...mockUser, email: 'invalid-email' };

        await expect(service.createUser(invalidUser)).rejects.toThrow('User validation failed');
      });
    });

    describe('getUser', () => {
      it('should return user when found', async () => {
        const mockUserData = {
          ...mockUser,
          createdAt: { toMillis: () => mockUser.createdAt },
          updatedAt: { toMillis: () => mockUser.updatedAt },
          stats: {
            ...mockUser.stats,
            joinDate: { toMillis: () => mockUser.stats.joinDate },
            lastActive: { toMillis: () => mockUser.stats.lastActive }
          }
        };

        mockDoc.mockReturnValue({ id: 'user_123' });
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => mockUserData
        });

        const result = await service.getUser('user_123');

        expect(result).toBeDefined();
        expect(result?.id).toBe('user_123');
        expect(result?.email).toBe('test@example.com');
      });

      it('should return null when user not found', async () => {
        mockDoc.mockReturnValue({ id: 'user_123' });
        mockGetDoc.mockResolvedValue({
          exists: () => false
        });

        const result = await service.getUser('user_123');

        expect(result).toBeNull();
      });
    });

    describe('updateUser', () => {
      it('should update user successfully', async () => {
        mockDoc.mockReturnValue({ id: 'user_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        const updates = { displayName: 'Updated Name' };
        await service.updateUser('user_123', updates);

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          { id: 'user_123' },
          expect.objectContaining({
            displayName: 'Updated Name',
            updatedAt: expect.any(Object)
          })
        );
      });
    });

    describe('updateUserStats', () => {
      it('should update user stats with increments', async () => {
        mockDoc.mockReturnValue({ id: 'user_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        const statUpdates = {
          totalCards: 1,
          cardsGenerated: 1,
          rarityBreakdown: { rare: 1 }
        };

        await service.updateUserStats('user_123', statUpdates);

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          { id: 'user_123' },
          expect.objectContaining({
            'stats.totalCards': { _increment: 1 },
            'stats.cardsGenerated': { _increment: 1 },
            'stats.rarityBreakdown.rare': { _increment: 1 }
          })
        );
      });
    });
  });

  describe('Card Operations', () => {
    const mockCard = createCardFromGeneration(
      'user_123',
      'Test Pet',
      'dog',
      'rare',
      { attack: 75, defense: 60, speed: 80, health: 70, totalPower: 285 },
      {
        originalUrl: 'https://example.com/original.jpg',
        processedUrl: 'https://example.com/processed.jpg',
        width: 512,
        height: 512,
        format: 'jpeg'
      },
      { generationTime: Date.now(), totalFileSize: 500000, version: '1.0.0' }
    );

    describe('createCard', () => {
      it('should create card successfully', async () => {
        mockCollection.mockReturnValue({ name: 'cards' });
        mockAddDoc.mockResolvedValue({ id: 'card_123' });
        mockDoc.mockReturnValue({ id: 'user_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        const cardId = await service.createCard(mockCard);

        expect(cardId).toBe('card_123');
        expect(mockAddDoc).toHaveBeenCalled();
        expect(mockUpdateDoc).toHaveBeenCalled(); // User stats update
      });

      it('should validate card before creation', async () => {
        const invalidCard = { ...mockCard, petName: '' };

        await expect(service.createCard(invalidCard)).rejects.toThrow('Card validation failed');
      });
    });

    describe('getCard', () => {
      it('should return card when found', async () => {
        const mockCardData = {
          ...mockCard,
          createdAt: { toMillis: () => mockCard.createdAt },
          updatedAt: { toMillis: () => mockCard.updatedAt },
          metadata: {
            ...mockCard.metadata,
            generationTime: { toMillis: () => mockCard.metadata.generationTime }
          }
        };

        mockDoc.mockReturnValue({ id: 'card_123' });
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => mockCardData,
          id: 'card_123'
        });

        const result = await service.getCard('card_123');

        expect(result).toBeDefined();
        expect(result?.id).toBe('card_123');
        expect(result?.petName).toBe('Test Pet');
      });

      it('should return null when card not found', async () => {
        mockDoc.mockReturnValue({ id: 'card_123' });
        mockGetDoc.mockResolvedValue({
          exists: () => false
        });

        const result = await service.getCard('card_123');

        expect(result).toBeNull();
      });
    });

    describe('updateCard', () => {
      it('should update card successfully', async () => {
        mockDoc.mockReturnValue({ id: 'card_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        const updates = { isFavorite: true };
        await service.updateCard('card_123', updates);

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          { id: 'card_123' },
          expect.objectContaining({
            isFavorite: true,
            updatedAt: expect.any(Object)
          })
        );
      });
    });

    describe('deleteCard', () => {
      it('should delete card and update user stats', async () => {
        // Mock getCard
        const mockCardData = {
          ...mockCard,
          id: 'card_123',
          createdAt: { toMillis: () => mockCard.createdAt },
          updatedAt: { toMillis: () => mockCard.updatedAt },
          metadata: {
            ...mockCard.metadata,
            generationTime: { toMillis: () => mockCard.metadata.generationTime }
          }
        };

        mockDoc.mockReturnValue({ id: 'card_123' });
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => mockCardData,
          id: 'card_123'
        });

        await service.deleteCard('card_123');

        expect(mockBatch.delete).toHaveBeenCalled();
        expect(mockBatch.update).toHaveBeenCalled();
        expect(mockBatch.commit).toHaveBeenCalled();
      });

      it('should throw error when card not found', async () => {
        mockDoc.mockReturnValue({ id: 'card_123' });
        mockGetDoc.mockResolvedValue({
          exists: () => false
        });

        await expect(service.deleteCard('card_123')).rejects.toThrow('Card not found');
      });
    });

    describe('getUserCards', () => {
      it('should return user cards with pagination', async () => {
        const mockCards = [
          { ...mockCard, id: 'card_1' },
          { ...mockCard, id: 'card_2' }
        ];

        const mockDocs = mockCards.map(card => ({
          data: () => ({
            ...card,
            createdAt: { toMillis: () => card.createdAt },
            updatedAt: { toMillis: () => card.updatedAt },
            metadata: {
              ...card.metadata,
              generationTime: { toMillis: () => card.metadata.generationTime }
            }
          }),
          id: card.id
        }));

        mockCollection.mockReturnValue({ name: 'cards' });
        mockWhere.mockReturnValue({ type: 'where' });
        mockOrderBy.mockReturnValue({ type: 'orderBy' });
        mockLimit.mockReturnValue({ type: 'limit' });
        mockQuery.mockReturnValue({ type: 'query' });
        mockGetDocs.mockResolvedValue({
          docs: mockDocs
        });

        const result = await service.getUserCards('user_123', {
          pagination: { pageSize: 10 }
        });

        expect(result.items).toHaveLength(2);
        expect(result.items[0].id).toBe('card_1');
        expect(result.items[1].id).toBe('card_2');
      });

      it('should apply filters correctly', async () => {
        mockCollection.mockReturnValue({ name: 'cards' });
        mockWhere.mockReturnValue({ type: 'where' });
        mockOrderBy.mockReturnValue({ type: 'orderBy' });
        mockQuery.mockReturnValue({ type: 'query' });
        mockGetDocs.mockResolvedValue({ docs: [] });

        await service.getUserCards('user_123', {
          filters: {
            rarity: 'rare',
            petType: 'dog',
            isFavorite: true
          }
        });

        expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user_123');
        expect(mockWhere).toHaveBeenCalledWith('rarity', '==', 'rare');
        expect(mockWhere).toHaveBeenCalledWith('petType', '==', 'dog');
        expect(mockWhere).toHaveBeenCalledWith('isFavorite', '==', true);
      });
    });
  });

  describe('Collection Operations', () => {
    const mockCollection = {
      id: 'collection_123',
      userId: 'user_123',
      name: 'My Favorites',
      description: 'My favorite pet cards',
      cardIds: ['card_1', 'card_2'],
      isPublic: false,
      tags: ['favorites'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cardCount: 2,
      rarityBreakdown: {
        common: 1,
        uncommon: 1,
        rare: 0,
        epic: 0,
        legendary: 0,
        secret_rare: 0
      }
    };

    describe('createCollection', () => {
      it('should create collection successfully', async () => {
        mockCollection.mockReturnValue({ name: 'collections' });
        mockAddDoc.mockResolvedValue({ id: 'collection_123' });

        const collectionId = await service.createCollection(mockCollection);

        expect(collectionId).toBe('collection_123');
        expect(mockAddDoc).toHaveBeenCalled();
      });
    });

    describe('addCardToCollection', () => {
      it('should add card to collection', async () => {
        mockDoc.mockReturnValue({ id: 'collection_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        await service.addCardToCollection('collection_123', 'card_456');

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          { id: 'collection_123' },
          expect.objectContaining({
            cardIds: { _arrayUnion: 'card_456' },
            cardCount: { _increment: 1 }
          })
        );
      });
    });

    describe('removeCardFromCollection', () => {
      it('should remove card from collection', async () => {
        mockDoc.mockReturnValue({ id: 'collection_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        await service.removeCardFromCollection('collection_123', 'card_456');

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          { id: 'collection_123' },
          expect.objectContaining({
            cardIds: { _arrayRemove: 'card_456' },
            cardCount: { _increment: -1 }
          })
        );
      });
    });
  });

  describe('Card Interaction Tracking', () => {
    describe('recordCardShare', () => {
      it('should record card share and update counts', async () => {
        mockCollection.mockReturnValue({ name: 'cardShares' });
        mockAddDoc.mockResolvedValue({ id: 'share_123' });
        mockDoc.mockReturnValue({ id: 'card_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        await service.recordCardShare('card_123', 'user_123', 'twitter');

        expect(mockAddDoc).toHaveBeenCalled();
        expect(mockUpdateDoc).toHaveBeenCalledTimes(2); // Card and user updates
      });
    });

    describe('recordCardDownload', () => {
      it('should record card download and update counts', async () => {
        mockCollection.mockReturnValue({ name: 'cardDownloads' });
        mockAddDoc.mockResolvedValue({ id: 'download_123' });
        mockDoc.mockReturnValue({ id: 'card_123' });
        mockUpdateDoc.mockResolvedValue(undefined);

        await service.recordCardDownload('card_123', 'user_123', 'png', 500000);

        expect(mockAddDoc).toHaveBeenCalled();
        expect(mockUpdateDoc).toHaveBeenCalledTimes(2); // Card and user updates
      });
    });
  });

  describe('Batch Operations', () => {
    describe('batchUpdateCards', () => {
      it('should update multiple cards in batch', async () => {
        const updates = [
          { cardId: 'card_1', updates: { isFavorite: true } },
          { cardId: 'card_2', updates: { tags: ['updated'] } }
        ];

        mockDoc.mockReturnValue({ id: 'mock_card' });

        await service.batchUpdateCards(updates);

        expect(mockBatch.update).toHaveBeenCalledTimes(2);
        expect(mockBatch.commit).toHaveBeenCalled();
      });
    });

    describe('batchDeleteCards', () => {
      it('should delete multiple cards in batch', async () => {
        const cardIds = ['card_1', 'card_2', 'card_3'];

        mockDoc.mockReturnValue({ id: 'mock_card' });

        await service.batchDeleteCards(cardIds);

        expect(mockBatch.delete).toHaveBeenCalledTimes(3);
        expect(mockBatch.commit).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      mockDoc.mockReturnValue({ id: 'user_123' });
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(service.getUser('user_123')).rejects.toThrow('Firestore error');
    });

    it('should handle validation errors', async () => {
      const invalidCard = createCardFromGeneration(
        'user_123',
        '', // Invalid empty name
        'dog',
        'rare',
        { attack: 75, defense: 60, speed: 80, health: 70, totalPower: 285 },
        {
          originalUrl: 'https://example.com/original.jpg',
          processedUrl: 'https://example.com/processed.jpg',
          width: 512,
          height: 512,
          format: 'jpeg'
        },
        { generationTime: Date.now(), totalFileSize: 500000, version: '1.0.0' }
      );

      await expect(service.createCard(invalidCard)).rejects.toThrow('Card validation failed');
    });
  });
});