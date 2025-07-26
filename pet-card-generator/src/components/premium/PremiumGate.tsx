import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumGateProps {
  feature: string;
  requiredTier: 'pro' | 'premium';
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  requiredTier,
  title,
  description,
  className = '',
  children
}) => {
  const handleUpgrade = () => {
    // This would typically open a subscription modal or redirect to billing
    console.log(`Upgrade to ${requiredTier} for ${feature}`);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Blurred content */}
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none">
          {children}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="max-w-md mx-4 border-2 border-purple-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Crown className="w-12 h-12 text-purple-600" />
                  <Lock className="w-6 h-6 text-purple-500 absolute -bottom-1 -right-1 bg-white rounded-full p-1" />
                </div>
              </div>
              
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                {title}
              </CardTitle>
              
              <CardDescription className="text-center">
                {description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="text-center space-y-4">
              <div className="flex justify-center">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {requiredTier.toUpperCase()} Feature
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600">
                Upgrade to {requiredTier} to unlock this premium feature and many more.
              </p>
              
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
              </Button>
              
              <p className="text-xs text-gray-500">
                30-day money-back guarantee
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PremiumGate;