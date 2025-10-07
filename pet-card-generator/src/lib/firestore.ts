import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore"
import { db } from "./firebase"

// Card type definition matching Firestore schema
export interface Card {
  id: string
  ownerUid: string
  name: string
  element: string
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Secret"
  stage: "Baby" | "Adult" | "Elder"
  level: number
  xp: number
  stats: {
    heart: number
    speed: number
    power: number
    focus: number
  }
  personality: string[]
  prompt: string
  imageUrl: string
  createdAt: number
  updatedAt: number
  status: "queued" | "processing" | "ready" | "failed"
  parentId?: string | null
}

// Real-time listener for user's cards
export const subscribeToUserCards = (
  userId: string,
  callback: (cards: Card[]) => void,
  onError?: (error: Error) => void,
) => {
  const cardsQuery = query(collection(db, "cards"), where("ownerUid", "==", userId), orderBy("createdAt", "desc"))

  return onSnapshot(
    cardsQuery,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const cards: Card[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamps to numbers
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
      })) as Card[]
      callback(cards)
    },
    (error) => {
      console.error("Error listening to cards:", error)
      onError?.(error)
    },
  )
}

// Get cards with filtering and sorting
export const getUserCards = async (
  userId: string,
  filters?: {
    status?: string
    rarity?: string
    limit?: number
  },
): Promise<Card[]> => {
  let cardsQuery = query(collection(db, "cards"), where("ownerUid", "==", userId), orderBy("createdAt", "desc"))

  if (filters?.status && filters.status !== "all") {
    cardsQuery = query(cardsQuery, where("status", "==", filters.status))
  }

  if (filters?.rarity && filters.rarity !== "all") {
    cardsQuery = query(cardsQuery, where("rarity", "==", filters.rarity))
  }

  if (filters?.limit) {
    cardsQuery = query(cardsQuery, limit(filters.limit))
  }

  const snapshot = await getDocs(cardsQuery)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis() || Date.now(),
    updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
  })) as Card[]
}
