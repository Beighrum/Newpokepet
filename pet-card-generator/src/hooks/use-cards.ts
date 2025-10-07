"use client"

// Custom hook for managing card data with mock implementation for v0 preview
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface Card {
  id: string
  name: string
  status: "queued" | "processing" | "ready" | "failed"
  imageUrl: string
  element: string
  rarity: "common" | "rare" | "epic" | "legendary"
  stage: "baby" | "adult" | "elder"
  xp: number
  maxXp: number
  createdAt: Date
  updatedAt: Date
  prompt?: string
  personality?: string[]
  stats?: {
    attack: number
    defense: number
    speed: number
    hp: number
  }
  moves?: Array<{
    name: string
    power: number
    type: string
  }>
}

const mockCards: Card[] = [
  {
    id: "mock-1",
    name: "Thunder Pup",
    status: "ready",
    imageUrl: "/golden-retriever-pokemon-lightning.png",
    element: "electric",
    rarity: "rare",
    stage: "baby",
    xp: 75,
    maxXp: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    prompt: "A golden retriever with electric powers",
    personality: ["energetic", "loyal", "playful"],
    stats: { attack: 65, defense: 45, speed: 80, hp: 70 },
    moves: [
      { name: "Thunder Bolt", power: 90, type: "electric" },
      { name: "Quick Attack", power: 40, type: "normal" },
    ],
  },
  {
    id: "mock-2",
    name: "Mystic Cat",
    status: "ready",
    imageUrl: "/psychic-persian-pokemon.png",
    element: "psychic",
    rarity: "legendary",
    stage: "adult",
    xp: 45,
    maxXp: 150,
    createdAt: new Date(),
    updatedAt: new Date(),
    prompt: "A mystical persian cat with psychic abilities",
    personality: ["mysterious", "intelligent", "calm"],
    stats: { attack: 85, defense: 70, speed: 95, hp: 90 },
    moves: [
      { name: "Psychic", power: 90, type: "psychic" },
      { name: "Shadow Ball", power: 80, type: "ghost" },
    ],
  },
  {
    id: "mock-3",
    name: "Flame Corgi",
    status: "ready",
    imageUrl: "/fire-corgi-pokemon.png",
    element: "fire",
    rarity: "epic",
    stage: "baby",
    xp: 30,
    maxXp: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    prompt: "A corgi with fire-type abilities and a cheerful demeanor",
    personality: ["brave", "cheerful", "determined"],
    stats: { attack: 70, defense: 50, speed: 60, hp: 65 },
    moves: [
      { name: "Flamethrower", power: 90, type: "fire" },
      { name: "Tackle", power: 35, type: "normal" },
    ],
  },
  {
    id: "mock-4",
    name: "Aqua Lab",
    status: "ready",
    imageUrl: "/labrador-pokemon-water.png",
    element: "water",
    rarity: "rare",
    stage: "adult",
    xp: 120,
    maxXp: 150,
    createdAt: new Date(),
    updatedAt: new Date(),
    prompt: "A labrador with water-type powers and swimming abilities",
    personality: ["friendly", "protective", "gentle"],
    stats: { attack: 75, defense: 80, speed: 55, hp: 85 },
    moves: [
      { name: "Surf", power: 90, type: "water" },
      { name: "Bite", power: 60, type: "dark" },
    ],
  },
  {
    id: "mock-5",
    name: "Garden Kitten",
    status: "ready",
    imageUrl: "/grass-kitten-pokemon.png",
    element: "grass",
    rarity: "common",
    stage: "baby",
    xp: 15,
    maxXp: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    prompt: "A small kitten with grass-type nature powers",
    personality: ["curious", "gentle", "nature-loving"],
    stats: { attack: 45, defense: 55, speed: 70, hp: 50 },
    moves: [
      { name: "Vine Whip", power: 45, type: "grass" },
      { name: "Scratch", power: 40, type: "normal" },
    ],
  },
  {
    id: "mock-6",
    name: "Shadow Wolf",
    status: "ready",
    imageUrl: "/dark-wolf-pokemon.png",
    element: "dark",
    rarity: "epic",
    stage: "adult",
    xp: 85,
    maxXp: 150,
    createdAt: new Date(),
    updatedAt: new Date(),
    prompt: "A mysterious wolf with dark-type shadow abilities",
    personality: ["mysterious", "loyal", "fierce"],
    stats: { attack: 90, defense: 65, speed: 85, hp: 80 },
    moves: [
      { name: "Shadow Claw", power: 70, type: "dark" },
      { name: "Howl", power: 0, type: "normal" },
    ],
  },
]

export const useCards = () => {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  const user = {
    uid: "mock-user-123",
    email: "demo@example.com",
    displayName: "Demo User",
  }

  useEffect(() => {
    setLoading(true)

    const timer = setTimeout(() => {
      setCards(mockCards)
      setLoading(false)
      setError(null)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return { cards, loading, error, user }
}
