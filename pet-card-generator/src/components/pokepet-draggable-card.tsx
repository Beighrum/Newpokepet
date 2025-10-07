"use client"
import * as React from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { elementGradients } from "@/lib/element-gradients"

type Card = {
  id: string
  name: string
  element: string
  rarity: string
  level: number
  stage: string
  imageUrl?: string
  xp?: number
  stats: {
    heart: number
    power: number
    speed: number
    focus: number
  }
}

type Props = {
  card: Card
  onOpen?: (card: Card) => void
  className?: string
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="font-medium">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  )
}

export function PokePetDraggableCard({ card, onOpen, className }: Props) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-150, 150], [10, -10])
  const rotateY = useTransform(x, [-150, 150], [-10, 10])

  const [hover, setHover] = React.useState(false)

  const gradient = elementGradients[card.element] ?? elementGradients["spirit"]

  return (
    <motion.div
      drag
      dragElastic={0.6}
      dragMomentum
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      style={{ x, y, rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`select-none cursor-grab active:cursor-grabbing will-change-transform ${className ?? ""}`}
      onDoubleClick={() => onOpen?.(card)}
    >
      <div className="relative w-[260px] h-[360px]">
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} shadow-xl`} />
        <div className="absolute inset-[6px] rounded-2xl bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/50 shadow-inner" />
        <motion.div
          className="absolute inset-0 rounded-3xl"
          animate={{ opacity: hover ? 1 : 0.35 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          style={{ pointerEvents: "none" }}
        >
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
        </motion.div>

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
          <Progress value={card.xp ?? 0} className="h-2" />
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

        <motion.div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          animate={{ opacity: hover ? 0.7 : 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          style={{
            background: "radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%)",
          }}
        />
      </div>
    </motion.div>
  )
}
