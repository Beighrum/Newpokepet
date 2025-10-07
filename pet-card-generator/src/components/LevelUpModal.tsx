// Level up modal component to display pet progression and stat increases

import React, { useState, useEffect } from "react"
import { BattleCreature, StatIncreases } from "@/types/battle"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogPortal
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, Zap, Shield, Heart } from "lucide-react"

interface LevelUpModalProps {
  isOpen: boolean
  onClose: () => void
  petData: BattleCreature
  statIncreases: StatIncreases
  experienceGained: number
  onError?: (error: string) => void
}

interface AnimatedStatProps {
  label: string
  icon: React.ReactNode
  previousValue: number
  newValue: number
  increase: number
  delay: number
}

const AnimatedStat: React.FC<AnimatedStatProps> = ({
  label,
  icon,
  previousValue,
  newValue,
  increase,
  delay
}) => {
  const [currentValue, setCurrentValue] = useState(previousValue)
  const [showIncrease, setShowIncrease] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIncrease(true)
      
      // Animate the number change
      const duration = 1000 // 1 second animation
      const steps = 20
      const increment = (newValue - previousValue) / steps
      let step = 0

      const animationTimer = setInterval(() => {
        step++
        const progress = step / steps
        const easeOutQuart = 1 - Math.pow(1 - progress, 4) // Easing function
        const animatedValue = previousValue + (increment * steps * easeOutQuart)
        
        setCurrentValue(Math.round(animatedValue))
        
        if (step >= steps) {
          setCurrentValue(newValue)
          clearInterval(animationTimer)
        }
      }, duration / steps)

      return () => clearInterval(animationTimer)
    }, delay)

    return () => clearTimeout(timer)
  }, [previousValue, newValue, delay])

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          {icon}
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{currentValue}</span>
            {showIncrease && increase > 0 && (
              <Badge variant="secondary" className="animate-in slide-in-from-left-2 duration-500">
                +{increase}
              </Badge>
            )}
          </div>
        </div>
      </div>
      {showIncrease && increase > 0 && (
        <TrendingUp className="h-5 w-5 text-green-500 animate-in zoom-in-50 duration-300" />
      )}
    </div>
  )
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  petData,
  statIncreases,
  experienceGained,
  onError
}) => {
  const [showContent, setShowContent] = useState(false)

  // Validate props with error handling
  React.useEffect(() => {
    if (isOpen) {
      try {
        if (!petData || !petData.card) {
          throw new Error('Invalid pet data')
        }
        if (!statIncreases || typeof statIncreases !== 'object') {
          throw new Error('Invalid stat increases data')
        }
        if (typeof experienceGained !== 'number' || experienceGained < 0) {
          throw new Error('Invalid experience gained')
        }
      } catch (error) {
        console.error('LevelUpModal validation error:', error)
        onError?.(error instanceof Error ? error.message : 'Invalid level up data')
        onClose()
      }
    }
  }, [isOpen, petData, statIncreases, experienceGained, onError, onClose])

  useEffect(() => {
    if (isOpen) {
      try {
        setShowContent(false)
        const timer = setTimeout(() => {
          try {
            setShowContent(true)
          } catch (error) {
            console.error('Error showing level up content:', error)
            onError?.('Failed to display level up content')
          }
        }, 300)
        return () => clearTimeout(timer)
      } catch (error) {
        console.error('Error scheduling level up content:', error)
        onError?.('Failed to schedule level up display')
      }
    }
  }, [isOpen, onError])

  // Safely calculate stats with error handling
  let currentStats, previousStats
  try {
    currentStats = petData.card.stats || { attack: 50, defense: 50, hp: 100 }
    previousStats = {
      attack: Math.max(0, currentStats.attack - statIncreases.attack),
      defense: Math.max(0, currentStats.defense - statIncreases.defense),
      hp: Math.max(1, currentStats.hp - statIncreases.hp)
    }
  } catch (error) {
    console.error('Error calculating stats:', error)
    onError?.('Failed to calculate stat changes')
    currentStats = { attack: 50, defense: 50, hp: 100 }
    previousStats = { attack: 45, defense: 45, hp: 95 }
  }

  const handleClose = () => {
    try {
      setShowContent(false)
      setTimeout(() => {
        try {
          onClose()
        } catch (error) {
          console.error('Error during modal close callback:', error)
          onError?.('Failed to close level up modal')
        }
      }, 200)
    } catch (error) {
      console.error('Error closing level up modal:', error)
      onError?.('Failed to close level up modal')
      // Force close even if there's an error
      onClose()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogPortal>
        {/* Custom overlay with darker background */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          onKeyDown={handleKeyDown}
          aria-describedby="level-up-description"
        >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-16 h-16 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Level Up!
          </DialogTitle>
          <DialogDescription id="level-up-description" className="text-base">
            {petData.card.name} reached level {statIncreases.newLevel}!
          </DialogDescription>
        </DialogHeader>

        {showContent && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Experience Gained</p>
              <p className="text-xl font-bold text-blue-600">+{experienceGained} XP</p>
              <p className="text-xs text-muted-foreground mt-1">
                Level {statIncreases.previousLevel} → {statIncreases.newLevel}
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold text-center text-lg">Stat Increases</h3>
              
              <AnimatedStat
                label="Attack"
                icon={<Zap className="h-4 w-4 text-yellow-600" />}
                previousValue={previousStats.attack}
                newValue={currentStats.attack}
                increase={statIncreases.attack}
                delay={200}
              />

              <AnimatedStat
                label="Defense"
                icon={<Shield className="h-4 w-4 text-blue-600" />}
                previousValue={previousStats.defense}
                newValue={currentStats.defense}
                increase={statIncreases.defense}
                delay={400}
              />

              <AnimatedStat
                label="Health"
                icon={<Heart className="h-4 w-4 text-red-600" />}
                previousValue={previousStats.hp}
                newValue={currentStats.hp}
                increase={statIncreases.hp}
                delay={600}
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button 
            onClick={handleClose} 
            className="w-full"
            size="lg"
            autoFocus
          >
            Continue
          </Button>
        </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

export default LevelUpModal