import React, { useEffect, useState } from 'react'

interface DamageIndicatorProps {
  damage: number
  isVisible: boolean
  onAnimationComplete: () => void
  position?: 'left' | 'right'
}

const DamageIndicator: React.FC<DamageIndicatorProps> = ({
  damage,
  isVisible,
  onAnimationComplete,
  position = 'right'
}) => {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      // Auto-hide after animation
      const timer = setTimeout(() => {
        setShouldRender(false)
        onAnimationComplete()
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, onAnimationComplete])

  // Add CSS animation to document head
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes damageFloat {
        0% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        50% {
          opacity: 1;
          transform: translateY(-20px) scale(1.2);
        }
        100% {
          opacity: 0;
          transform: translateY(-40px) scale(0.8);
        }
      }
      .damage-float {
        animation: damageFloat 2s ease-out forwards;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  if (!shouldRender) return null

  return (
    <div 
      className={`absolute z-20 pointer-events-none ${
        position === 'left' ? 'left-4' : 'right-4'
      } top-1/2 transform -translate-y-1/2`}
    >
      <div 
        className={`
          text-2xl font-bold text-red-500 
          drop-shadow-lg
          ${isVisible ? 'damage-float' : ''}
        `}
        style={{
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        -{damage}
      </div>
      

    </div>
  )
}

export default DamageIndicator