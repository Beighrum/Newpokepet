export type SubscriptionTier = 'free' | 'premium' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  features: {
    maxCardsPerMonth: number;
    cardEvolution: boolean;
    videoGeneration: boolean;
    prioritySupport: boolean;
    advancedFilters: boolean;
    bulkOperations: boolean;
    customBranding: boolean;
  };
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  icon?: string;
}

const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SubscriptionStatus['features']> = {
  free: {
    maxCardsPerMonth: 10,
    cardEvolution: false,
    videoGeneration: false,
    prioritySupport: false,
    advancedFilters: false,
    bulkOperations: false,
    customBranding: false
  },
  premium: {
    maxCardsPerMonth: 100,
    cardEvolution: true,
    videoGeneration: false,
    prioritySupport: true,
    advancedFilters: true,
    bulkOperations: true,
    customBranding: false
  },
  pro: {
    maxCardsPerMonth: -1, // unlimited
    cardEvolution: true,
    videoGeneration: true,
    prioritySupport: true,
    advancedFilters: true,
    bulkOperations: true,
    customBranding: true
  }
};

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'card_evolution',
    name: 'Card Evolution',
    description: 'Evolve your cards into enhanced versions with advanced AI',
    tier: 'premium',
    icon: '🔄'
  },
  {
    id: 'video_generation',
    name: 'Video Generation',
    description: 'Generate high-quality video animations of your cards',
    tier: 'pro',
    icon: '🎬'
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: 'Get faster response times and dedicated support',
    tier: 'premium',
    icon: '⚡'
  },
  {
    id: 'advanced_filters',
    name: 'Advanced Filters',
    description: 'Access powerful filtering and search capabilities',
    tier: 'premium',
    icon: '🔍'
  },
  {
    id: 'bulk_operations',
    name: 'Bulk Operations',
    description: 'Perform actions on multiple cards at once',
    tier: 'premium',
    icon: '📦'
  },
  {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'Add your own branding to generated cards',
    tier: 'pro',
    icon: '🎨'
  }
];

class SubscriptionService {
  private currentSubscription: SubscriptionStatus | null = null;

  // Initialize subscription status (would typically fetch from backend)
  async initializeSubscription(userId: string): Promise<SubscriptionStatus> {
    try {
      // In a real app, this would fetch from your backend/Stripe
      // For now, we'll simulate with localStorage
      const stored = localStorage.getItem(`subscription_${userId}`);
      if (stored) {
        this.currentSubscription = JSON.parse(stored);
      } else {
        // Default to free tier
        this.currentSubscription = {
          tier: 'free',
          isActive: true,
          features: SUBSCRIPTION_FEATURES.free
        };
      }
      
      return this.currentSubscription;
    } catch (error) {
      console.error('Error initializing subscription:', error);
      // Fallback to free tier
      this.currentSubscription = {
        tier: 'free',
        isActive: true,
        features: SUBSCRIPTION_FEATURES.free
      };
      return this.currentSubscription;
    }
  }

  // Get current subscription status
  getCurrentSubscription(): SubscriptionStatus | null {
    return this.currentSubscription;
  }

  // Check if user has access to a specific feature
  hasFeatureAccess(featureId: keyof SubscriptionStatus['features']): boolean {
    if (!this.currentSubscription || !this.currentSubscription.isActive) {
      return SUBSCRIPTION_FEATURES.free[featureId] as boolean;
    }
    
    return this.currentSubscription.features[featureId] as boolean;
  }

  // Check if user is on a specific tier or higher
  hasTierAccess(requiredTier: SubscriptionTier): boolean {
    if (!this.currentSubscription || !this.currentSubscription.isActive) {
      return requiredTier === 'free';
    }

    const tierHierarchy: Record<SubscriptionTier, number> = {
      free: 0,
      premium: 1,
      pro: 2
    };

    return tierHierarchy[this.currentSubscription.tier] >= tierHierarchy[requiredTier];
  }

  // Get usage limits for current tier
  getUsageLimits(): { maxCardsPerMonth: number } {
    if (!this.currentSubscription || !this.currentSubscription.isActive) {
      return { maxCardsPerMonth: SUBSCRIPTION_FEATURES.free.maxCardsPerMonth };
    }
    
    return { maxCardsPerMonth: this.currentSubscription.features.maxCardsPerMonth };
  }

  // Get all available premium features
  getPremiumFeatures(): PremiumFeature[] {
    return PREMIUM_FEATURES;
  }

  // Get features available for a specific tier
  getFeaturesForTier(tier: SubscriptionTier): PremiumFeature[] {
    const tierHierarchy: Record<SubscriptionTier, number> = {
      free: 0,
      premium: 1,
      pro: 2
    };

    return PREMIUM_FEATURES.filter(feature => 
      tierHierarchy[feature.tier] <= tierHierarchy[tier]
    );
  }

  // Simulate subscription upgrade (in real app, would integrate with Stripe)
  async upgradeSubscription(userId: string, newTier: SubscriptionTier): Promise<SubscriptionStatus> {
    try {
      const newSubscription: SubscriptionStatus = {
        tier: newTier,
        isActive: true,
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        features: SUBSCRIPTION_FEATURES[newTier]
      };

      // Store in localStorage (in real app, would save to backend)
      localStorage.setItem(`subscription_${userId}`, JSON.stringify(newSubscription));
      this.currentSubscription = newSubscription;

      return newSubscription;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw new Error('Failed to upgrade subscription');
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<void> {
    try {
      if (this.currentSubscription) {
        this.currentSubscription.isActive = false;
        localStorage.setItem(`subscription_${userId}`, JSON.stringify(this.currentSubscription));
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // Check if subscription is expired
  isSubscriptionExpired(): boolean {
    if (!this.currentSubscription || !this.currentSubscription.expiresAt) {
      return false;
    }
    
    return Date.now() > this.currentSubscription.expiresAt;
  }

  // Get days until expiration
  getDaysUntilExpiration(): number | null {
    if (!this.currentSubscription || !this.currentSubscription.expiresAt) {
      return null;
    }
    
    const msUntilExpiration = this.currentSubscription.expiresAt - Date.now();
    return Math.ceil(msUntilExpiration / (24 * 60 * 60 * 1000));
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService;