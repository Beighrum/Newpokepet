import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Zap,
  Droplets,
  Flame,
  Mountain,
  Leaf,
  Snowflake,
  Ghost,
  Sword,
  Heart,
  Eye,
  Copy,
  Swords,
  Shield,
  Users,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { elementGradients } from "@/lib/element-gradients"
import { truncatePrompt, shouldShowQR, createShareCode, getElementFallback, getFallbackMoves } from "@/lib/ui-safety"

type ElementKey =
  | "Leaf"
  | "Flame"
  | "Wave"
  | "Bolt"
  | "Frost"
  | "Stone"
  | "Spirit"
  | "Ground"
  | "Fighting"
  | "Water"
  | "Fire"
type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Secret"
type Stage = "Baby" | "Adult" | "Elder"

interface Stats {
  heart: number
  speed: number
  power: number
  focus: number
}

interface Move {
  name: string
  pp: number
  description: string
}

interface Creature {
  id: string
  ownerUid: string
  name: string
  element: ElementKey
  rarity: Rarity
  stage: Stage
  level: number
  xp: number
  stats: Stats
  personality: string[]
  prompt: string
  imageUrl: string
  createdAt: number
  updatedAt: number
  status: "queued" | "processing" | "ready" | "failed"
  parentId?: string | null
  moves?: Move[]
  evolutionHint?: string
}

interface CreatureDialogProps {
  creature: Creature | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const elementIcons: Record<ElementKey, any> = {
  Leaf: Leaf,
  Flame: Flame,
  Wave: Droplets,
  Bolt: Zap,
  Frost: Snowflake,
  Stone: Mountain,
  Spirit: Ghost,
  Ground: Mountain,
  Fighting: Sword,
  Water: Droplets,
  Fire: Flame,
}

const elementColors: Record<ElementKey, string> = {
  Leaf: elementGradients.Leaf,
  Flame: elementGradients.Fire,
  Wave: elementGradients.Water,
  Bolt: elementGradients.Bolt,
  Frost: elementGradients.Frost,
  Stone: elementGradients.Stone,
  Spirit: elementGradients.Spirit,
  Ground: elementGradients.Stone,
  Fighting: elementGradients.Fire,
  Water: elementGradients.Water,
  Fire: elementGradients.Fire,
}

const rarityColors: Record<Rarity, string> = {
  Common: "bg-gray-100 text-gray-800 border-gray-200",
  Uncommon: "bg-green-100 text-green-800 border-green-200",
  Rare: "bg-blue-100 text-blue-800 border-blue-200",
  Epic: "bg-purple-100 text-purple-800 border-purple-200",
  Legendary: "bg-orange-100 text-orange-800 border-orange-200",
  Secret: "bg-gradient-to-r from-pink-100 to-purple-100 text-purple-800 border-purple-200",
}

export function CreatureDialog({ creature, open, onOpenChange }: CreatureDialogProps) {
  const [showFullCode, setShowFullCode] = useState(false)
  const [activeTab, setActiveTab] = useState("stats")
  const [battleState, setBattleState] = useState<"idle" | "battling" | "victory" | "defeat">("idle")
  const [playerHP, setPlayerHP] = useState(100)
  const [opponentHP, setOpponentHP] = useState(100)
  const [battleLog, setBattleLog] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return

      if (event.key === "Escape") {
        onOpenChange(false)
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const tabs = ["stats", "moves", "battle", "share", "prompt"]
        const currentIndex = tabs.indexOf(activeTab)

        if (event.key === "ArrowLeft" && currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1])
        } else if (event.key === "ArrowRight" && currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1])
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, activeTab, onOpenChange])

  if (!creature) return null

  const safeElement = getElementFallback(creature.element)
  const ElementIcon = elementIcons[safeElement as ElementKey] || Ghost
  const elementGradient = elementColors[safeElement as ElementKey] || elementColors.Spirit
  const xpProgress = creature.xp % 100

  const moves =
    creature.moves ||
    getFallbackMoves(safeElement).map((name, index) => ({
      name,
      pp: 15 - index * 2,
      description: `A ${safeElement.toLowerCase()} type move`,
    }))

  const shareCode = createShareCode(creature)
  const previewCode = shareCode.length > 50 ? shareCode.substring(0, 50) + "..." : shareCode
  const showQR = shouldShowQR(shareCode)

  const safePrompt = truncatePrompt(creature.prompt, 800)
  const isPromptTruncated = creature.prompt.length > 800

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard!",
      description: "Share code has been copied.",
    })
  }

  const generateQRCode = (text: string) => {
    // Use qr-server.com API to generate QR codes
    const encodedText = encodeURIComponent(text)
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodedText}`
  }

  const createBattleInvite = () => {
    const battleCode = `BATTLE:${creature.id}:${creature.name}:${creature.element}:${creature.level}`
    return battleCode
  }

  const copyBattleInvite = () => {
    const battleInvite = createBattleInvite()
    navigator.clipboard.writeText(battleInvite)
    toast({
      title: "Battle invite copied!",
      description: "Share this code with friends to battle!",
    })
  }

  const startBattle = () => {
    setBattleState("battling")
    setPlayerHP(100)
    setOpponentHP(100)
    setBattleLog([`${creature.name} enters battle!`, "Wild opponent appears!"])
  }

  const performAttack = (moveName: string) => {
    if (battleState !== "battling") return

    const damage = Math.floor(Math.random() * 30) + 10
    const newOpponentHP = Math.max(0, opponentHP - damage)
    setOpponentHP(newOpponentHP)

    const newLog = [...battleLog, `${creature.name} used ${moveName}! Dealt ${damage} damage.`]

    if (newOpponentHP <= 0) {
      setBattleState("victory")
      setBattleLog([...newLog, `${creature.name} wins!`])
      toast({
        title: "Victory!",
        description: `${creature.name} defeated the opponent!`,
      })
      return
    }

    // Opponent counter-attack
    setTimeout(() => {
      const counterDamage = Math.floor(Math.random() * 25) + 8
      const newPlayerHP = Math.max(0, playerHP - counterDamage)
      setPlayerHP(newPlayerHP)

      const finalLog = [...newLog, `Opponent attacks! ${creature.name} takes ${counterDamage} damage.`]

      if (newPlayerHP <= 0) {
        setBattleState("defeat")
        setBattleLog([...finalLog, `${creature.name} was defeated...`])
      } else {
        setBattleLog(finalLog)
      }
    }, 1000)
  }

  const resetBattle = () => {
    setBattleState("idle")
    setPlayerHP(100)
    setOpponentHP(100)
    setBattleLog([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" aria-describedby="creature-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ElementIcon className="w-6 h-6 text-purple-600" aria-hidden="true" />
            {creature.name}
          </DialogTitle>
          {creature.evolutionHint && (
            <p className="text-sm text-muted-foreground" id="evolution-hint">
              {creature.evolutionHint}
            </p>
          )}
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-120px)]" id="creature-details">
          {/* Left Column - Image and Info */}
          <div className="space-y-4">
            {/* Large Image Frame */}
            <div className="relative">
              <div className={`relative bg-gradient-to-br ${elementGradient} rounded-3xl p-4`}>
                <img
                  src={creature.imageUrl || "/placeholder.svg"}
                  alt={`${creature.name}, a ${creature.element} type ${creature.stage} stage creature`}
                  className="w-full aspect-square object-cover rounded-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl pointer-events-none" />
              </div>
            </div>

            {/* Chips Row */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Creature attributes">
              <Badge className={`${rarityColors[creature.rarity]} rounded-full`}>{safeElement}</Badge>
              <Badge className={`${rarityColors[creature.rarity]} rounded-full`}>{creature.rarity}</Badge>
              <Badge variant="outline" className="rounded-full">
                {creature.stage}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Level {creature.level}
              </Badge>
              <Badge variant="secondary" className="rounded-full text-xs">
                #{creature.id.substring(0, 6)}
              </Badge>
            </div>

            {/* Personality Chips */}
            <div>
              <p className="text-sm font-medium mb-2">Personality</p>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Personality traits">
                {creature.personality.map((trait) => (
                  <Badge key={trait} variant="secondary" className="text-xs rounded-full">
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>

            {/* XP Row with Buttons */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Experience</span>
                <span className="text-sm text-muted-foreground">{creature.xp} XP</span>
              </div>
              <Progress value={xpProgress} className="h-2" aria-label={`Experience progress: ${xpProgress}%`} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  aria-label="Feed creature to gain 10 XP"
                >
                  Feed (+10 XP)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  aria-label="Train creature to gain 20 XP"
                >
                  Train (+20 XP)
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Tabs */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5" role="tablist">
                <TabsTrigger value="stats" aria-label="View creature statistics">
                  Stats
                </TabsTrigger>
                <TabsTrigger value="moves" aria-label="View creature moves">
                  Moves
                </TabsTrigger>
                <TabsTrigger value="battle" aria-label="Battle simulator">
                  Battle
                </TabsTrigger>
                <TabsTrigger value="share" aria-label="Share creature">
                  Share
                </TabsTrigger>
                <TabsTrigger value="prompt" aria-label="View creation prompt">
                  Prompt
                </TabsTrigger>
              </TabsList>

              {/* Stats Tab */}
              <TabsContent value="stats" className="space-y-4" role="tabpanel">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-red-500" aria-hidden="true" />
                      <span className="font-medium text-red-700">Heart</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">{creature.stats.heart}</div>
                    <Progress
                      value={creature.stats.heart}
                      className="h-1 mt-2"
                      aria-label={`Heart stat: ${creature.stats.heart} out of 100`}
                    />
                  </div>

                  <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                      <span className="font-medium text-yellow-700">Speed</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{creature.stats.speed}</div>
                    <Progress
                      value={creature.stats.speed}
                      className="h-1 mt-2"
                      aria-label={`Speed stat: ${creature.stats.speed} out of 100`}
                    />
                  </div>

                  <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sword className="w-4 h-4 text-orange-500" aria-hidden="true" />
                      <span className="font-medium text-orange-700">Power</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{creature.stats.power}</div>
                    <Progress
                      value={creature.stats.power}
                      className="h-1 mt-2"
                      aria-label={`Power stat: ${creature.stats.power} out of 100`}
                    />
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-blue-500" aria-hidden="true" />
                      <span className="font-medium text-blue-700">Focus</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{creature.stats.focus}</div>
                    <Progress
                      value={creature.stats.focus}
                      className="h-1 mt-2"
                      aria-label={`Focus stat: ${creature.stats.focus} out of 100`}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Moves Tab */}
              <TabsContent value="moves" className="space-y-3" role="tabpanel">
                {moves.map((move, index) => (
                  <div key={index} className="bg-gray-50 rounded-2xl p-4 border">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{move.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        PP {move.pp}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{move.description}</p>
                  </div>
                ))}
              </TabsContent>

              {/* Battle Tab */}
              <TabsContent value="battle" className="space-y-4" role="tabpanel">
                {battleState === "idle" && (
                  <div className="text-center space-y-4">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 border border-purple-100">
                      <Swords className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">Battle Arena</h3>
                      <p className="text-sm text-muted-foreground mb-4">Test your Pokepet's strength in battle!</p>
                      <Button
                        onClick={startBattle}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Swords className="w-4 h-4 mr-2" />
                        Start Battle
                      </Button>
                    </div>
                  </div>
                )}

                {battleState !== "idle" && (
                  <div className="space-y-4">
                    {/* Battle Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-700">{creature.name}</span>
                        </div>
                        <Progress value={playerHP} className="h-2" />
                        <span className="text-xs text-green-600">{playerHP}/100 HP</span>
                      </div>

                      <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Swords className="w-4 h-4 text-red-600" />
                          <span className="font-medium text-red-700">Opponent</span>
                        </div>
                        <Progress value={opponentHP} className="h-2" />
                        <span className="text-xs text-red-600">{opponentHP}/100 HP</span>
                      </div>
                    </div>

                    {/* Battle Actions */}
                    {battleState === "battling" && (
                      <div className="grid grid-cols-2 gap-2">
                        {moves.slice(0, 4).map((move, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => performAttack(move.name)}
                            className="text-xs"
                          >
                            {move.name}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Battle Log */}
                    <div className="bg-gray-50 rounded-2xl p-4 border max-h-32 overflow-y-auto">
                      <h4 className="font-medium mb-2 text-sm">Battle Log</h4>
                      {battleLog.map((log, index) => (
                        <p key={index} className="text-xs text-muted-foreground mb-1">
                          {log}
                        </p>
                      ))}
                    </div>

                    {/* Battle End Actions */}
                    {(battleState === "victory" || battleState === "defeat") && (
                      <Button onClick={resetBattle} variant="outline" className="w-full bg-transparent">
                        Battle Again
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Share Tab */}
              <TabsContent value="share" className="space-y-4" role="tabpanel">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium" htmlFor="share-code">
                      Share Code
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowFullCode(!showFullCode)}
                      aria-label={showFullCode ? "Show code preview" : "Show full code"}
                    >
                      {showFullCode ? "Show Preview" : "Show Full"}
                    </Button>
                  </div>
                  <Textarea
                    id="share-code"
                    value={showFullCode ? shareCode : previewCode}
                    readOnly
                    className="min-h-[80px] text-xs font-mono"
                    aria-label="Creature share code"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => copyToClipboard(shareCode)}
                    variant="outline"
                    size="sm"
                    aria-label="Copy share code to clipboard"
                  >
                    <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                    Copy Code
                  </Button>

                  <Button
                    onClick={copyBattleInvite}
                    variant="outline"
                    size="sm"
                    className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
                    aria-label="Copy battle invite to clipboard"
                  >
                    <Users className="w-4 h-4 mr-2" aria-hidden="true" />
                    Battle Invite
                  </Button>
                </div>

                <div className="text-center">
                  {showQR ? (
                    <div className="space-y-2">
                      <img
                        src={generateQRCode(shareCode) || "/placeholder.svg"}
                        alt={`QR code for sharing ${creature.name}`}
                        className="w-24 h-24 mx-auto border rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground">Scan to share</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Share code too long for QR code. Use copy button instead.
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Prompt Tab */}
              <TabsContent value="prompt" className="space-y-4" role="tabpanel">
                <div>
                  <label className="text-sm font-medium mb-2 block" htmlFor="creation-prompt">
                    Original Prompt
                  </label>
                  <Textarea
                    id="creation-prompt"
                    value={safePrompt}
                    readOnly
                    className="min-h-[200px] text-sm"
                    placeholder="No prompt available"
                    aria-label="Original creation prompt"
                  />
                  {isPromptTruncated && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Prompt truncated for safety (showing first 800 characters)
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
