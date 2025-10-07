"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreatureDialog } from "@/components/creature-dialog"
import { useCards } from "@/hooks/use-cards"
import Link from "next/link"

const elementEmojis: Record<string, string> = {
  electric: "⚡",
  psychic: "🔮",
  fire: "🔥",
  water: "💧",
  grass: "🌿",
  dark: "🌙",
  normal: "⭐",
  ice: "❄️",
  fighting: "👊",
  poison: "☠️",
  ground: "⛰️",
  flying: "🪶",
  bug: "🐛",
  rock: "🗿",
  ghost: "👻",
  dragon: "🐉",
  steel: "⚔️",
  fairy: "🧚",
}

const rarityColors: Record<string, string> = {
  common: "bg-gray-100 text-gray-800 border-gray-200",
  rare: "bg-blue-100 text-blue-800 border-blue-200",
  epic: "bg-purple-100 text-purple-800 border-purple-200",
  legendary: "bg-orange-100 text-orange-800 border-orange-200",
}

const statusColors: Record<string, string> = {
  queued: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
}

export default function GalleryPage() {
  const { cards, loading, error, user } = useCards()
  const [selectedCreature, setSelectedCreature] = useState<any | null>(null)
  const [sortBy, setSortBy] = useState<string>("newest")
  const [filterBy, setFilterBy] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<string>(user ? "my-collection" : "community")

  const communityCards = [
    {
      id: "community-1",
      name: "Sparkle Pup",
      element: "electric",
      rarity: "rare",
      stage: "adult",
      xp: 75,
      maxXp: 100,
      status: "ready",
      imageUrl: "/golden-retriever-pokemon-lightning.png",
      updatedAt: "2024-01-15T10:00:00Z",
      owner: "PetTrainer123",
    },
    {
      id: "community-2",
      name: "Mystic Cat",
      element: "psychic",
      rarity: "epic",
      stage: "elder",
      xp: 90,
      maxXp: 100,
      status: "ready",
      imageUrl: "/psychic-persian-pokemon.png",
      updatedAt: "2024-01-14T15:30:00Z",
      owner: "CatLover99",
    },
    {
      id: "community-3",
      name: "Flame Corgi",
      element: "fire",
      rarity: "legendary",
      stage: "adult",
      xp: 85,
      maxXp: 100,
      status: "ready",
      imageUrl: "/fire-corgi-pokemon.png",
      updatedAt: "2024-01-13T09:15:00Z",
      owner: "CorgiMaster",
    },
    {
      id: "community-4",
      name: "Aqua Lab",
      element: "water",
      rarity: "rare",
      stage: "baby",
      xp: 45,
      maxXp: 100,
      status: "ready",
      imageUrl: "/labrador-pokemon-water.png",
      updatedAt: "2024-01-12T14:20:00Z",
      owner: "WaterDogFan",
    },
  ]

  const getCurrentCards = () => {
    if (activeTab === "community") return communityCards
    return cards
  }

  const filteredAndSortedCreatures = getCurrentCards()
    .filter((creature) => {
      if (filterBy !== "all" && creature.rarity !== filterBy) return false
      if (typeFilter !== "all" && creature.element !== typeFilter) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case "oldest":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        case "level":
          return (b.xp || 0) - (a.xp || 0)
        case "rarity":
          const rarityOrder = ["common", "rare", "epic", "legendary"]
          return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity)
        default:
          return 0
      }
    })

  const CreatureTile = ({ creature }: { creature: any }) => {
    const elementEmoji = elementEmojis[creature.element] || "✨"
    const isReady = creature.status === "ready"

    const safeNumber = (value: any, fallback = 0): number => {
      if (value === null || value === undefined || value === "") return fallback
      const num = Number(value)
      return isNaN(num) ? fallback : num
    }

    const safeString = (value: any, fallback = "0"): string => {
      if (value === null || value === undefined || value === "") return fallback
      const num = Number(value)
      if (isNaN(num)) return fallback
      return String(num)
    }

    const safeRender = (value: any, fallback = "0"): string => {
      // Extra safety layer to ensure no NaN values are ever rendered as children
      if (value === null || value === undefined || value === "" || value !== value) return fallback
      const str = String(value)
      return str === "NaN" ? fallback : str
    }

    const xp = safeNumber(creature.xp, 0)
    const maxXp = safeNumber(creature.maxXp, 100)
    const xpProgress = maxXp > 0 ? Math.min(100, Math.max(0, (xp / maxXp) * 100)) : 0

    const xpDisplay = safeRender(xp, "0")
    const maxXpDisplay = safeRender(maxXp, "100")
    const safeProgress = isNaN(xpProgress) ? 0 : Math.min(100, Math.max(0, xpProgress))

    const isCommunity = activeTab === "community"

    return (
      <Card
        className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${
          !isReady ? "opacity-75" : ""
        }`}
        onClick={() => setSelectedCreature(creature)}
      >
        {/* Status overlay for non-ready creatures */}
        {!isReady && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="animate-pulse">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* Status badge */}
        {!isReady && (
          <Badge className={`absolute top-2 right-2 z-20 text-xs ${statusColors[creature.status]}`}>
            {creature.status}
          </Badge>
        )}

        {isCommunity && (
          <Badge className="absolute top-2 left-2 z-20 text-xs bg-blue-100 text-blue-800 border-blue-200">
            by {creature.owner}
          </Badge>
        )}

        <div className="p-4 space-y-3">
          {/* Thumbnail */}
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-2xl overflow-hidden ring-2 ${
                isReady ? "ring-purple-200" : "ring-gray-200"
              } mx-auto`}
            >
              <img
                src={creature.imageUrl || "/placeholder.svg"}
                alt={creature.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${rarityColors[creature.rarity]} border-2 border-white flex items-center justify-center`}
            >
              <span className="text-xs">✨</span>
            </div>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm">{elementEmoji}</span>
            <h3 className="font-semibold text-sm text-center truncate">{creature.name}</h3>
          </div>

          {/* Meta row */}
          <p className="text-xs text-gray-600 text-center">
            {creature.element} · {creature.stage} · {creature.rarity}
          </p>

          {/* XP Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>XP</span>
              <span>
                {xpDisplay}/{maxXpDisplay}
              </span>
            </div>
            <Progress value={safeProgress || 0} className="h-1" />
          </div>
        </div>

        {isReady && (
          <div className="p-4 pt-0">
            <Link href={`/battle?creature=${creature.id}`}>
              <Button
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                ⚔️ Start Battle
              </Button>
            </Link>
          </div>
        )}
      </Card>
    )
  }

  const CardSkeleton = () => (
    <Card className="p-4 space-y-3">
      <Skeleton className="w-16 h-16 rounded-2xl mx-auto" />
      <Skeleton className="h-4 w-24 mx-auto" />
      <Skeleton className="h-3 w-32 mx-auto" />
      <div className="space-y-1">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-1 w-full" />
      </div>
    </Card>
  )

  const EmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-6">
        <span className="text-4xl">📸</span>
      </div>
      <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
        {activeTab === "community" ? "No community PokePets yet" : "No PokePets yet"}
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm">
        {activeTab === "community"
          ? "Check back later for amazing community creations!"
          : "Transform your first pet photo into a magical PokePet to start your collection!"}
      </p>
      {activeTab !== "community" && (
        <Link href="/upload">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <span className="mr-2">📸</span>
            Upload Pet Photo
          </Button>
        </Link>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            PokePet Gallery
          </h1>
          <p className="text-gray-600">
            {loading
              ? "Loading PokePets..."
              : `${filteredAndSortedCreatures.length} PokePets ${activeTab === "community" ? "from the community" : "in your collection"}`}
          </p>
        </div>

        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              {user && <TabsTrigger value="my-collection">My PokePet Collection</TabsTrigger>}
              <TabsTrigger value="community">Community PokePets</TabsTrigger>
            </TabsList>

            <TabsContent value="my-collection" className="mt-8">
              {/* Show sign-in prompt if not authenticated */}
              {!user && !loading && (
                <div className="text-center py-16">
                  <p className="text-gray-600 mb-4">Please sign in to view your PokePet collection.</p>
                  <Button
                    onClick={() => {
                      /* Implement sign-in */
                    }}
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="community" className="mt-8">
              {/* Community content will be shown below */}
            </TabsContent>
          </Tabs>
        </div>

        {/* Filters and Sort */}
        {((user && activeTab === "my-collection" && cards.length > 0) ||
          (activeTab === "community" && communityCards.length > 0)) && (
          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <span className="mr-2">📊</span>
                <span>Sort</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="level">Highest Level</SelectItem>
                <SelectItem value="rarity">Rarest First</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-40">
                <span className="mr-2">🔍</span>
                <span>Rarity</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <span className="mr-2">⚡</span>
                <span>Type</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="electric">⚡ Electric</SelectItem>
                <SelectItem value="psychic">🔮 Psychic</SelectItem>
                <SelectItem value="fire">🔥 Fire</SelectItem>
                <SelectItem value="water">💧 Water</SelectItem>
                <SelectItem value="grass">🌿 Grass</SelectItem>
                <SelectItem value="dark">🌙 Dark</SelectItem>
                <SelectItem value="normal">⭐ Normal</SelectItem>
                <SelectItem value="ice">❄️ Ice</SelectItem>
                <SelectItem value="fighting">👊 Fighting</SelectItem>
                <SelectItem value="poison">☠️ Poison</SelectItem>
                <SelectItem value="ground">⛰️ Ground</SelectItem>
                <SelectItem value="flying">🪶 Flying</SelectItem>
                <SelectItem value="bug">🐛 Bug</SelectItem>
                <SelectItem value="rock">🗿 Rock</SelectItem>
                <SelectItem value="ghost">👻 Ghost</SelectItem>
                <SelectItem value="dragon">🐉 Dragon</SelectItem>
                <SelectItem value="steel">⚔️ Steel</SelectItem>
                <SelectItem value="fairy">🧚 Fairy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Gallery Grid */}
        {loading && activeTab === "my-collection" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : getCurrentCards().length === 0 ? (
          <EmptyState />
        ) : filteredAndSortedCreatures.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <p className="text-gray-600">No PokePets match your current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
            {filteredAndSortedCreatures.map((creature) => (
              <CreatureTile key={creature.id} creature={creature} />
            ))}
          </div>
        )}

        {/* Creature Detail Dialog */}
        {selectedCreature && (
          <CreatureDialog
            creature={selectedCreature}
            open={!!selectedCreature}
            onOpenChange={() => setSelectedCreature(null)}
          />
        )}
      </div>
    </div>
  )
}
