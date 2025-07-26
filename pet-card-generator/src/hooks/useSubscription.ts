import { useState, useEffect, useCallback } from 'react';
import { subscriptionService, SubscriptionStatus, SubscriptionTier, PremiumFeature } from '@/services/subscriptionService';
import { useAuth } from '@/hooks/useAuth';

interface UseSubscriptionReturn {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  hasFeatureAccess: (featureId: keyof SubscriptionStatus['features']) => boolean;
  hasTierAccess: (tier: SubscriptionTier) => boolean;
  getUsageLimits: () => { maxCardsPerMonth: number };
  getPremiumFeatures: () => PremiumFeature[];
  upgradeSubscription: (tier: SubscriptionTier) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  refresh: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize subscription
  const initializeSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const subscriptionData = await subscriptionService.initializeSubscription(user.id);
      setSubscription(subscriptionData);
    } catch (err) {
      console.error('Error initializing subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initialize on mount and when user changes
  useEffect(() => {
    initializeSubscription();
  }, [initializeSubscription]);

  // Check feature access
  const hasFeatureAccess = useCallback((featureId: keyof SubscriptionStatus['features']): boolean => {
    return subscriptionService.hasFeatureAccess(featureId);
  }, []);

  // Check tier access
  const hasTierAccess = useCallback((tier: SubscriptionTier): boolean => {
    return subscriptionService.hasTierAccess(tier);
  }, []);

  // Get usage limits
  const getUsageLimits = useCallback(() => {
    return subscriptionService.getUsageLimits();
  }, []);

  // Get premium features
  const getPremiumFeatures = useCallback(() => {
    return subscriptionService.getPremiumFeatures();
  }, []);

  // Upgrade subscription
  const upgradeSubscription = useCallback(async (tier: SubscriptionTier) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      const newSubscription = await subscriptionService.upgradeSubscription(user.id, tier);
      setSubscription(newSubscription);
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      await subscriptionService.cancelSubscription(user.id);
      // Refresh subscription status
      await initializeSubscription();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, initializeSubscription]);

  // Check if subscription is expired
  const isExpired = subscription ? subscriptionService.isSubscriptionExpired() : false;

  // Get days until expiration
  const daysUntilExpiration = subscription ? subscriptionService.getDaysUntilExpiration() : null;

  // Refresh subscription data
  const refresh = useCallback(async () => {
    await initializeSubscription();
  }, [initializeSubscription]);

  return {
    subscription,
    loading,
    error,
    hasFeatureAccess,
    hasTierAccess,
    getUsageLimits,
    getPremiumFeatures,
    upgradeSubscription,
    cancelSubscription,
    isExpired,
    daysUntilExpiration,
    refresh
  };
};