import abTestingService from '../abTestingService';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock fetch
global.fetch = jest.fn();

// Mock analytics service
const mockAnalyticsService = {
  trackEvent: jest.fn()
};

Object.defineProperty(window, 'analyticsService', {
  value: mockAnalyticsService
});

describe('ABTestingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    (fetch as jest.Mock).mockClear();
  });

  describe('Test Assignment', () => {
    it('should assign user to test variant deterministically', () => {
      abTestingService.setUser('test_user_123');
      
      const variant1 = abTestingService.getVariant('hero_cta_test');
      const variant2 = abTestingService.getVariant('hero_cta_test');
      
      // Should return the same variant for the same user
      expect(variant1).toBe(variant2);
      expect(variant1).toMatch(/^(control|variant_a)$/);
    });

    it('should return null for non-existent test', () => {
      abTestingService.setUser('test_user');
      
      const variant = abTestingService.getVariant('non_existent_test');
      
      expect(variant).toBeNull();
    });

    it('should check if user is in specific variant', () => {
      abTestingService.setUser('test_user_123');
      
      const variant = abTestingService.getVariant('hero_cta_test');
      const isInVariant = abTestingService.isInVariant('hero_cta_test', variant!);
      const isNotInVariant = abTestingService.isInVariant('hero_cta_test', 'other_variant');
      
      expect(isInVariant).toBe(true);
      expect(isNotInVariant).toBe(false);
    });

    it('should get variant configuration', () => {
      abTestingService.setUser('test_user_123');
      
      const config = abTestingService.getVariantConfig('hero_cta_test');
      
      expect(config).toHaveProperty('buttonText');
      expect(typeof config.buttonText).toBe('string');
    });
  });

  describe('Conversion Tracking', () => {
    it('should track conversion for assigned user', () => {
      abTestingService.setUser('test_user_123');
      abTestingService.getVariant('hero_cta_test'); // Assign to variant
      
      abTestingService.trackConversion('hero_cta_test', 'cta_click', 1);
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith({
        name: 'ab_test_conversion',
        parameters: {
          test_id: 'hero_cta_test',
          variant_id: expect.any(String),
          metric: 'cta_click',
          value: 1
        }
      });
    });

    it('should not track conversion for unassigned user', () => {
      abTestingService.trackConversion('hero_cta_test', 'cta_click', 1);
      
      expect(mockAnalyticsService.trackEvent).not.toHaveBeenCalled();
    });

    it('should send conversion to backend', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      process.env.REACT_APP_AB_TESTING_ENDPOINT = 'https://api.test.com/ab-testing';
      
      abTestingService.setUser('test_user_123');
      abTestingService.getVariant('hero_cta_test');
      abTestingService.trackConversion('hero_cta_test', 'signup', 1);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/ab-testing/conversion',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('signup')
        })
      );
    });
  });

  describe('Test Management', () => {
    it('should create new test', () => {
      const testConfig = {
        id: 'new_test',
        name: 'New Test',
        description: 'Test description',
        variants: [
          {
            id: 'control',
            name: 'Control',
            weight: 50,
            config: { feature: false },
            isControl: true
          },
          {
            id: 'variant_a',
            name: 'Variant A',
            weight: 50,
            config: { feature: true }
          }
        ],
        metrics: {
          primary: 'conversion'
        }
      };

      expect(() => {
        abTestingService.createTest(testConfig);
      }).not.toThrow();
    });

    it('should validate test configuration', () => {
      const invalidTestConfig = {
        id: 'invalid_test',
        name: 'Invalid Test',
        description: 'Test with invalid weights',
        variants: [
          {
            id: 'control',
            name: 'Control',
            weight: 60, // Total weights = 110, should be 100
            config: {},
            isControl: true
          },
          {
            id: 'variant_a',
            name: 'Variant A',
            weight: 50,
            config: {}
          }
        ],
        metrics: {
          primary: 'conversion'
        }
      };

      expect(() => {
        abTestingService.createTest(invalidTestConfig);
      }).toThrow('Variant weights must sum to 100');
    });

    it('should start test', () => {
      expect(() => {
        abTestingService.startTest('hero_cta_test');
      }).not.toThrow();
    });

    it('should stop test', () => {
      expect(() => {
        abTestingService.stopTest('hero_cta_test');
      }).not.toThrow();
    });

    it('should get active tests', () => {
      const activeTests = abTestingService.getActiveTests();
      
      expect(Array.isArray(activeTests)).toBe(true);
      expect(activeTests.length).toBeGreaterThan(0);
      expect(activeTests[0]).toHaveProperty('id');
      expect(activeTests[0]).toHaveProperty('status', 'running');
    });
  });

  describe('Exposure Tracking', () => {
    it('should log exposure on first variant access', () => {
      abTestingService.setUser('test_user_123');
      
      // First access should log exposure
      abTestingService.getVariant('hero_cta_test');
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith({
        name: 'ab_test_exposure',
        parameters: {
          test_id: 'hero_cta_test',
          variant_id: expect.any(String)
        }
      });
    });

    it('should not log exposure on subsequent accesses', () => {
      abTestingService.setUser('test_user_123');
      
      // First access
      abTestingService.getVariant('hero_cta_test');
      mockAnalyticsService.trackEvent.mockClear();
      
      // Second access should not log exposure again
      abTestingService.getVariant('hero_cta_test');
      
      expect(mockAnalyticsService.trackEvent).not.toHaveBeenCalled();
    });

    it('should send exposure to backend', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      process.env.REACT_APP_AB_TESTING_ENDPOINT = 'https://api.test.com/ab-testing';
      
      abTestingService.setUser('test_user_123');
      abTestingService.getVariant('hero_cta_test');

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/ab-testing/exposure',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });
  });

  describe('Persistence', () => {
    it('should save assignments to localStorage', () => {
      abTestingService.setUser('test_user_123');
      abTestingService.getVariant('hero_cta_test');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ab_test_assignments',
        expect.any(String)
      );
    });

    it('should load assignments from localStorage', () => {
      const mockAssignments = {
        'hero_cta_test': {
          testId: 'hero_cta_test',
          variantId: 'control',
          userId: 'test_user_123',
          assignedAt: Date.now(),
          exposureLogged: false
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockAssignments));
      
      // Create new service instance to test loading
      const newService = require('../abTestingService').default;
      newService.setUser('test_user_123');
      
      const variant = newService.getVariant('hero_cta_test');
      expect(variant).toBe('control');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      abTestingService.setUser('test_user_123');
      abTestingService.getVariant('hero_cta_test');
      abTestingService.trackConversion('hero_cta_test', 'conversion', 1);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send conversion result:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      abTestingService.setUser('test_user_123');
      abTestingService.getVariant('hero_cta_test');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save A/B test assignments:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Test Results', () => {
    it('should fetch test results', async () => {
      const mockResults = {
        testId: 'hero_cta_test',
        variants: [
          {
            variantId: 'control',
            participants: 1000,
            conversions: 100,
            conversionRate: 10.0
          },
          {
            variantId: 'variant_a',
            participants: 1000,
            conversions: 120,
            conversionRate: 12.0
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      process.env.REACT_APP_AB_TESTING_ENDPOINT = 'https://api.test.com/ab-testing';
      
      const results = await abTestingService.getTestResults('hero_cta_test');
      
      expect(results).toEqual(mockResults);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/ab-testing/results/hero_cta_test'
      );
    });

    it('should handle test results fetch errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const results = await abTestingService.getTestResults('hero_cta_test');
      
      expect(results).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch test results:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});