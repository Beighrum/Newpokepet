import React from 'react';
import { RarityLevel, RARITY_CONFIG } from '@/services/raritySystem';
import { cn } from '@/lib/utils';

interface RarityBadgeProps {
  rarity: RarityLevel;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
  showEmoji?: boolean;
  showEffects?: boolean;
  className?: string;
  animated?: boolean;
}

const RarityBadge: React.FC<RarityBadgeProps> = ({
  rarity,
  size = 'md',
  showGlow = false,
  showEmoji = true,
  showEffects = false,
  className = '',
  animated = false
}) => {
  const config = RARITY_CONFIG[rarity];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const glowClasses = (showGlow || showEffects) ? {
    common: 'shadow-lg',
    uncommon: 'shadow-lg shadow-green-500/25',
    rare: 'shadow-lg shadow-blue-500/25',
    epic: 'shadow-lg shadow-purple-500/25',
    legendary: 'shadow-lg shadow-yellow-500/25',
    secret_rare: 'shadow-lg shadow-pink-500/25'
  } : {};

  const animationClasses = (animated || showEffects) ? {
    common: '',
    uncommon: 'animate-pulse',
    rare: 'animate-pulse',
    epic: 'animate-bounce',
    legendary: 'animate-bounce',
    secret_rare: 'animate-ping'
  } : {};

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full border-2 transition-all duration-200',
        sizeClasses[size],
        glowClasses[rarity] || '',
        animationClasses[rarity] || '',
        className
      )}
      style={{
        color: config.color,
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor
      }}
      title={config.description}
    >
      {showEmoji && (
        <span className="text-xs" role="img" aria-label={config.displayName}>
          {config.emoji}
        </span>
      )}
      <span className="capitalize">{config.displayName}</span>
    </span>
  );
};

export default RarityBadge;