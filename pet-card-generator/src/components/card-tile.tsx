"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Droplets, Flame, Mountain, Leaf, Snowflake, Ghost } from "lucide-react"

type ElementKey = "Water" | "Fire" | "Leaf" | "Bolt" | "Frost" | "Stone" | "Spirit"
type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Secret"
type Stage = "Baby" | "Adult" | "Elder"
type Status = "queued" | "processing" | "ready" | "failed"

interface Stats {
  heart: number
  speed: number
  power: number
  focus: number
}

interface Creature {
  id: string
  name: string
  element: ElementKey
  rarity: Rarity
  stage: Stage
  level: number
  xp: number
  stats: Stats
  imageUrl: string
  status: Status
  createdAt: number
}

interface CardTileProps {
  card: Creature
  onClick: (card: Creature) => void
  className?: string
}

const elementIcons: Record<ElementKey, any> = {
  Water: Droplets,
  Fire: Flame,
  Leaf: Leaf,
  Bolt: Zap,
  Frost: Snowflake,
  Stone: Mountain,
  Spirit: Ghost,
}

const elementGradients: Record<ElementKey, string> = {
  Water: "from-sky-400 to-blue-700",
  Fire: "from-orange-400 to-red-700",
  Leaf: "from-emerald-400 to-green-600",
  Bolt: "from-yellow-300 to-amber-500",
  Frost: "from-cyan-300 to-indigo-500",
  Stone: "from-stone-400 to-zinc-700",
  Spirit: "from-fuchsia-400 to-purple-600",
}

const rarityColors: Record<Rarity, string> = {
  Common: "bg-gray-100 text-gray-800",
  Uncommon: "bg-green-100 text-green-800",
  Rare: "bg-blue-100 text-blue-800",
  Epic: "bg-purple-100 text-purple-800",
  Legendary: "bg-orange-100 text-orange-800",
  Secret: "bg-gradient-to-r from-pink-100 to-purple-100 text-purple-800",
}

export function CardTile({ card, onClick, className = "" }: CardTileProps) {
  const ElementIcon = elementIcons[card.element]
  const elementGradient = elementGradients[card.element]
  const xpProgress = card.xp % 100
  const isReady = card.status === "ready"

  return (
    <div
      className={`group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${className}`}
      onClick={() => onClick(card)}
    >
      <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
        {/* Image Container */}
        <div className="relative aspect-square">
          <img src={card.imageUrl || "/placeholder.svg"} alt={card.name} className="w-full h-full object-cover" />

          {/* Element Icon Overlay */}
          <div
            className={`absolute top-3 left-3 w-8 h-8 rounded-full bg-gradient-to-r ${elementGradient} flex items-center justify-center`}
          >
            <ElementIcon className="w-4 h-4 text-white" />
          </div>

          {/* Status Overlay */}
          {!isReady && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium capitalize">{card.status}</p>
              </div>
            </div>
          )}

          {/* Shimmer effect for non-ready cards */}
          {!isReady && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Card Info */}
        <div className="p-4 space-y-3">
          {/* Title and Level */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg truncate">{card.name}</h3>
            <Badge variant="outline" className="text-xs">
              Lv.{card.level}
            </Badge>
          </div>

          {/* Rarity and Stage */}
          <div className="flex gap-2">
            <Badge className={`${rarityColors[card.rarity]} text-xs rounded-full`}>{card.rarity}</Badge>
            <Badge variant="secondary" className="text-xs rounded-full">
              {card.stage}
            </Badge>
          </div>

          {/* XP Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>XP</span>
              <span>{card.xp}</span>
            </div>
            <Progress value={xpProgress} className="h-1" />
          </div>
        </div>
      </div>
    </div>
  )
}
