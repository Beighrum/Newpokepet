"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Zap, Droplets, Flame, Mountain, Leaf, Snowflake, Ghost, HelpCircle } from "lucide-react"

type ElementKey = "Water" | "Fire" | "Leaf" | "Bolt" | "Frost" | "Stone" | "Spirit"
type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"
type Appearance = "Realistic" | "Cartoon" | "Anime" | "Pixel Art"

interface DesignPanelProps {
  selectedType: ElementKey
  selectedRarity: Rarity
  selectedAppearance: Appearance
  selectedPersonality: string[]
  onTypeChange: (type: ElementKey) => void
  onRarityChange: (rarity: Rarity) => void
  onAppearanceChange: (appearance: Appearance) => void
  onPersonalityChange: (personality: string[]) => void
  className?: string
}

const elements: { key: ElementKey; label: string; icon: any; gradient: string }[] = [
  { key: "Water", label: "Water", icon: Droplets, gradient: "from-sky-400 to-blue-700" },
  { key: "Fire", label: "Fire", icon: Flame, gradient: "from-orange-400 to-red-700" },
  { key: "Leaf", label: "Leaf", icon: Leaf, gradient: "from-emerald-400 to-green-600" },
  { key: "Bolt", label: "Bolt", icon: Zap, gradient: "from-yellow-300 to-amber-500" },
  { key: "Frost", label: "Frost", icon: Snowflake, gradient: "from-cyan-300 to-indigo-500" },
  { key: "Stone", label: "Stone", icon: Mountain, gradient: "from-stone-400 to-zinc-700" },
  { key: "Spirit", label: "Spirit", icon: Ghost, gradient: "from-fuchsia-400 to-purple-600" },
]

const rarities: { key: Rarity; label: string; odds: string }[] = [
  { key: "Common", label: "Common", odds: "60%" },
  { key: "Uncommon", label: "Uncommon", odds: "25%" },
  { key: "Rare", label: "Rare", odds: "10%" },
  { key: "Epic", label: "Epic", odds: "4%" },
  { key: "Legendary", label: "Legendary", odds: "1%" },
]

const appearances: Appearance[] = ["Realistic", "Cartoon", "Anime", "Pixel Art"]

const personalityTraits = [
  "Playful",
  "Brave",
  "Gentle",
  "Energetic",
  "Calm",
  "Curious",
  "Loyal",
  "Mischievous",
  "Protective",
  "Friendly",
  "Independent",
  "Affectionate",
  "Alert",
  "Patient",
  "Adventurous",
]

export function DesignPanel({
  selectedType,
  selectedRarity,
  selectedAppearance,
  selectedPersonality,
  onTypeChange,
  onRarityChange,
  onAppearanceChange,
  onPersonalityChange,
  className = "",
}: DesignPanelProps) {
  const togglePersonality = (trait: string) => {
    if (selectedPersonality.includes(trait)) {
      onPersonalityChange(selectedPersonality.filter((t) => t !== trait))
    } else if (selectedPersonality.length < 5) {
      onPersonalityChange([...selectedPersonality, trait])
    }
  }

  return (
    <Card className={`p-6 space-y-6 ${className}`}>
      {/* Element Type Selection */}
      <div>
        <h3 className="font-semibold mb-3">Element Type</h3>
        <div className="grid grid-cols-2 gap-2">
          {elements.map((element) => {
            const Icon = element.icon
            const isSelected = selectedType === element.key
            return (
              <Button
                key={element.key}
                variant={isSelected ? "default" : "outline"}
                onClick={() => onTypeChange(element.key)}
                className={`h-12 ${isSelected ? `bg-gradient-to-r ${element.gradient} text-white` : ""}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {element.label}
              </Button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Rarity Selection */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">Rarity</h3>
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          {rarities.map((rarity) => (
            <Button
              key={rarity.key}
              variant={selectedRarity === rarity.key ? "default" : "outline"}
              onClick={() => onRarityChange(rarity.key)}
              className="w-full justify-between h-10"
            >
              <span>{rarity.label}</span>
              <Badge variant="secondary" className="text-xs">
                {rarity.odds}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Appearance Style */}
      <div>
        <h3 className="font-semibold mb-3">Appearance Style</h3>
        <div className="grid grid-cols-2 gap-2">
          {appearances.map((appearance) => (
            <Button
              key={appearance}
              variant={selectedAppearance === appearance ? "default" : "outline"}
              onClick={() => onAppearanceChange(appearance)}
              className="h-10"
            >
              {appearance}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Personality Traits */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Personality</h3>
          <span className="text-sm text-muted-foreground">{selectedPersonality.length}/5</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {personalityTraits.map((trait) => {
            const isSelected = selectedPersonality.includes(trait)
            const isDisabled = !isSelected && selectedPersonality.length >= 5
            return (
              <Button
                key={trait}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => togglePersonality(trait)}
                disabled={isDisabled}
                className="text-xs h-8"
              >
                {trait}
              </Button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
