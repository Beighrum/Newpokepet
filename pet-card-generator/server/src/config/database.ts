import { firestore } from './firebase';

// Database collections
export const collections = {
  users: 'users',
  petCards: 'petCards',
  uploads: 'uploads',
  generations: 'generations'
} as const;

// Database utilities
export class DatabaseService {
  private db = firestore;

  // User operations
  async createUser(uid: string, userData: any) {
    const userRef = this.db.collection(collections.users).doc(uid);
    await userRef.set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return userRef;
  }

  async getUser(uid: string) {
    const userDoc = await this.db.collection(collections.users).doc(uid).get();
    return userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
  }

  async updateUser(uid: string, userData: any) {
    const userRef = this.db.collection(collections.users).doc(uid);
    await userRef.update({
      ...userData,
      updatedAt: new Date()
    });
    return userRef;
  }

  // Pet card operations
  async createPetCard(cardData: any) {
    const cardRef = this.db.collection(collections.petCards).doc();
    await cardRef.set({
      ...cardData,
      id: cardRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return cardRef;
  }

  async getPetCard(cardId: string) {
    const cardDoc = await this.db.collection(collections.petCards).doc(cardId).get();
    return cardDoc.exists ? { id: cardDoc.id, ...cardDoc.data() } : null;
  }

  async getUserPetCards(uid: string, limit = 20, offset = 0) {
    const query = this.db
      .collection(collections.petCards)
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updatePetCard(cardId: string, cardData: any) {
    const cardRef = this.db.collection(collections.petCards).doc(cardId);
    await cardRef.update({
      ...cardData,
      updatedAt: new Date()
    });
    return cardRef;
  }

  async deletePetCard(cardId: string) {
    await this.db.collection(collections.petCards).doc(cardId).delete();
  }

  // Upload tracking
  async createUploadRecord(uploadData: any) {
    const uploadRef = this.db.collection(collections.uploads).doc();
    await uploadRef.set({
      ...uploadData,
      id: uploadRef.id,
      createdAt: new Date()
    });
    return uploadRef;
  }

  async getUploadRecord(uploadId: string) {
    const uploadDoc = await this.db.collection(collections.uploads).doc(uploadId).get();
    return uploadDoc.exists ? { id: uploadDoc.id, ...uploadDoc.data() } : null;
  }

  async deleteUploadRecord(uploadId: string) {
    await this.db.collection(collections.uploads).doc(uploadId).delete();
  }

  async getUserUploads(uid: string, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc') {
    const query = this.db
      .collection(collections.uploads)
      .where('userId', '==', uid)
      .orderBy(sortBy, sortOrder as any)
      .limit(limit)
      .offset(offset);

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getUserUploadsCount(uid: string) {
    const query = this.db
      .collection(collections.uploads)
      .where('userId', '==', uid);

    const snapshot = await query.get();
    return snapshot.size;
  }

  // Generation tracking
  async createGenerationRecord(generationData: any) {
    const genRef = this.db.collection(collections.generations).doc();
    await genRef.set({
      ...generationData,
      id: genRef.id,
      createdAt: new Date()
    });
    return genRef;
  }

  async updateGenerationRecord(generationId: string, generationData: any) {
    const genRef = this.db.collection(collections.generations).doc(generationId);
    await genRef.update({
      ...generationData,
      updatedAt: new Date()
    });
    return genRef;
  }
}

export const db = new DatabaseService();