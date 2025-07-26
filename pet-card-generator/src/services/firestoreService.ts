import { 
  collection, 
  doc, 
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
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, User, Collection, CardShare, CardDownload, validateCard, validateUser } from '@/models/Card';
import { RarityLevel } from '@/services/raritySystem';

export interface PaginationOptions {
  pageSize: number;
  lastDoc?: DocumentSnapshot;
}

export interface FilterOptions {
  rarity?: RarityLevel;
  petType?: string;
  isFavorite?: boolean;
  tags?: string[];
  dateRange?: {
    start: number;
    end: number;
  };
}

export interface SortOptions {
  field: 'createdAt' | 'updatedAt' | 'petName' | 'rarity' | 'shareCount';
  direction: 'asc' | 'desc';
}

export interface QueryResult<T> {
  items: T[];
  lastDoc?: DocumentSnapshot;
  hasMore: boolean;
  total?: number;
}

/**
 * Firestore Service for Card and User Management
 */
export class FirestoreService {
  // Collection references
  private readonly USERS_COLLECTION = 'users';
  private readonly CARDS_COLLECTION = 'cards';
  private readonly COLLECTIONS_COLLECTION = 'collections';
  private readonly CARD_SHARES_COLLECTION = 'cardShares';
  private readonly CARD_DOWNLOADS_COLLECTION = 'cardDownloads';

  // User operations
  async createUser(user: User): Promise<void> {
    const errors = validateUser(user);
    if (errors.length > 0) {
      throw new Error(`User validation failed: ${errors.join(', ')}`);
    }

    const userRef = doc(db, this.USERS_COLLECTION, user.id);
    await updateDoc(userRef, {
      ...user,
      createdAt: Timestamp.fromMillis(user.createdAt),
      updatedAt: Timestamp.fromMillis(user.updatedAt)
    });
  }

  async getUser(userId: string): Promise<User | null> {
    const userRef = doc(db, this.USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }

    const data = userSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
      stats: {
        ...data.stats,
        joinDate: data.stats?.joinDate?.toMillis() || Date.now(),
        lastActive: data.stats?.lastActive?.toMillis() || Date.now()
      }
    } as User;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const userRef = doc(db, this.USERS_COLLECTION, userId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    // Convert timestamps
    if (updates.stats?.lastActive) {
      updateData.stats = {
        ...updates.stats,
        lastActive: Timestamp.fromMillis(updates.stats.lastActive)
      };
    }

    await updateDoc(userRef, updateData);
  }

  async updateUserStats(userId: string, statUpdates: Partial<User['stats']>): Promise<void> {
    const userRef = doc(db, this.USERS_COLLECTION, userId);
    const updates: any = {
      updatedAt: Timestamp.now()
    };

    // Handle incremental updates
    Object.entries(statUpdates).forEach(([key, value]) => {
      if (typeof value === 'number' && key !== 'joinDate' && key !== 'lastActive') {
        updates[`stats.${key}`] = increment(value);
      } else if (key === 'lastActive') {
        updates[`stats.${key}`] = Timestamp.fromMillis(value as number);
      } else if (key === 'rarityBreakdown' && typeof value === 'object') {
        Object.entries(value).forEach(([rarity, count]) => {
          updates[`stats.rarityBreakdown.${rarity}`] = increment(count as number);
        });
      }
    });

    await updateDoc(userRef, updates);
  }

  // Card operations
  async createCard(card: Omit<Card, 'id'>): Promise<string> {
    const errors = validateCard(card);
    if (errors.length > 0) {
      throw new Error(`Card validation failed: ${errors.join(', ')}`);
    }

    const cardData = {
      ...card,
      createdAt: Timestamp.fromMillis(card.createdAt),
      updatedAt: Timestamp.fromMillis(card.updatedAt),
      metadata: {
        ...card.metadata,
        generationTime: Timestamp.fromMillis(card.metadata.generationTime)
      }
    };

    const cardRef = await addDoc(collection(db, this.CARDS_COLLECTION), cardData);
    
    // Update user stats
    await this.updateUserStats(card.userId, {
      totalCards: 1,
      cardsGenerated: 1,
      rarityBreakdown: { [card.rarity]: 1 } as any
    });

    return cardRef.id;
  }

  async getCard(cardId: string): Promise<Card | null> {
    const cardRef = doc(db, this.CARDS_COLLECTION, cardId);
    const cardSnap = await getDoc(cardRef);
    
    if (!cardSnap.exists()) {
      return null;
    }

    return this.convertFirestoreCard(cardSnap);
  }

  async updateCard(cardId: string, updates: Partial<Card>): Promise<void> {
    const cardRef = doc(db, this.CARDS_COLLECTION, cardId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    // Convert timestamps in metadata if present
    if (updates.metadata?.generationTime) {
      updateData.metadata = {
        ...updates.metadata,
        generationTime: Timestamp.fromMillis(updates.metadata.generationTime)
      };
    }

    await updateDoc(cardRef, updateData);
  }

  async deleteCard(cardId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Get card to update user stats
    const card = await this.getCard(cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    // Delete card
    const cardRef = doc(db, this.CARDS_COLLECTION, cardId);
    batch.delete(cardRef);

    // Update user stats
    const userRef = doc(db, this.USERS_COLLECTION, card.userId);
    batch.update(userRef, {
      'stats.totalCards': increment(-1),
      [`stats.rarityBreakdown.${card.rarity}`]: increment(-1),
      updatedAt: Timestamp.now()
    });

    await batch.commit();
  }

  async getUserCards(
    userId: string, 
    options: {
      pagination?: PaginationOptions;
      filters?: FilterOptions;
      sort?: SortOptions;
    } = {}
  ): Promise<QueryResult<Card>> {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId)
    ];

    // Apply filters
    if (options.filters) {
      if (options.filters.rarity) {
        constraints.push(where('rarity', '==', options.filters.rarity));
      }
      if (options.filters.petType) {
        constraints.push(where('petType', '==', options.filters.petType));
      }
      if (options.filters.isFavorite !== undefined) {
        constraints.push(where('isFavorite', '==', options.filters.isFavorite));
      }
      if (options.filters.tags && options.filters.tags.length > 0) {
        constraints.push(where('tags', 'array-contains-any', options.filters.tags));
      }
      if (options.filters.dateRange) {
        constraints.push(
          where('createdAt', '>=', Timestamp.fromMillis(options.filters.dateRange.start)),
          where('createdAt', '<=', Timestamp.fromMillis(options.filters.dateRange.end))
        );
      }
    }

    // Apply sorting
    const sortField = options.sort?.field || 'createdAt';
    const sortDirection = options.sort?.direction || 'desc';
    constraints.push(orderBy(sortField, sortDirection));

    // Apply pagination
    if (options.pagination?.pageSize) {
      constraints.push(limit(options.pagination.pageSize));
    }
    if (options.pagination?.lastDoc) {
      constraints.push(startAfter(options.pagination.lastDoc));
    }

    const q = query(collection(db, this.CARDS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const cards = querySnapshot.docs.map(doc => this.convertFirestoreCard(doc));
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === (options.pagination?.pageSize || 0);

    return {
      items: cards,
      lastDoc,
      hasMore
    };
  }

  async searchCards(
    userId: string,
    searchTerm: string,
    options: {
      pagination?: PaginationOptions;
      filters?: FilterOptions;
    } = {}
  ): Promise<QueryResult<Card>> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simplified implementation that searches in pet names
    // In production, you'd use Algolia or similar service
    
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      where('petName', '>=', searchTerm),
      where('petName', '<=', searchTerm + '\uf8ff')
    ];

    // Apply filters (same as getUserCards)
    if (options.filters?.rarity) {
      constraints.push(where('rarity', '==', options.filters.rarity));
    }

    constraints.push(orderBy('petName'), orderBy('createdAt', 'desc'));

    if (options.pagination?.pageSize) {
      constraints.push(limit(options.pagination.pageSize));
    }

    const q = query(collection(db, this.CARDS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const cards = querySnapshot.docs.map(doc => this.convertFirestoreCard(doc));
    
    return {
      items: cards,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1],
      hasMore: querySnapshot.docs.length === (options.pagination?.pageSize || 0)
    };
  }

  // Collection operations
  async createCollection(collection: Omit<Collection, 'id'>): Promise<string> {
    const collectionData = {
      ...collection,
      createdAt: Timestamp.fromMillis(collection.createdAt),
      updatedAt: Timestamp.fromMillis(collection.updatedAt)
    };

    const collectionRef = await addDoc(collection(db, this.COLLECTIONS_COLLECTION), collectionData);
    return collectionRef.id;
  }

  async getCollection(collectionId: string): Promise<Collection | null> {
    const collectionRef = doc(db, this.COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);
    
    if (!collectionSnap.exists()) {
      return null;
    }

    const data = collectionSnap.data();
    return {
      ...data,
      id: collectionSnap.id,
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now()
    } as Collection;
  }

  async addCardToCollection(collectionId: string, cardId: string): Promise<void> {
    const collectionRef = doc(db, this.COLLECTIONS_COLLECTION, collectionId);
    await updateDoc(collectionRef, {
      cardIds: arrayUnion(cardId),
      cardCount: increment(1),
      updatedAt: Timestamp.now()
    });
  }

  async removeCardFromCollection(collectionId: string, cardId: string): Promise<void> {
    const collectionRef = doc(db, this.COLLECTIONS_COLLECTION, collectionId);
    await updateDoc(collectionRef, {
      cardIds: arrayRemove(cardId),
      cardCount: increment(-1),
      updatedAt: Timestamp.now()
    });
  }

  // Card interaction tracking
  async recordCardShare(cardId: string, userId: string, platform: CardShare['platform'], metadata?: CardShare['metadata']): Promise<void> {
    const shareData: Omit<CardShare, 'id'> = {
      cardId,
      userId,
      platform,
      sharedAt: Date.now(),
      metadata
    };

    await addDoc(collection(db, this.CARD_SHARES_COLLECTION), {
      ...shareData,
      sharedAt: Timestamp.fromMillis(shareData.sharedAt)
    });

    // Update card share count
    const cardRef = doc(db, this.CARDS_COLLECTION, cardId);
    await updateDoc(cardRef, {
      shareCount: increment(1),
      updatedAt: Timestamp.now()
    });

    // Update user stats
    await this.updateUserStats(userId, { shareCount: 1 });
  }

  async recordCardDownload(cardId: string, userId: string, format: CardDownload['format'], fileSize: number, metadata?: CardDownload['metadata']): Promise<void> {
    const downloadData: Omit<CardDownload, 'id'> = {
      cardId,
      userId,
      downloadedAt: Date.now(),
      format,
      fileSize,
      metadata
    };

    await addDoc(collection(db, this.CARD_DOWNLOADS_COLLECTION), {
      ...downloadData,
      downloadedAt: Timestamp.fromMillis(downloadData.downloadedAt)
    });

    // Update card download count
    const cardRef = doc(db, this.CARDS_COLLECTION, cardId);
    await updateDoc(cardRef, {
      downloadCount: increment(1),
      updatedAt: Timestamp.now()
    });

    // Update user stats
    await this.updateUserStats(userId, { downloadCount: 1 });
  }

  // Utility methods
  private convertFirestoreCard(doc: DocumentSnapshot): Card {
    const data = doc.data()!;
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
      metadata: {
        ...data.metadata,
        generationTime: data.metadata?.generationTime?.toMillis() || Date.now()
      }
    } as Card;
  }

  // Batch operations
  async batchUpdateCards(updates: Array<{ cardId: string; updates: Partial<Card> }>): Promise<void> {
    const batch = writeBatch(db);
    
    updates.forEach(({ cardId, updates }) => {
      const cardRef = doc(db, this.CARDS_COLLECTION, cardId);
      batch.update(cardRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    });

    await batch.commit();
  }

  async batchDeleteCards(cardIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    
    cardIds.forEach(cardId => {
      const cardRef = doc(db, this.CARDS_COLLECTION, cardId);
      batch.delete(cardRef);
    });

    await batch.commit();
  }

  // Analytics and statistics
  async getCardStatistics(userId: string): Promise<{
    totalCards: number;
    rarityBreakdown: Record<RarityLevel, number>;
    averageFileSize: number;
    totalFileSize: number;
    mostUsedPetTypes: Array<{ petType: string; count: number }>;
    recentActivity: Array<{ date: string; count: number }>;
  }> {
    const cards = await this.getUserCards(userId);
    
    const stats = {
      totalCards: cards.items.length,
      rarityBreakdown: {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
        secret_rare: 0
      } as Record<RarityLevel, number>,
      averageFileSize: 0,
      totalFileSize: 0,
      mostUsedPetTypes: [] as Array<{ petType: string; count: number }>,
      recentActivity: [] as Array<{ date: string; count: number }>
    };

    const petTypeCounts: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};
    let totalFileSize = 0;

    cards.items.forEach(card => {
      // Rarity breakdown
      stats.rarityBreakdown[card.rarity]++;
      
      // Pet type counts
      petTypeCounts[card.petType] = (petTypeCounts[card.petType] || 0) + 1;
      
      // File size
      totalFileSize += card.metadata.totalFileSize;
      
      // Daily activity
      const date = new Date(card.createdAt).toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    stats.totalFileSize = totalFileSize;
    stats.averageFileSize = cards.items.length > 0 ? totalFileSize / cards.items.length : 0;
    
    stats.mostUsedPetTypes = Object.entries(petTypeCounts)
      .map(([petType, count]) => ({ petType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    stats.recentActivity = Object.entries(dailyActivity)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    return stats;
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();

// Export types
export type { PaginationOptions, FilterOptions, SortOptions, QueryResult };