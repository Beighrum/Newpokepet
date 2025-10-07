"use client"
import * as React from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { elementGradients } from "@/lib/element-gradients"
import type { Card as TCard } from "@/types"

export function PokePetDraggableCard({ card, onOpen }: { card: TCard; onOpen?: (c: TCard) => void }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-60, 60], [6, -6])
  const rotateY = useTransform(x, [-60, 60], [-6, 6])
  const [hover, setHover] = React.useState(false)
  const gradient = elementGradients[card.element] ?? elementGradients["Spirit"]

  const isReady = card.status === "ready"
  const xpProgress = ((card.xp ?? 0) / (card.maxXp ?? 100)) * 100

  return (
    <motion.div
      layout // safe layout transitions; Reorder measures this
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        x.set(e.clientX - (rect.left + rect.width / 2))
        y.set(e.clientY - (rect.top + rect.height / 2))
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="cursor-pointer will-change-transform"
      onDoubleClick={() => onOpen?.(card)}
    >
      <div className="relative w-full h-full">
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} shadow-xl`} />
        <div className="absolute inset-[6px] rounded-2xl bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/50 shadow-inner" />

        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{ opacity: hover ? 0.6 : 0.3 }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
        >
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
        </motion.div>

        {/* Status overlay for non-ready creatures */}
        {!isReady && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent backdrop-blur-[1px] z-10 flex items-center justify-center rounded-3xl">
            <div className="animate-pulse">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="rounded-xl">
            {card.element}
          </Badge>
          <Badge variant="outline" className="rounded-xl">
            {card.rarity}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className="rounded-xl">Lv {card.level}</Badge>
        </div>

        {/* Owner badge for community cards */}
        {(card as any).owner && (
          <Badge className="absolute top-12 left-3 text-xs bg-blue-100 text-blue-800 border-blue-200 rounded-xl">
            by {(card as any).owner}
          </Badge>
        )}

        <div className="absolute inset-0 grid place-items-center px-4" style={{ transform: "translateZ(40px)" }}>
          <div className="w-44 h-44 rounded-2xl overflow-hidden ring-4 ring-white/20 bg-black/5">
            {card.imageUrl ? (
              <img
                src={card.imageUrl || "/placeholder.svg"}
                alt={card.name}
                className="w-full h-full object-cover"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">No Image</div>
            )}
          </div>
        </div>

        <div className="absolute bottom-20 left-4 right-4 space-y-2" style={{ transform: "translateZ(30px)" }}>
          <div className="flex items-center justify-between text-sm">
            <div className="font-semibold truncate">{card.name}</div>
            <div className="text-xs text-muted-foreground">{card.stage}</div>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </div>

        <div
          className="absolute bottom-4 left-4 right-4 grid grid-cols-4 gap-2 text-[10px]"
          style={{ transform: "translateZ(25px)" }}
        >
          <Stat label="Heart" value={card.stats.heart} />
          <Stat label="Power" value={card.stats.power} />
          <Stat label="Speed" value={card.stats.speed} />
          <Stat label="Focus" value={card.stats.focus} />
        </div>

        {/* Battle button for ready creatures */}
        {isReady && (
          <div className="absolute bottom-2 left-4 right-4" style={{ transform: "translateZ(25px)" }}>
            <Link href={`/battle?creature=${card.id}`}>
              <Button
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-xs h-8"
                onClick={(e) => e.stopPropagation()}
              >
                ⚔️ Start Battle
              </Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/60 px-2 py-1 text-center">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="font-semibold">{Math.round(value)}</div>
    </div>
  )
}
