import { LandingHero } from "@/components/landing-hero"
import { FeatureCardList } from "@/components/feature-card-list"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <LandingHero />
      <FeatureCardList />
      <footer className="py-12 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              About
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Support
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            © 2024 Pokepet. Turn your beloved pets into legendary collectibles.
          </p>
        </div>
      </footer>
    </main>
  )
}
