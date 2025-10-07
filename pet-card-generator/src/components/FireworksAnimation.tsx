import React, { useEffect, useState } from 'react'

interface FireworksAnimationProps {
  isActive: boolean
  duration?: number // Duration in milliseconds, defaults to 4000ms (4 seconds)
  onComplete?: () => void
  onError?: (error: string) => void
}

interface Firework {
  id: number
  x: number
  y: number
  color: string
  delay: number
}

const FireworksAnimation: React.FC<FireworksAnimationProps> = ({
  isActive,
  duration = 4000,
  onComplete,
  onError
}) => {
  const [showAnimation, setShowAnimation] = useState(false)
  const [fireworks, setFireworks] = useState<Firework[]>([])

  // Generate random fireworks
  useEffect(() => {
    if (isActive) {
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe']
      const newFireworks: Firework[] = []
      
      // Create 5 fireworks at different positions and times
      for (let i = 0; i < 5; i++) {
        newFireworks.push({
          id: i,
          x: Math.random() * 80 + 10, // 10% to 90% of screen width
          y: Math.random() * 40 + 15, // 15% to 55% of screen height
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: i * 800 // Stagger the fireworks
        })
      }
      
      setFireworks(newFireworks)
    }
  }, [isActive])

  useEffect(() => {
    if (isActive) {
      try {
        setShowAnimation(true)
        
        // Auto-cleanup after duration
        const timer = setTimeout(() => {
          try {
            setShowAnimation(false)
            setFireworks([])
            onComplete?.()
          } catch (error) {
            console.error('Error during fireworks completion:', error)
            onError?.('Animation completion failed')
          }
        }, duration)

        return () => clearTimeout(timer)
      } catch (error) {
        console.error('Error starting fireworks animation:', error)
        onError?.('Animation failed to start')
      }
    } else {
      setShowAnimation(false)
      setFireworks([])
    }
  }, [isActive, duration, onComplete, onError])

  if (!showAnimation) {
    return null
  }

  return (
    <>
      {/* Inject CSS for fireworks animations */}
      <style>{`
        @keyframes firework-launch {
          0% {
            transform: translateY(100vh) scale(0.1);
            opacity: 1;
          }
          80% {
            transform: translateY(0) scale(0.1);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
        }
        
        @keyframes firework-burst {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          20% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1) rotate(180deg);
            opacity: 1;
          }
        }
        
        @keyframes particle-explode {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(0);
            opacity: 0;
          }
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        .firework-container {
          position: absolute;
          pointer-events: none;
        }
        
        .firework-launch {
          position: absolute;
          width: 4px;
          height: 20px;
          border-radius: 2px;
          animation: firework-launch 1s ease-out forwards;
        }
        
        .firework-burst {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: firework-burst 1.5s ease-out forwards;
        }
        
        .sparkle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          animation: sparkle 0.8s ease-in-out infinite;
        }
        
        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          animation: particle-explode 2s ease-out forwards;
        }
      `}</style>
      
      <div 
        className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
        role="presentation"
        aria-hidden="true"
        style={{ 
          background: 'transparent',
          backgroundColor: 'transparent'
        }}
      >
        {fireworks.map((firework) => (
          <div
            key={firework.id}
            className="firework-container"
            style={{
              left: `${firework.x}%`,
              top: `${firework.y}%`,
              animationDelay: `${firework.delay}ms`
            }}
          >
            {/* Launch trail */}
            <div
              className="firework-launch"
              style={{
                backgroundColor: firework.color,
                animationDelay: `${firework.delay}ms`
              }}
            />
            
            {/* Main burst */}
            <div
              className="firework-burst"
              style={{
                backgroundColor: firework.color,
                animationDelay: `${firework.delay + 800}ms`,
                boxShadow: `0 0 20px ${firework.color}`
              }}
            />
            
            {/* Explosion particles */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30) * (Math.PI / 180)
              const distance = 60 + Math.random() * 40
              const dx = Math.cos(angle) * distance
              const dy = Math.sin(angle) * distance
              
              return (
                <div
                  key={`particle-${i}`}
                  className="particle"
                  style={{
                    backgroundColor: firework.color,
                    animationDelay: `${firework.delay + 800}ms`,
                    '--dx': `${dx}px`,
                    '--dy': `${dy}px`
                  } as React.CSSProperties}
                />
              )
            })}
            
            {/* Sparkles around the burst */}
            {Array.from({ length: 8 }).map((_, i) => {
              const sparkleDelay = firework.delay + 800 + (i * 100)
              const sparkleX = (Math.random() - 0.5) * 40
              const sparkleY = (Math.random() - 0.5) * 40
              
              return (
                <div
                  key={`sparkle-${i}`}
                  className="sparkle"
                  style={{
                    backgroundColor: '#ffffff',
                    left: `${sparkleX}px`,
                    top: `${sparkleY}px`,
                    animationDelay: `${sparkleDelay}ms`,
                    boxShadow: `0 0 6px ${firework.color}`
                  }}
                />
              )
            })}
          </div>
        ))}
        
        {/* Additional celebration elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Falling confetti */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={`confetti-${i}`}
              className="absolute w-2 h-4 opacity-70"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b'][i % 6],
                transform: `rotate(${Math.random() * 360}deg)`,
                animation: `confetti-fall ${3 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          ))}
          
          {/* Twinkling stars and celebration emojis */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute opacity-80"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                fontSize: `${12 + Math.random() * 8}px`,
                animation: `twinkle ${1 + Math.random()}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            >
              {['✨', '⭐', '🌟', '💫'][i % 4]}
            </div>
          ))}
          
          {/* Celebration emojis */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`emoji-${i}`}
              className="absolute opacity-90"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 40 + 10}%`,
                fontSize: `${16 + Math.random() * 12}px`,
                animation: `sparkle ${2 + Math.random()}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`
              }}
            >
              {['🎉', '🎊', '🏆', '🥳', '🎆', '🎇'][i % 6]}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default FireworksAnimation