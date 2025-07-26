import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Star, Check, X } from 'lucide-react';
import { SubscriptionTier } from '@/services/subscriptionService';
import { useSubscription } from '@/hooks/useSubscription';
import PremiumBadge from './PremiumBadge';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  highlightedFeature?: string;
  onClose?: () => void;
  className?: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  trigger,
  title = "Unlock Premium Features",
  description = "Get access to advanced features and unlimited possibilities",
  highlightedFeature,
  onClose,
  className = ''
}) => {
  const { subscription, upgradeSubscription, loading } = useSubscription();
  const [upgrading, setUpgrading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('premium');

  const handleUpgrade = async (tier: SubscriptionTier) => {
    try {
      setUpgrading(true);
      setSelectedTier(tier);
      await upgradeSubscription(tier);
      onClose?.();
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const plans = [
    {
      tier: 'premium' as SubscriptionTier,
      name: 'Premium',
      price: '$9.99',
      period: 'month',
      icon: Crown,
      color: 'purple',
      features: [
        '100 cards per month',
        'Card evolution',
        'Advanced filters',
        'Bulk operations',
        'Priority support'
      ],
      popular: true
    },
    {
      tier: 'pro' as SubscriptionTier,
      name: 'Pro',
      price: '$19.99',
      period: 'month',
      icon: Zap,
      color: 'yellow',
      features: [
        'Unlimited cards',
        'All Premium features',
        'Video generation',
        'Custom branding',
        'API access'
      ],
      popular: false
    }
  ];

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {trigger && (
        <div className="mb-6">
          {trigger}
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">{description}</p>
        {highlightedFeature && (
          <div className="mt-4">
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Star className="w-4 h-4 mr-1" />
              {highlightedFeature}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentTier = subscription?.tier === plan.tier;
          
          return (
            <Card 
              key={plan.tier}
              className={cn(
                'relative border-2 transition-all duration-200',
                plan.popular ? 'border-purple-500 shadow-lg scale-105' : 'border-gray-200',
                isCurrentTier && 'opacity-50 pointer-events-none'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className={cn(
                  'mx-auto mb-3 p-3 rounded-full w-fit',
                  plan.color === 'purple' ? 'bg-purple-100' : 'bg-yellow-100'
                )}>
                  <Icon className={cn(
                    'w-8 h-8',
                    plan.color === 'purple' ? 'text-purple-600' : 'text-yellow-600'
                  )} />
                </div>
                
                <CardTitle className="text-2xl font-bold">
                  {plan.name}
                </CardTitle>
                
                <div className="text-4xl font-bold text-gray-900 mt-2">
                  {plan.price}
                  <span className="text-lg font-normal text-gray-500">/{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentTier ? (
                  <div className="text-center">
                    <PremiumBadge tier={plan.tier} size="lg" />
                    <p className="text-sm text-gray-500 mt-2">Current Plan</p>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={upgrading || loading}
                    className={cn(
                      'w-full text-white font-semibold py-3',
                      plan.color === 'purple' 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                    )}
                  >
                    {upgrading && selectedTier === plan.tier ? (
                      'Upgrading...'
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ or Additional Info */}
      <div className="text-center">
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Why upgrade?</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <div className="font-medium text-gray-900 mb-1">More Creativity</div>
              <p>Generate more cards and explore unlimited possibilities</p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-1">Advanced Features</div>
              <p>Access powerful tools like card evolution and video generation</p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-1">Priority Support</div>
              <p>Get faster help when you need it most</p>
            </div>
          </div>
        </div>

        {onClose && (
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4 mr-2" />
            Maybe Later
          </Button>
        )}
      </div>
    </div>
  );
};

export default UpgradePrompt;