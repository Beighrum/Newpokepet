import { subscriptionService, SubscriptionTier } from '../subscriptionService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SubscriptionService', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('initializeSubscription', () => {
    it('should initialize with free tier when no stored subscription', async () => {
      const subscription = await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscription.tier).toBe('free');
      expect(subscription.isActive).toBe(true);
      expect(subscription.features.maxCardsPerMonth).toBe(10);
      expect(subscription.features.cardEvolution).toBe(false);
    });

    it('should load stored subscription from localStorage', async () => {
      const storedSubscription = {
        tier: 'premium',
        isActive: true,
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSubscription));

      const subscription = await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscription.tier).toBe('premium');
      expect(subscription.features.cardEvolution).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(`subscription_${mockUserId}`);
    });

    it('should fallback to free tier on error', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const subscription = await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscription.tier).toBe('free');
      expect(subscription.isActive).toBe(true);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should return correct access for free tier features', async () => {
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.hasFeatureAccess('cardEvolution')).toBe(false);
      expect(subscriptionService.hasFeatureAccess('videoGeneration')).toBe(false);
      expect(subscriptionService.hasFeatureAccess('prioritySupport')).toBe(false);
    });

    it('should return correct access for premium tier features', async () => {
      const premiumSubscription = {
        tier: 'premium',
        isActive: true,
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(premiumSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.hasFeatureAccess('cardEvolution')).toBe(true);
      expect(subscriptionService.hasFeatureAccess('videoGeneration')).toBe(false);
      expect(subscriptionService.hasFeatureAccess('prioritySupport')).toBe(true);
    });

    it('should return correct access for pro tier features', async () => {
      const proSubscription = {
        tier: 'pro',
        isActive: true,
        features: {
          maxCardsPerMonth: -1,
          cardEvolution: true,
          videoGeneration: true,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: true
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(proSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.hasFeatureAccess('cardEvolution')).toBe(true);
      expect(subscriptionService.hasFeatureAccess('videoGeneration')).toBe(true);
      expect(subscriptionService.hasFeatureAccess('customBranding')).toBe(true);
    });

    it('should return false for inactive subscription', async () => {
      const inactiveSubscription = {
        tier: 'premium',
        isActive: false,
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(inactiveSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.hasFeatureAccess('cardEvolution')).toBe(false);
      expect(subscriptionService.hasFeatureAccess('prioritySupport')).toBe(false);
    });
  });

  describe('hasTierAccess', () => {
    it('should return true for free tier access with any subscription', async () => {
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.hasTierAccess('free')).toBe(true);
    });

    it('should return correct tier hierarchy access', async () => {
      const premiumSubscription = {
        tier: 'premium',
        isActive: true,
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(premiumSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.hasTierAccess('free')).toBe(true);
      expect(subscriptionService.hasTierAccess('premium')).toBe(true);
      expect(subscriptionService.hasTierAccess('pro')).toBe(false);
    });

    it('should return false for higher tier when inactive', async () => {
      const inactiveSubscription = {
        tier: 'premium',
        isActive: false,
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(inactiveSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.hasTierAccess('premium')).toBe(false);
      expect(subscriptionService.hasTierAccess('free')).toBe(true);
    });
  });

  describe('getUsageLimits', () => {
    it('should return correct limits for free tier', async () => {
      await subscriptionService.initializeSubscription(mockUserId);
      
      const limits = subscriptionService.getUsageLimits();
      expect(limits.maxCardsPerMonth).toBe(10);
    });

    it('should return correct limits for premium tier', async () => {
      const premiumSubscription = {
        tier: 'premium',
        isActive: true,
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(premiumSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      const limits = subscriptionService.getUsageLimits();
      expect(limits.maxCardsPerMonth).toBe(100);
    });

    it('should return correct limits for pro tier', async () => {
      const proSubscription = {
        tier: 'pro',
        isActive: true,
        features: {
          maxCardsPerMonth: -1,
          cardEvolution: true,
          videoGeneration: true,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: true
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(proSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      const limits = subscriptionService.getUsageLimits();
      expect(limits.maxCardsPerMonth).toBe(-1); // unlimited
    });
  });

  describe('upgradeSubscription', () => {
    it('should upgrade subscription and store in localStorage', async () => {
      await subscriptionService.initializeSubscription(mockUserId);
      
      const upgradedSubscription = await subscriptionService.upgradeSubscription(mockUserId, 'premium');
      
      expect(upgradedSubscription.tier).toBe('premium');
      expect(upgradedSubscription.isActive).toBe(true);
      expect(upgradedSubscription.features.cardEvolution).toBe(true);
      expect(upgradedSubscription.expiresAt).toBeGreaterThan(Date.now());
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `subscription_${mockUserId}`,
        JSON.stringify(upgradedSubscription)
      );
    });

    it('should handle upgrade errors', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(
        subscriptionService.upgradeSubscription(mockUserId, 'premium')
      ).rejects.toThrow('Failed to upgrade subscription');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      const activeSubscription = {
        tier: 'premium',
        isActive: true,
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(activeSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      await subscriptionService.cancelSubscription(mockUserId);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `subscription_${mockUserId}`,
        expect.stringContaining('"isActive":false')
      );
    });

    it('should handle cancellation errors', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await subscriptionService.initializeSubscription(mockUserId);
      
      await expect(
        subscriptionService.cancelSubscription(mockUserId)
      ).rejects.toThrow('Failed to cancel subscription');
    });
  });

  describe('getPremiumFeatures', () => {
    it('should return all premium features', () => {
      const features = subscriptionService.getPremiumFeatures();
      
      expect(features).toHaveLength(6);
      expect(features.find(f => f.id === 'card_evolution')).toBeDefined();
      expect(features.find(f => f.id === 'video_generation')).toBeDefined();
      expect(features.find(f => f.id === 'priority_support')).toBeDefined();
    });
  });

  describe('getFeaturesForTier', () => {
    it('should return features available for free tier', () => {
      const features = subscriptionService.getFeaturesForTier('free');
      expect(features).toHaveLength(0); // No premium features for free tier
    });

    it('should return features available for premium tier', () => {
      const features = subscriptionService.getFeaturesForTier('premium');
      expect(features.length).toBeGreaterThan(0);
      expect(features.find(f => f.id === 'card_evolution')).toBeDefined();
      expect(features.find(f => f.id === 'video_generation')).toBeUndefined(); // Pro only
    });

    it('should return all features for pro tier', () => {
      const features = subscriptionService.getFeaturesForTier('pro');
      expect(features).toHaveLength(6); // All features
      expect(features.find(f => f.id === 'video_generation')).toBeDefined();
      expect(features.find(f => f.id === 'custom_branding')).toBeDefined();
    });
  });

  describe('isSubscriptionExpired', () => {
    it('should return false for subscription without expiration', async () => {
      await subscriptionService.initializeSubscription(mockUserId);
      expect(subscriptionService.isSubscriptionExpired()).toBe(false);
    });

    it('should return false for non-expired subscription', async () => {
      const futureSubscription = {
        tier: 'premium',
        isActive: true,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(futureSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.isSubscriptionExpired()).toBe(false);
    });

    it('should return true for expired subscription', async () => {
      const expiredSubscription = {
        tier: 'premium',
        isActive: true,
        expiresAt: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      expect(subscriptionService.isSubscriptionExpired()).toBe(true);
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should return null for subscription without expiration', async () => {
      await subscriptionService.initializeSubscription(mockUserId);
      expect(subscriptionService.getDaysUntilExpiration()).toBeNull();
    });

    it('should return correct days until expiration', async () => {
      const futureSubscription = {
        tier: 'premium',
        isActive: true,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
        features: {
          maxCardsPerMonth: 100,
          cardEvolution: true,
          videoGeneration: false,
          prioritySupport: true,
          advancedFilters: true,
          bulkOperations: true,
          customBranding: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(futureSubscription));
      await subscriptionService.initializeSubscription(mockUserId);
      
      const days = subscriptionService.getDaysUntilExpiration();
      expect(days).toBe(7);
    });
  });
});