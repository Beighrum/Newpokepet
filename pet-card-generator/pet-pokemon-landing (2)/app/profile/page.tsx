"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Coins, Gem, Crown, Settings, LogOut, Sparkles, TrendingUp, Calendar, Shield } from "lucide-react"

// Mock user data
const mockUser = {
  displayName: "Alex Chen",
  email: "alex.chen@example.com",
  avatar: "/friendly-user-avatar.png",
  coins: 1250,
  gems: 45,
  subscription: {
    status: "free", // "free" | "premium" | "pro"
    expiresAt: null,
  },
  usage: {
    creaturesCreated: 12,
    freeLimit: 20,
    monthlyLimit: 100,
  },
  joinedDate: "March 2024",
}

const subscriptionPlans = [
  {
    name: "Premium",
    price: "$9.99/month",
    features: ["50 creatures/month", "Priority processing", "Exclusive types"],
    current: mockUser.subscription.status === "premium",
  },
  {
    name: "Pro",
    price: "$19.99/month",
    features: ["Unlimited creatures", "Instant processing", "All features"],
    current: mockUser.subscription.status === "pro",
  },
]

export default function ProfilePage() {
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    // Simulate sign out delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSigningOut(false)
    // In real app, would redirect to login
  }

  const handleUpgrade = (planName: string) => {
    // In real app, would open payment flow
    console.log(`Upgrading to ${planName}`)
  }

  const getSubscriptionBadge = () => {
    switch (mockUser.subscription.status) {
      case "premium":
        return (
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        )
      case "pro":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="border-gray-600 text-gray-400">
            Free Tier
          </Badge>
        )
    }
  }

  const usagePercentage = (mockUser.usage.creaturesCreated / mockUser.usage.freeLimit) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20">
            <Avatar className="w-20 h-20 border-2 border-white/30">
              <AvatarImage src={mockUser.avatar || "/placeholder.svg"} alt={mockUser.displayName} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl font-bold">
                {mockUser.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{mockUser.displayName}</h1>
              <p className="text-purple-200 mb-3">{mockUser.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {getSubscriptionBadge()}
                <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                  <Calendar className="w-3 h-3 mr-1" />
                  Joined {mockUser.joinedDate}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Balances Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                Balances
              </CardTitle>
              <CardDescription className="text-purple-200">
                Your current currency and subscription status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium">Coins</span>
                </div>
                <span className="text-xl font-bold text-yellow-400">{mockUser.coins.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">Gems</span>
                </div>
                <span className="text-xl font-bold text-purple-400">{mockUser.gems}</span>
              </div>

              <Separator className="bg-white/20" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Subscription</span>
                  {getSubscriptionBadge()}
                </div>
                {mockUser.subscription.status === "free" ? (
                  <Button
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    onClick={() => handleUpgrade("Premium")}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Activate Premium
                  </Button>
                ) : (
                  <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Shield className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <span className="text-sm text-green-400">Active Subscription</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Usage Statistics
              </CardTitle>
              <CardDescription className="text-purple-200">Track your creature creation progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Creatures Created</span>
                  <span className="text-2xl font-bold text-blue-400">{mockUser.usage.creaturesCreated}</span>
                </div>

                {mockUser.subscription.status === "free" && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-200">Free tier limit</span>
                        <span className="text-purple-200">
                          {mockUser.usage.creaturesCreated}/{mockUser.usage.freeLimit}
                        </span>
                      </div>
                      <Progress value={usagePercentage} className="h-2 bg-white/10" />
                      {usagePercentage > 80 && <p className="text-sm text-yellow-400">⚠️ Approaching free tier limit</p>}
                    </div>
                  </>
                )}

                {mockUser.subscription.status !== "free" && (
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium">
                        {mockUser.subscription.status === "pro" ? "Unlimited" : `${mockUser.usage.monthlyLimit}/month`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-white/20" />

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400">8</div>
                  <div className="text-sm text-blue-300">This Week</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400">3</div>
                  <div className="text-sm text-purple-300">Legendary</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Account Settings
              </CardTitle>
              <CardDescription className="text-purple-200">
                Manage your subscription and account preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockUser.subscription.status === "free" && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-4">Upgrade Your Plan</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {subscriptionPlans.map((plan) => (
                      <div
                        key={plan.name}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{plan.name}</h4>
                          <span className="text-lg font-bold text-purple-400">{plan.price}</span>
                        </div>
                        <ul className="text-sm text-purple-200 space-y-1 mb-4">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-purple-400 rounded-full" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          onClick={() => handleUpgrade(plan.name)}
                        >
                          Upgrade to {plan.name}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mockUser.subscription.status !== "free" && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-semibold">Active {mockUser.subscription.status} Subscription</span>
                  </div>
                  <p className="text-sm text-green-300 mb-3">
                    You're enjoying all the premium features. Manage your subscription in your account settings.
                  </p>
                  <Button
                    variant="outline"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10 bg-transparent"
                    disabled
                  >
                    Manage Subscription
                  </Button>
                </div>
              )}

              <Separator className="bg-white/20 my-6" />

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isSigningOut ? "Signing Out..." : "Sign Out"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
