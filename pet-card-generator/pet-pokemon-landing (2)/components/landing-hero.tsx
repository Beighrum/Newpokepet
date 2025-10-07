import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, PawPrint } from "lucide-react"
import Link from "next/link"

export function LandingHero() {
  return (
    <section className="relative px-4 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <Badge
              variant="secondary"
              className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 rounded-full px-4 py-2"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Transform Your Pet Today
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent leading-tight mb-6">
              Turn Your Pet Into a Collectible Pokepet
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Upload a photo of your beloved pet and watch as AI transforms them into a unique, collectible creature
              with special abilities, rarity levels, and evolutionary paths.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/upload">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-3xl px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <PawPrint className="w-5 h-5 mr-2" />
                  Upload a Photo
                </Button>
              </Link>

              <Link href="/gallery">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-3xl px-8 py-6 text-lg font-semibold border-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 hover:-translate-y-1 bg-transparent"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  View Gallery
                </Button>
              </Link>
            </div>
          </div>

          {/* Mascot/Illustration Area */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 rounded-3xl p-8 backdrop-blur-sm border border-white/20 shadow-2xl">
              <div className="aspect-[3/4] bg-gradient-to-br from-purple-200 to-pink-200 rounded-3xl flex items-center justify-center relative overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%203%2C%202025%2C%2001_24_43%20PM.png-dJM1bU7tA06JyhuW11Jp97drUA1zh3.jpeg"
                  alt="Shihflar - A cute Shih Tzu Pokemon card showing the transformation magic"
                  className="w-full h-full object-contain rounded-3xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent rounded-3xl" />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-yellow-400 text-yellow-900 border-yellow-500 rounded-full">⭐ Legendary</Badge>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-bounce delay-300" />
              <div className="absolute top-1/2 -left-4 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-bounce delay-700" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
