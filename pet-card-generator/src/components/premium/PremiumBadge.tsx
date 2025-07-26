import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Zap } from 'lucide-react';
import { SubscriptionTier } from '@/services/subscriptionService';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  tier: SubscriptionTier;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  tier,
  size = 'md',
  showIcon = true,
  showText = true,
  className = ''
}) => {
  if (tier === 'free') {
    return null; // Don't show badge for free tier
  }

  const config = {
    premium: {
      label: 'Premium',
      icon: Crown,
      className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0',
      iconColor: 'text-yellow-300'
    },
    pro: {
      label: 'Pro',
      icon: Zap,
      className: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0',
      iconColor: 'text-white'
    }
  }[tier];

  const sizeConfig = {
    sm: {
      badge: 'text-xs px-2 py-0.5',
      icon: 'w-3 h-3',
      gap: 'gap-1'
    },
    md: {
      badge: 'text-sm px-2.5 py-1',
      icon: 'w-4 h-4',
      gap: 'gap-1.5'
    },
    lg: {
      badge: 'text-base px-3 py-1.5',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    }
  }[size];

  const Icon = config.icon;

  return (
    <Badge 
      className={cn(
        config.className,
        sizeConfig.badge,
        'font-semibold shadow-lg',
        className
      )}
    >
      <div className={cn('flex items-center', sizeConfig.gap)}>
        {showIcon && (
          <Icon className={cn(sizeConfig.icon, config.iconColor)} />
        )}
        {showText && config.label}
      </div>
    </Badge>
  );
};

export default PremiumBadge;