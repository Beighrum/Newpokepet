import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, Crown, Zap, ArrowRight, X } from 'lucide-react';
import { SubscriptionTier } from '@/services/subscriptionService';
import { useSubscription } from '@/hooks/useSubscription';
import PremiumBadge from './PremiumBadge';
import { cn } from '@/lib/utils';

interface PremiumGateProps {
  feature: string;
  requiredTier: SubscriptionTier;
  title: string;
  description: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  className?: string;
}

const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  requiredTier,
  title,
  description,
  children,
  fallback,
  showUpgradePrompt = true,
  className = ''
}) => {
  const { hasTierAccess, upgradeSubscription, loading } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const hasAccess = hasTierAccess(requiredTier);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    try {
      setUpgrading(true);
      await upgradeSubscription(tier);
      setShowUpgradeDialog(false);
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setUpgrading(false);
    }
  };

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If fallback is provided, render it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default premium gate UI
  return (
    <>
      <div className={cn('relative', className)}>
        {/* Blurred/disabled content */}
        <div className="relative">
          <div className="pointer-events-none select-none opacity-50 blur-sm">
            {children}
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent flex items-center justify-center">
            <Card className="max-w-sm mx-auto shadow-lg border-2 border-purple-200">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-3 p-3 bg-purple-100 rounded-full w-fit">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="text-center pt-0">
                <div className="mb-4">
                  <PremiumBadge tier={requiredTier} size="lg" />
                </div>
                
                {showUpgradePrompt && (
                  <Button
                    onClick={() => setShowUpgradeDialog(true)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={loading}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to {requiredTier === 'premium' ? 'Premium' : 'Pro'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Crown className="w-5 h-5 mr-2 text-purple-600" />
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription>
              Unlock {title.toLowerCase()} and many more premium features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Premium Plan */}
            <Card className={cn(
              'border-2 cursor-pointer transition-all',
              requiredTier === 'premium' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-purple-600" />
                    <span className="font-semibold">Premium</span>
                  </div>
                  <span className="text-lg font-bold">$9.99/mo</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                  <li>• 100 cards per month</li>
                  <li>• Card evolution</li>
                  <li>• Advanced filters</li>
                  <li>• Bulk operations</li>
                  <li>• Priority support</li>
                </ul>
                <Button
                  onClick={() => handleUpgrade('premium')}
                  disabled={upgrading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {upgrading ? 'Upgrading...' : 'Choose Premium'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={cn(
              'border-2 cursor-pointer transition-all',
              requiredTier === 'pro' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                    <span className="font-semibold">Pro</span>
                  </div>
                  <span className="text-lg font-bold">$19.99/mo</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                  <li>• Unlimited cards</li>
                  <li>• All Premium features</li>
                  <li>• Video generation</li>
                  <li>• Custom branding</li>
                  <li>• API access</li>
                </ul>
                <Button
                  onClick={() => handleUpgrade('pro')}
                  disabled={upgrading}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  {upgrading ? 'Upgrading...' : 'Choose Pro'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowUpgradeDialog(false)}
              className="text-gray-500"
            >
              <X className="w-4 h-4 mr-2" />
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PremiumGate;