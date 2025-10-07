"use client"

import { useState, useMemo } from "react"
import { Search, Sparkles, Zap, Crown, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { startCardEvolution } from "@/lib/firebase-functions"
import { useCards } from "@/hooks/use-cards"

type Stage = "baby" | "adult" | "elder"

const stageOrder: Stage[] = ["baby", "adult", "elder"]

const getStageIcon = (stage: Stage) => {
  switch (stage) {
    case "baby":
      return <Sparkles className="w-4 h-4" />
    case "adult":
      return <Zap className="w-4 h-4" />
    case "elder":
      return <Crown className="w-4 h-4" />
  }
}

const getElementColor = (element: string) => {
  const colors = {
    Electric: "from-yellow-400 to-yellow-600",
    Fire: "from-red-400 to-orange-600",
    Water: "from-blue-400 to-blue-600",
    Grass: "from-green-400 to-green-600",
    Psychic: "from-purple-400 to-pink-600",
    Normal: "from-gray-400 to-gray-600",
  }
  return colors[element as keyof typeof colors] || colors.Normal
}

const getRarityColor = (rarity: string) => {
  const colors = {
    Common: "bg-gray-100 text-gray-800",
    Uncommon: "bg-green-100 text-green-800",
    Rare: "bg-blue-100 text-blue-800",
    Epic: "bg-purple-100 text-purple-800",
    Legendary: "bg-yellow-100 text-yellow-800",
  }
  return colors[rarity as keyof typeof colors] || colors.Common
}

const getEvolutionPreview = (baseName: string, stage: Stage, element: string) => {
  const stageModifiers = {
    baby: "cute small",
    adult: "powerful evolved",
    elder: "majestic ancient",
  }

  return `/placeholder.svg?height=120&width=120&query=${stageModifiers[stage]} ${element.toLowerCase()} ${baseName.toLowerCase()} pokemon`
}

export default function EvolutionPage() {
  const { cards, user } = useCards()
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isEvolving, setIsEvolving] = useState(false)
  const [previewStage, setPreviewStage] = useState<Stage | null>(null)
  const { toast } = useToast()

  const filteredCards = useMemo(() => {
    return cards.filter(
      (card) =>
        card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.element.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [cards, searchQuery])

  const canEvolve = selectedCard && selectedCard.stage !== "elder"
  const nextStage = selectedCard ? stageOrder[stageOrder.indexOf(selectedCard.stage) + 1] : null
  const xpRequired = 40
  const gemCost = 3
  const hasEnoughXP = selectedCard ? selectedCard.xp >= xpRequired : false

  const handleEvolveWithXP = async () => {
    if (!selectedCard || !canEvolve || !hasEnoughXP || !user) return

    setIsEvolving(true)

    try {
      await startCardEvolution(selectedCard.id, nextStage as "adult" | "elder")

      toast({
        title: "Evolution Complete!",
        description: `${selectedCard.name} evolved to ${nextStage} stage!`,
      })
    } catch (error) {
      toast({
        title: "Evolution Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEvolving(false)
    }
  }

  const handleEvolveWithGems = async () => {
    if (!selectedCard || !canEvolve || !user) return

    setIsEvolving(true)

    try {
      await startCardEvolution(selectedCard.id, nextStage as "adult" | "elder")

      toast({
        title: "Evolution Complete!",
        description: `${selectedCard.name} evolved to ${nextStage} stage using gems!`,
      })
    } catch (error) {
      toast({
        title: "Evolution Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEvolving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            Evolution Chamber
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select one of your creatures and guide them through their evolutionary journey from Baby to Elder stage.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Card Picker */}
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Select Creature
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or element..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-2xl border-gray-200"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                    selectedCard?.id === card.id
                      ? "border-purple-300 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getElementColor(card.element)} p-1`}>
                      <img
                        src={card.imageUrl || "/placeholder.svg"}
                        alt={card.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{card.name}</h3>
                        {getStageIcon(card.stage)}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {card.element}
                        </Badge>
                        <Badge className={`text-xs ${getRarityColor(card.rarity)}`}>{card.rarity}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {card.stage.charAt(0).toUpperCase() + card.stage.slice(1)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">XP</span>
                          <span className="font-medium">
                            {card.xp}/{card.maxXp}
                          </span>
                        </div>
                        <Progress value={(card.xp / card.maxXp) * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCards.length === 0 && (
                <div className="text-center py-8 text-gray-500">No creatures found matching your search.</div>
              )}
            </CardContent>
          </Card>

          {/* Evolution Panel */}
          <div className="space-y-6">
            {selectedCard ? (
              <>
                {/* Stage Path */}
                <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
                  <CardHeader>
                    <CardTitle>Evolution Path</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {stageOrder.map((stage, index) => {
                        const isCurrentStage = selectedCard.stage === stage
                        const isPastStage = stageOrder.indexOf(selectedCard.stage) > index
                        const isActive = isCurrentStage || isPastStage

                        return (
                          <div key={stage} className="flex items-center">
                            <div
                              className={`flex flex-col items-center ${index < stageOrder.length - 1 ? "flex-1" : ""}`}
                            >
                              <div
                                onClick={() => setPreviewStage(previewStage === stage ? null : stage)}
                                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all cursor-pointer hover:scale-110 ${
                                  isCurrentStage
                                    ? "border-purple-500 bg-purple-100 text-purple-700"
                                    : isPastStage
                                      ? "border-green-500 bg-green-100 text-green-700"
                                      : "border-gray-300 bg-gray-100 text-gray-500 hover:border-gray-400"
                                } ${previewStage === stage ? "ring-4 ring-blue-300" : ""}`}
                              >
                                {getStageIcon(stage)}
                              </div>
                              <span
                                className={`mt-2 text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-500"}`}
                              >
                                {stage.charAt(0).toUpperCase() + stage.slice(1)}
                              </span>
                            </div>
                            {index < stageOrder.length - 1 && (
                              <div className="flex-1 flex items-center justify-center px-4">
                                <ArrowRight className={`w-6 h-6 ${isPastStage ? "text-green-500" : "text-gray-300"}`} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {previewStage && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
                        <div className="text-center">
                          <h4 className="font-semibold text-gray-900 mb-3">
                            {previewStage.charAt(0).toUpperCase() + previewStage.slice(1)} Stage Preview
                          </h4>
                          <div
                            className={`w-32 h-32 mx-auto rounded-2xl bg-gradient-to-br ${getElementColor(selectedCard.element)} p-2 mb-3`}
                          >
                            <img
                              src={
                                getEvolutionPreview(selectedCard.name, previewStage, selectedCard.element) ||
                                "/placeholder.svg"
                              }
                              alt={`${selectedCard.name} ${previewStage} form`}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          </div>
                          <p className="text-sm text-gray-600">
                            {previewStage === "baby" && "Young and playful, just beginning their journey"}
                            {previewStage === "adult" && "Fully grown with enhanced abilities and power"}
                            {previewStage === "elder" && "Ancient wisdom and maximum potential achieved"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Requirements & Actions */}
                <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
                  <CardHeader>
                    <CardTitle>
                      {canEvolve
                        ? `Evolve to ${nextStage?.charAt(0).toUpperCase() + nextStage?.slice(1)}`
                        : "Maximum Evolution Reached"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {canEvolve ? (
                      <>
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
                          <h4 className="font-semibold text-gray-900 mb-2">Evolution Requirements</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span>Required XP:</span>
                              <span className={`font-medium ${hasEnoughXP ? "text-green-600" : "text-red-600"}`}>
                                {xpRequired} XP {hasEnoughXP ? "✓" : "✗"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Current XP:</span>
                              <span className="font-medium">{selectedCard.xp} XP</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          <Button
                            onClick={handleEvolveWithXP}
                            disabled={!hasEnoughXP || isEvolving}
                            className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
                          >
                            {isEvolving ? "Evolving..." : `Evolve (${xpRequired} XP)`}
                          </Button>

                          <Button
                            onClick={handleEvolveWithGems}
                            disabled={isEvolving}
                            variant="outline"
                            className="w-full h-12 rounded-2xl border-2 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold bg-transparent"
                          >
                            {isEvolving ? "Evolving..." : `Skip with Gems (${gemCost} 💎)`}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Crown className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {selectedCard.name} has reached maximum evolution!
                        </h3>
                        <p className="text-gray-600">This creature is at Elder stage and cannot evolve further.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
                <CardContent className="text-center py-16">
                  <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Creature to Begin</h3>
                  <p className="text-gray-600">
                    Choose one of your creatures from the list to start the evolution process.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
