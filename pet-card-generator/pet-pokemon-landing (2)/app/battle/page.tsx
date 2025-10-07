"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCards } from "@/hooks/use-cards"
import { PixelPet } from "@/components/pixel-pet"

interface BattleState {
  playerCreature: any | null
  opponentCreature: any | null
  playerHP: number
  opponentHP: number
  battleLog: string[]
  currentTurn: "player" | "opponent"
  battleActive: boolean
}

export default function BattlePage() {
  const { cards } = useCards()
  const readyCards = cards.filter((card) => card.status === "ready")

  const [battleState, setBattleState] = useState<BattleState>({
    playerCreature: null,
    opponentCreature: null,
    playerHP: 100,
    opponentHP: 100,
    battleLog: [],
    currentTurn: "player",
    battleActive: false,
  })

  const [selectedCreature, setSelectedCreature] = useState<any | null>(null)

  const startBattle = () => {
    if (!selectedCreature) return

    // Select random opponent
    const availableOpponents = readyCards.filter((card) => card.id !== selectedCreature.id)
    const opponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)]

    setBattleState({
      playerCreature: selectedCreature,
      opponentCreature: opponent,
      playerHP: 100,
      opponentHP: 100,
      battleLog: [`Battle started! ${selectedCreature.name} vs ${opponent.name}`],
      currentTurn: "player",
      battleActive: true,
    })
  }

  const performAttack = (move: any) => {
    if (!battleState.battleActive || battleState.currentTurn !== "player") return

    const damage = Math.floor(Math.random() * 25) + 10
    const newOpponentHP = Math.max(0, battleState.opponentHP - damage)

    const newLog = [
      ...battleState.battleLog,
      `${battleState.playerCreature.name} used ${move.name}! Dealt ${damage} damage.`,
    ]

    setBattleState((prev) => ({
      ...prev,
      opponentHP: newOpponentHP,
      battleLog: newLog,
      currentTurn: "opponent",
    }))

    // Opponent turn after delay
    if (newOpponentHP > 0) {
      setTimeout(() => {
        const opponentMove =
          battleState.opponentCreature.moves[Math.floor(Math.random() * battleState.opponentCreature.moves.length)]
        const opponentDamage = Math.floor(Math.random() * 25) + 10
        const newPlayerHP = Math.max(0, battleState.playerHP - opponentDamage)

        setBattleState((prev) => ({
          ...prev,
          playerHP: newPlayerHP,
          battleLog: [
            ...prev.battleLog,
            `${battleState.opponentCreature.name} used ${opponentMove.name}! Dealt ${opponentDamage} damage.`,
          ],
          currentTurn: "player",
          battleActive: newPlayerHP > 0,
        }))

        if (newPlayerHP === 0) {
          setBattleState((prev) => ({
            ...prev,
            battleLog: [...prev.battleLog, `${battleState.opponentCreature.name} wins!`],
            battleActive: false,
          }))
        }
      }, 1500)
    } else {
      setBattleState((prev) => ({
        ...prev,
        battleLog: [...prev.battleLog, `${battleState.playerCreature.name} wins!`],
        battleActive: false,
      }))
    }
  }

  const resetBattle = () => {
    setBattleState({
      playerCreature: null,
      opponentCreature: null,
      playerHP: 100,
      opponentHP: 100,
      battleLog: [],
      currentTurn: "player",
      battleActive: false,
    })
    setSelectedCreature(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Battle Arena
          </h1>
          <p className="text-gray-600">Challenge your Pokepets in epic battles!</p>
        </div>

        {!battleState.battleActive && !battleState.playerCreature && (
          <div className="grid gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Select Your Pokepet!</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  {readyCards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCreature(card)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                        selectedCreature?.id === card.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300 bg-white"
                      }`}
                    >
                      <PixelPet
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                      <h3 className="font-semibold text-center">{card.name}</h3>
                      <div className="flex justify-center gap-1 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {card.element}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {card.rarity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCreature && (
                  <div className="text-center">
                    <Button
                      onClick={startBattle}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      Start Battle!
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {battleState.battleActive && (
          <div className="grid gap-6">
            {/* Battle Arena */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Player Side */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">{battleState.playerCreature.name}</h3>
                    <PixelPet
                      src={battleState.playerCreature.imageUrl}
                      alt={battleState.playerCreature.name}
                      className="w-48 h-48 mx-auto rounded-xl mb-4"
                    />
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>HP</span>
                        <span>{battleState.playerHP}/100</span>
                      </div>
                      <Progress value={battleState.playerHP} className="h-3" />
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {battleState.playerCreature.moves.map((move: any, index: number) => (
                        <Button
                          key={index}
                          onClick={() => performAttack(move)}
                          disabled={battleState.currentTurn !== "player"}
                          variant="outline"
                          size="sm"
                          className="hover:bg-purple-50"
                        >
                          {move.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Opponent Side */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">{battleState.opponentCreature.name}</h3>
                    <PixelPet
                      src={battleState.opponentCreature.imageUrl}
                      alt={battleState.opponentCreature.name}
                      className="w-48 h-48 mx-auto rounded-xl mb-4"
                    />
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>HP</span>
                        <span>{battleState.opponentHP}/100</span>
                      </div>
                      <Progress value={battleState.opponentHP} className="h-3" />
                    </div>
                    <Badge variant="secondary">
                      {battleState.currentTurn === "opponent" ? "Thinking..." : "Waiting"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Battle Log */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Battle Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  {battleState.battleLog.map((log, index) => (
                    <p key={index} className="text-sm mb-1 text-gray-700">
                      {log}
                    </p>
                  ))}
                </ScrollArea>
                <Button onClick={resetBattle} variant="outline" className="mt-4 bg-transparent">
                  New Battle
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!battleState.battleActive && battleState.playerCreature && (
          <div className="text-center">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">Battle Complete!</h2>
                <Button
                  onClick={resetBattle}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Battle Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
