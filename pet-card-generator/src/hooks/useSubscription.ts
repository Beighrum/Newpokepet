import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface Subscription {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt?: number;
  features: string[];
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  isLoading: boolean;
  hasFeatureAccess: (feature: string) => boolean;
  upgrade: (tier: SubscriptionTier) => Promise<void>;
  cancel: () => Promise<void>;
}

const FEATURE_ACCESS: Record<SubscriptionTier, string[]> = {
  free: ['basicGeneration', 'gallery', 'sharing'],
  pro: ['basicGeneration', 'gallery', 'sharing', 'videoGeneration', 'evolution', 'premiumStyles'],
  premium: ['basicGeneration', 'gallery', 'sharing', 'videoGeneration', 'evolution', 'premiumStyles', 'unlimitedGeneration', 'prioritySupport']
};

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    // Simulate loading subscription data
    // In a real app, this would fetch from your backend
    const loadSubscription = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For demo purposes, assume free tier
      const mockSubscription: Subscription = {
        tier: 'free',
        isActive: true,
        features: FEATURE_ACCESS.free
      };
      
      setSubscription(mockSubscription);
      setIsLoading(false);
    };

    loadSubscription();
  }, [user]);

  const hasFeatureAccess = (feature: string): boolean => {
    if (!subscription || !subscription.isActive) {
      return FEATURE_ACCESS.free.includes(feature);
    }
    
    return subscription.features.includes(feature);
  };

  const upgrade = async (tier: SubscriptionTier): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    // Simulate upgrade process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubscription(prev => prev ? {
      ...prev,
      tier,
      features: FEATURE_ACCESS[tier]
    } : null);
  };

  const cancel = async (): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    // Simulate cancellation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubscription(prev => prev ? {
      ...prev,
      tier: 'free',
      features: FEATURE_ACCESS.free
    } : null);
  };

  return {
    subscription,
    isLoading,
    hasFeatureAccess,
    upgrade,
    cancel
  };
};