import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Coins, Gem, Crown, Zap } from "lucide-react"

interface StoreCardProps {
  coins: number
  gems: number
  subscribed: boolean
  onPurchaseGems: (amount: number, price: number) => void
  onSubscribe: () => void
  className?: string
}

const gemPackages = [
  { gems: 100, price: 4.99, popular: false },
  { gems: 500, price: 19.99, popular: true },
  { gems: 1200, price: 39.99, popular: false },
]

export function StoreCard({ coins, gems, subscribed, onPurchaseGems, onSubscribe, className = "" }: StoreCardProps) {
  return (
    <Card className={`p-6 space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="font-semibold text-lg mb-2">Store</h3>
        <p className="text-sm text-muted-foreground">Get more gems and unlock premium features</p>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-600" />
            <span className="font-medium">Coins</span>
          </div>
          <span className="font-bold text-lg">{coins.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gem className="w-5 h-5 text-purple-600" />
            <span className="font-medium">Gems</span>
          </div>
          <span className="font-bold text-lg text-purple-600">{gems}</span>
        </div>
      </div>

      <Separator />

      {/* Gem Packages */}
      <div className="space-y-3">
        <h4 className="font-medium">Buy Gems</h4>
        {gemPackages.map((pkg, index) => (
          <div
            key={index}
            className={`relative border rounded-2xl p-4 ${
              pkg.popular ? "border-purple-300 bg-purple-50" : "border-gray-200"
            }`}
          >
            {pkg.popular && <Badge className="absolute -top-2 left-4 bg-purple-600 text-white">Most Popular</Badge>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <Gem className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{pkg.gems} Gems</p>
                  <p className="text-sm text-muted-foreground">${((pkg.price / pkg.gems) * 100).toFixed(1)}/100 gems</p>
                </div>
              </div>
              <Button
                onClick={() => onPurchaseGems(pkg.gems, pkg.price)}
                className="rounded-full"
                variant={pkg.popular ? "default" : "outline"}
              >
                ${pkg.price}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Premium Subscription */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-600" />
          <h4 className="font-medium">Premium Subscription</h4>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 border border-yellow-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Premium Monthly</span>
              <span className="font-bold text-lg">$9.99/mo</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span>Unlimited creature generations</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span>Priority processing queue</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span>Exclusive premium styles</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span>Advanced evolution paths</span>
              </div>
            </div>

            <Button
              onClick={onSubscribe}
              disabled={subscribed}
              className="w-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              {subscribed ? "Active Subscription" : "Subscribe Now"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
