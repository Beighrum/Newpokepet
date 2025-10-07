// Battle system TypeScript interfaces and types

import { Card } from "@/hooks/use-cards"

export interface BattleMove {
  name: string
  power: number
  type: string
}

export interface DamageCalculation {
  baseDamage: number
  randomFactor: number
  finalDamage: number
}

export interface BattleCreature {
  card: Card
  currentHP: number
  maxHP: number
}

export interface BattleState {
  playerCreature: BattleCreature | null
  opponentCreature: BattleCreature | null
  battleLog: string[]
  currentTurn: "player" | "opponent"
  battleActive: boolean
  battlePhase: "selection" | "battle" | "results"
  winner: "player" | "opponent" | null
  isOpponentThinking: boolean
  lastMove: {
    moveName: string
    damage: number
    target: 'player' | 'opponent'
  } | null
}

export interface BattleAction {
  type: "SELECT_PLAYER_CREATURE" | "SELECT_OPPONENT_CREATURE" | "START_BATTLE" | 
        "EXECUTE_MOVE" | "END_TURN" | "END_BATTLE" | "RESET_BATTLE" | "ADD_LOG_MESSAGE"
  payload?: any
}

// Default battle stats for creatures that don't have stats defined
export const DEFAULT_BATTLE_STATS = {
  attack: 50,
  defense: 50,
  speed: 50,
  hp: 100
}

// Default moves for creatures that don't have moves defined
export const DEFAULT_MOVES: BattleMove[] = [
  { name: "Tackle", power: 40, type: "normal" },
  { name: "Scratch", power: 35, type: "normal" },
  { name: "Quick Attack", power: 30, type: "normal" }
]

export const BATTLE_PHASES = {
  SELECTION: "selection" as const,
  BATTLE: "battle" as const,
  RESULTS: "results" as const
}

export const TURN_TYPES = {
  PLAYER: "player" as const,
  OPPONENT: "opponent" as const
}

// Post-battle enhancement interfaces
export interface StatIncreases {
  attack: number
  defense: number
  hp: number
  previousLevel: number
  newLevel: number
}

export interface GemReward {
  baseReward: number
  levelMultiplier: number
  totalEarned: number
  source: 'victory' | 'theft'
}

export interface GemCalculation {
  baseReward: number
  trainerLevelMultiplier: number
  difficultyBonus: number
  stolenAmount: number
  totalEarned: number
}

export interface GemTheft {
  opponentGems: number
  theftPercentage: number
  maxTheftAmount: number
  actualStolen: number
}

export interface PostBattleRewards {
  experienceGained: number
  gemsEarned: number
  gemsStolen: number
  levelUp: boolean
  statIncreases: StatIncreases | null
}

export interface ExperienceCalculation {
  baseExperience: number
  difficultyMultiplier: number
  victoryBonus: number
  totalExperience: number
}

export interface LevelProgression {
  currentLevel: number
  currentExperience: number
  experienceToNextLevel: number
  experienceGained: number
  leveledUp: boolean
}

// Enhanced battle state interface extending current BattleState
export interface EnhancedBattleState extends BattleState {
  postBattleRewards: PostBattleRewards | null
  celebrationActive: boolean
}