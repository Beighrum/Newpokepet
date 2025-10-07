import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, QrCode, Sparkles } from "lucide-react"

const features = [
  {
    icon: Crown,
    title: "Rarity System",
    description: "Each pet gets a unique rarity percentage based on their distinctive features and characteristics.",
    badge: "Ultra Rare",
    gradient: "from-yellow-400 to-orange-500",
  },
  {
    icon: Sparkles,
    title: "Evolution Paths",
    description: "Watch your pet creature grow and evolve into more powerful forms with special abilities.",
    badge: "Level Up",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    icon: QrCode,
    title: "Share & Battle",
    description: "Generate QR codes to share your creatures and battle with friends in epic matchups.",
    badge: "Multiplayer",
    gradient: "from-blue-400 to-cyan-500",
  },
]

export function FeatureCardList() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Magical Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the enchanting world of pet transformation with our cutting-edge AI technology
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="group relative p-8 rounded-3xl border-0 bg-white/60 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
              >
                <div className="relative">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 rounded-full"
                  >
                    {feature.badge}
                  </Badge>

                  <h3 className="text-xl font-semibold mb-4 group-hover:text-purple-600 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>

                {/* Subtle glow effect */}
                <div
                  className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                />
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
