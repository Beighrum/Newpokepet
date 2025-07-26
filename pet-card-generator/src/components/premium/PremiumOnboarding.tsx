import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Zap, 
  Star, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  Sparkles,
  Palette,
  Video,
  Filter,
  Users
} from 'lucide-react';
import { SubscriptionTier } from '@/services/subscriptionService';
import { useSubscription } from '@/hooks/useSubscription';
import PremiumBadge from './PremiumBadge';
import { cn } from '@/lib/utils';

interface PremiumOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
  className?: string;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  tier: SubscriptionTier;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Premium!',
    description: 'You now have access to powerful features that will transform your pet card experience.',
    icon: Crown,
    features: [
      'Generate up to 100 cards per month',
      'Access to card evolution',
      'Advanced filtering options',
      'Bulk operations support',
      'Priority customer support'
    ],
    tier: 'premium'
  },
  {
    id: 'evolution',
    title: 'Card Evolution',
    description: 'Transform your favorite cards into enhanced versions with advanced AI technology.',
    icon: Sparkles,
    features: [
      'Evolve cards to higher rarities',
      'Enhanced visual quality',
      'Track evolution history',
      'Preview before evolving',
      'Unlimited evolution attempts'
    ],
    tier: 'premium'
  },
  {
    id: 'advanced-features',
    title: 'Advanced Tools',
    description: 'Powerful tools to manage and organize your growing collection efficiently.',
    icon: Filter,
    features: [
      'Advanced search filters',
      'Bulk select and operations',
      'Collection analytics',
      'Export capabilities',
      'Custom sorting options'
    ],
    tier: 'premium'
  },
  {
    id: 'pro-features',
    title: 'Pro Features Available',
    description: 'Upgrade to Pro for even more advanced capabilities and unlimited access.',
    icon: Zap,
    features: [
      'Unlimited card generation',
      'Video card animations',
      'Custom branding options',
      'API access for developers',
      'White-label solutions'
    ],
    tier: 'pro'
  }
];

const PremiumOnboarding: React.FC<PremiumOnboardingProps> = ({
  onComplete,
  onSkip,
  className = ''
}) => {
  const { subscription, upgradeSubscription } = useSubscription();
  const [currentStep, setCurrentStep] = useState(0);
  const [upgrading, setUpgrading] = useState(false);

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      setUpgrading(true);
      await upgradeSubscription('pro');
      onComplete();
    } catch (error) {
      console.error('Upgrade to Pro failed:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const Icon = currentStepData.icon;
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isProStep = currentStepData.tier === 'pro';
  const hasProAccess = subscription?.tier === 'pro';

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep + 1} of {onboardingSteps.length}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content */}
      <Card className="border-2 border-purple-200 shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className={cn(
            'mx-auto mb-4 p-4 rounded-full w-fit',
            isProStep ? 'bg-yellow-100' : 'bg-purple-100'
          )}>
            <Icon className={cn(
              'w-12 h-12',
              isProStep ? 'text-yellow-600' : 'text-purple-600'
            )} />
          </div>
          
          <CardTitle className="text-2xl font-bold mb-2">
            {currentStepData.title}
          </CardTitle>
          
          <CardDescription className="text-lg">
            {currentStepData.description}
          </CardDescription>

          <div className="mt-4">
            <PremiumBadge tier={currentStepData.tier} size="lg" />
          </div>
        </CardHeader>

        <CardContent>
          {/* Features List */}
          <div className="space-y-3 mb-8">
            {currentStepData.features.map((feature, index) => (
              <div key={index} className="flex items-center">
                <div className={cn(
                  'p-1 rounded-full mr-3',
                  isProStep ? 'bg-yellow-100' : 'bg-purple-100'
                )}>
                  <Check className={cn(
                    'w-4 h-4',
                    isProStep ? 'text-yellow-600' : 'text-purple-600'
                  )} />
                </div>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* Special Pro Upgrade Section */}
          {isProStep && !hasProAccess && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-6 border border-yellow-200">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Ready for the Ultimate Experience?
                </h3>
                <p className="text-gray-600 mb-4">
                  Upgrade to Pro now and unlock unlimited possibilities
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">$19.99</div>
                    <div className="text-sm text-gray-500">per month</div>
                  </div>
                  <Button
                    onClick={handleUpgradeToPro}
                    disabled={upgrading}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                  >
                    {upgrading ? 'Upgrading...' : 'Upgrade to Pro'}
                    <Zap className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-2">
              {onSkip && (
                <Button
                  variant="ghost"
                  onClick={onSkip}
                  className="text-gray-500"
                >
                  Skip Tour
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className={cn(
                  'flex items-center',
                  isProStep 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                    : 'bg-purple-600 hover:bg-purple-700'
                )}
              >
                {isLastStep ? 'Get Started' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="mt-6 text-center">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-center mb-2">
            <Star className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">Pro Tip</span>
          </div>
          <p className="text-sm text-blue-800">
            {currentStep === 0 && "Start by exploring the card evolution feature - it's one of our most popular premium features!"}
            {currentStep === 1 && "You can evolve the same card multiple times to achieve different artistic styles."}
            {currentStep === 2 && "Use bulk operations to organize large collections quickly and efficiently."}
            {currentStep === 3 && "Pro users get access to our API for building custom integrations and workflows."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumOnboarding;