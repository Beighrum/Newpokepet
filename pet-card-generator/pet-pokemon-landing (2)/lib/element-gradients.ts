export const elementGradients = {
  Water: "from-sky-400 to-blue-700",
  Fire: "from-orange-400 to-red-700",
  Leaf: "from-emerald-400 to-green-600",
  Bolt: "from-yellow-300 to-amber-500",
  Frost: "from-cyan-300 to-indigo-500",
  Stone: "from-stone-400 to-zinc-700",
  Spirit: "from-fuchsia-400 to-purple-600",
} as const

export type ElementKey = keyof typeof elementGradients
