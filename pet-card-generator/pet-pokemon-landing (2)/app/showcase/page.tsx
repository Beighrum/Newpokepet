"use client"

import { useState } from "react"
import { PokePetDraggableCard } from "@/components/pokepet-draggable-card"
import { CreatureDialog } from "@/components/creature-dialog"
import { useCards } from "@/hooks/use-cards"

export default function ShowcasePage() {
  const { cards } = useCards()
  const [selectedCard, setSelectedCard] = useState<any>(null)

  const readyCards = cards.filter((card) => card.status === "ready")

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Interactive PokePet Showcase
          </h1>
          <p className="text-lg text-muted-foreground">Drag, rotate, and interact with your PokePets in 3D space</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 place-items-center">
          {readyCards.map((card) => (
            <PokePetDraggableCard key={card.id} card={card} onOpen={setSelectedCard} />
          ))}
        </div>

        {selectedCard && (
          <CreatureDialog
            creature={selectedCard}
            open={!!selectedCard}
            onOpenChange={(open) => !open && setSelectedCard(null)}
          />
        )}
      </div>
    </div>
  )
}
