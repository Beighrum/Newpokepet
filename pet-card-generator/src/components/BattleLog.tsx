import React, { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Trophy, Skull } from 'lucide-react'

interface BattleLogProps {
  battleLog: string[]
  winner: "player" | "opponent" | null
  battleActive: boolean
}

const BattleLog: React.FC<BattleLogProps> = ({ 
  battleLog, 
  winner, 
  battleActive 
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [battleLog])

  // Format log message with appropriate styling
  const formatLogMessage = (message: string, index: number) => {
    const isSystemMessage = message.includes('appeared!') || 
                           message.includes('ready for battle!') || 
                           message.includes('Battle begins!') ||
                           message.includes('Choose your')
    
    const isDamageMessage = message.includes('Dealt') && message.includes('damage!')
    const isMoveMessage = message.includes('used') && message.includes('!')
    const isResultMessage = message.includes('fainted!') || 
                           message.includes('won the battle!') || 
                           message.includes('lost the battle!')

    let messageClass = "text-gray-700"
    let icon = null

    if (isSystemMessage) {
      messageClass = "text-blue-600 font-medium"
      icon = <MessageSquare className="w-3 h-3 text-blue-500" />
    } else if (isMoveMessage) {
      messageClass = "text-purple-600 font-medium"
    } else if (isDamageMessage) {
      messageClass = "text-red-600 font-semibold"
    } else if (isResultMessage) {
      if (message.includes('won the battle!')) {
        messageClass = "text-green-600 font-bold"
        icon = <Trophy className="w-3 h-3 text-green-500" />
      } else if (message.includes('lost the battle!')) {
        messageClass = "text-red-600 font-bold"
        icon = <Skull className="w-3 h-3 text-red-500" />
      } else {
        messageClass = "text-orange-600 font-medium"
        icon = <Skull className="w-3 h-3 text-orange-500" />
      }
    }

    return (
      <div 
        key={index}
        className={`flex items-start gap-2 py-1 px-2 rounded transition-colors duration-200 ${
          isResultMessage ? 'bg-gray-50' : ''
        }`}
      >
        {icon && <div className="mt-0.5">{icon}</div>}
        <span className={`text-sm ${messageClass} leading-relaxed`}>
          {message}
        </span>
      </div>
    )
  }

  // Render winner announcement with enhanced messaging
  const renderWinnerAnnouncement = () => {
    if (!winner) return null

    return (
      <div className="mt-4 p-4 lg:p-6 rounded-lg border-2 border-dashed bg-gradient-to-r from-gray-50 to-white">
        {winner === 'player' ? (
          <div className="text-center">
            <div className="animate-bounce mb-2">
              <Trophy className="w-8 h-8 lg:w-12 lg:h-12 text-yellow-500 mx-auto" />
            </div>
            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-lg lg:text-xl px-4 lg:px-6 py-2 lg:py-3 rounded-full shadow-lg">
              🏆 Victory!
            </Badge>
            <div className="mt-3 lg:mt-4 space-y-2">
              <p className="text-base lg:text-lg font-semibold text-green-700">
                Congratulations! You won!
              </p>
              <p className="text-xs lg:text-sm text-gray-600">
                Your PokePet fought valiantly!
              </p>
              <div className="flex flex-wrap justify-center gap-2 lg:gap-4 mt-2 lg:mt-3 text-xs text-gray-500">
                <span>🎯 Complete</span>
                <span>⭐ XP Gained</span>
                <span>🏅 Victory</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-2">
              <Skull className="w-8 h-8 lg:w-12 lg:h-12 text-red-500 mx-auto" />
            </div>
            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-lg lg:text-xl px-4 lg:px-6 py-2 lg:py-3 rounded-full shadow-lg">
              💀 Defeat
            </Badge>
            <div className="mt-3 lg:mt-4 space-y-2">
              <p className="text-base lg:text-lg font-semibold text-red-700">
                Your PokePet was defeated!
              </p>
              <p className="text-xs lg:text-sm text-gray-600">
                Every battle is a learning experience.
              </p>
              <div className="flex flex-wrap justify-center gap-2 lg:gap-4 mt-2 lg:mt-3 text-xs text-gray-500">
                <span>🎯 Complete</span>
                <span>📚 Learned</span>
                <span>🔄 Try Again</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl rounded-3xl">
      <CardHeader className="pb-3">
        <CardTitle id="battle-log-title" className="flex items-center gap-2 text-base sm:text-lg">
          <MessageSquare className="w-5 h-5 text-blue-500" aria-hidden="true" />
          Battle Log
          {battleActive && (
            <Badge 
              variant="outline" 
              className="bg-green-50 text-green-600 border-green-200"
              aria-label="Battle is currently active"
            >
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-80 lg:h-96 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3"
          role="log"
          aria-live="polite"
          aria-label="Battle events and messages"
        >
          <div className="space-y-1">
            {battleLog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm">Battle log will appear here...</p>
              </div>
            ) : (
              <>
                {battleLog.map((message, index) => formatLogMessage(message, index))}
                <div ref={messagesEndRef} aria-hidden="true" />
              </>
            )}
          </div>
        </ScrollArea>
        
        {/* Winner announcement */}
        {renderWinnerAnnouncement()}
      </CardContent>
    </Card>
  )
}

export default BattleLog