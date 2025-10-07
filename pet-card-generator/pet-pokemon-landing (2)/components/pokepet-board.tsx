"use client"
import * as React from "react"
import { Reorder } from "framer-motion"
import type { Card as TCard } from "@/types"
import { PokePetDraggableCard } from "./PokePetDraggableCard"

type Props = {
  cards: TCard[] | null | undefined
  onReorder?: (next: TCard[]) => void
  onOpen?: (card: TCard) => void
  /** Pass true only when this pane is actually visible (active tab/dialog pane). */
  visible?: boolean
}

export function PokePetBoard({ cards, onReorder, onOpen, visible = true }: Props) {
  const mounted = useMounted() // avoid SSR/hidden measure
  const safe = React.useMemo(() => (Array.isArray(cards) ? (cards.filter(Boolean) as TCard[]) : []), [cards])
  const [items, setItems] = React.useState<TCard[]>(safe)
  React.useEffect(() => setItems(safe), [safe])

  if (!mounted || !visible) return null
  if (!items.length) return <div className="text-sm text-muted-foreground">No cards yet.</div>

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-4"
      style={{ contain: "layout paint" }} // isolates projection
    >
      <Reorder.Group
        as="ul"
        axis="xy"
        // Use primitive, stable ids
        values={items.map((c) => c.id)}
        onReorder={(nextIds) => {
          const next = nextIds.map((id) => items.find((c) => c.id === id)).filter(Boolean) as TCard[]
          setItems(next)
          onReorder?.(next)
        }}
      >
        {items.map((c) => (
          <Reorder.Item
            as="li"
            key={c.id}
            value={c.id}
            layout
            whileDrag={{ scale: 1.02, zIndex: 10 }}
            className="list-none touch-pan-y"
          >
            {/* Give the item an intrinsic box BEFORE image loads */}
            <div className="w-[260px] h-[360px]">
              {/* Child is NOT draggable; Reorder owns drag */}
              <PokePetDraggableCard card={c} onOpen={onOpen} />
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  )
}

function useMounted() {
  const [m, setM] = React.useState(false)
  React.useEffect(() => setM(true), [])
  return m
}
