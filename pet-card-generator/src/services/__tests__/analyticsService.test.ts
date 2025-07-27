import analyticsService from '../analyticsService';

// Mock global objects
const mockGtag = jest.fn();
const mockDataLayer: any[] = [];

Object.defineProperty(window, 'gtag', {
  value: mockGtag,
  writable: true
});

Object.defineProperty(window, 'dataLayer', {
  value: mockDataLayer,
  writable: true
});

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables
process.env.REACT_APP_GA_MEASUREMENT_ID = 'GA_TEST_ID';
process.env.REACT_APP_ANALYTICS_ENDPOINT = 'https://api.test.com/analytics';

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDataLayer.length = 0;
    (fetch as jest.Mock).mockClear();
  });

  describe('Event Tracking', () => {
    it('should track custom events', () => {
      const event = {
        name: 'test_event',
        parameters: {
          test_param: 'test_value'
        }
      };

      analyticsService.trackEvent(event);

      expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', expect.objectContaining({
        test_param: 'test_value'
      }));
    });

    it('should enrich events with additional parameters', () => {
      const event = {
        name: 'test_event',
        parameters: {
          custom_param: 'value'
        }
      };

      analyticsService.trackEvent(event);

      expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', expect.objectContaining({
        custom_param: 'value',
        user_agent: expect.any(String),
        screen_resolution: expect.any(String),
        viewport_size: expect.any(String)
      }));
    });

    it('should track page views', () => {
      analyticsService.trackPageView('/test-page', 'Test Page');

      expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/test-page',\n        page_title: 'Test Page'\n      });\n    });\n\n    it('should track conversions', () => {\n      const conversion = {\n        eventName: 'purchase',\n        value: 29.99,\n        currency: 'USD',\n        items: [{\n          itemId: 'premium_plan',\n          itemName: 'Premium Plan',\n          category: 'subscription',\n          quantity: 1,\n          price: 29.99\n        }]\n      };\n\n      analyticsService.trackConversion(conversion);\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {\n        send_to: 'GA_TEST_ID',\n        value: 29.99,\n        currency: 'USD'\n      });\n    });\n\n    it('should track user engagement', () => {\n      analyticsService.trackEngagement('click', 'button', 'cta_button', 1);\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'engagement', expect.objectContaining({\n        engagement_action: 'click',\n        engagement_category: 'button',\n        engagement_label: 'cta_button',\n        engagement_value: 1\n      }));\n    });\n  });\n\n  describe('Card Generation Tracking', () => {\n    it('should track successful card generation', () => {\n      const cardData = {\n        cardId: 'card_123',\n        petType: 'dog',\n        rarity: 'rare',\n        generationTime: 2500,\n        success: true\n      };\n\n      analyticsService.trackCardGeneration(cardData);\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'card_generated', expect.objectContaining({\n        card_id: 'card_123',\n        pet_type: 'dog',\n        rarity: 'rare',\n        generation_time: 2500,\n        success: true\n      }));\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', expect.objectContaining({\n        send_to: 'GA_TEST_ID',\n        value: 1\n      }));\n    });\n\n    it('should track failed card generation', () => {\n      const cardData = {\n        cardId: 'failed',\n        petType: 'cat',\n        rarity: 'unknown',\n        generationTime: 1000,\n        success: false,\n        errorMessage: 'Processing failed'\n      };\n\n      analyticsService.trackCardGeneration(cardData);\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'card_generated', expect.objectContaining({\n        card_id: 'failed',\n        pet_type: 'cat',\n        success: false,\n        error_message: 'Processing failed'\n      }));\n\n      // Should not track conversion for failed generation\n      expect(mockGtag).not.toHaveBeenCalledWith('event', 'conversion', expect.anything());\n    });\n  });\n\n  describe('Subscription Tracking', () => {\n    it('should track subscription events', () => {\n      const subscriptionData = {\n        action: 'subscribe' as const,\n        plan: 'premium',\n        value: 29.99,\n        currency: 'USD'\n      };\n\n      analyticsService.trackSubscription(subscriptionData);\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'subscription_subscribe', expect.objectContaining({\n        subscription_plan: 'premium',\n        subscription_value: 29.99,\n        currency: 'USD'\n      }));\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', expect.objectContaining({\n        send_to: 'GA_TEST_ID',\n        value: 29.99,\n        currency: 'USD'\n      }));\n    });\n  });\n\n  describe('Error Tracking', () => {\n    it('should track errors', () => {\n      const error = {\n        message: 'Test error',\n        stack: 'Error stack trace',\n        source: 'test.js',\n        fatal: false\n      };\n\n      analyticsService.trackError(error);\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'error_occurred', expect.objectContaining({\n        error_message: 'Test error',\n        error_stack: 'Error stack trace',\n        error_source: 'test.js',\n        error_fatal: false\n      }));\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {\n        description: 'Test error',\n        fatal: false\n      });\n    });\n  });\n\n  describe('User Management', () => {\n    it('should set user properties', () => {\n      const userId = 'user_123';\n      const properties = {\n        userType: 'premium' as const,\n        registrationDate: '2024-01-01',\n        deviceType: 'desktop' as const\n      };\n\n      analyticsService.setUser(userId, properties);\n\n      expect(mockGtag).toHaveBeenCalledWith('config', 'GA_TEST_ID', {\n        user_id: userId\n      });\n    });\n\n    it('should update user properties', () => {\n      const properties = {\n        totalCards: 5,\n        subscriptionTier: 'premium'\n      };\n\n      analyticsService.updateUserProperties(properties);\n\n      // Should call sendUserProperties internally\n      expect(fetch).toHaveBeenCalledWith(\n        'https://api.test.com/analytics/user-properties',\n        expect.objectContaining({\n          method: 'POST',\n          headers: {\n            'Content-Type': 'application/json'\n          }\n        })\n      );\n    });\n  });\n\n  describe('Performance Tracking', () => {\n    it('should track performance metrics', () => {\n      const metrics = {\n        pageLoadTime: 1500,\n        timeToInteractive: 2000,\n        firstContentfulPaint: 800,\n        largestContentfulPaint: 1200,\n        cumulativeLayoutShift: 0.05,\n        firstInputDelay: 50\n      };\n\n      analyticsService.trackPerformance(metrics);\n\n      expect(mockGtag).toHaveBeenCalledWith('event', 'performance_metrics', expect.objectContaining({\n        page_load_time: 1500,\n        time_to_interactive: 2000,\n        first_contentful_paint: 800,\n        largest_contentful_paint: 1200,\n        cumulative_layout_shift: 0.05,\n        first_input_delay: 50\n      }));\n    });\n  });\n\n  describe('Analytics Data', () => {\n    it('should return analytics data', () => {\n      analyticsService.setUser('test_user', { userType: 'free' });\n      \n      const data = analyticsService.getAnalyticsData();\n      \n      expect(data).toEqual({\n        userId: 'test_user',\n        sessionId: expect.any(String),\n        userProperties: expect.objectContaining({\n          userId: 'test_user',\n          userType: 'free'\n        }),\n        isInitialized: expect.any(Boolean)\n      });\n    });\n  });\n\n  describe('Custom Analytics Endpoint', () => {\n    it('should send events to custom endpoint', async () => {\n      (fetch as jest.Mock).mockResolvedValueOnce({\n        ok: true,\n        json: async () => ({ success: true })\n      });\n\n      const event = {\n        name: 'custom_event',\n        parameters: { test: 'value' }\n      };\n\n      analyticsService.trackEvent(event);\n\n      // Wait for async operations\n      await new Promise(resolve => setTimeout(resolve, 0));\n\n      expect(fetch).toHaveBeenCalledWith(\n        'https://api.test.com/analytics',\n        expect.objectContaining({\n          method: 'POST',\n          headers: {\n            'Content-Type': 'application/json'\n          },\n          body: expect.stringContaining('custom_event')\n        })\n      );\n    });\n\n    it('should handle fetch errors gracefully', async () => {\n      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));\n      \n      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();\n\n      const event = {\n        name: 'test_event',\n        parameters: {}\n      };\n\n      analyticsService.trackEvent(event);\n\n      // Wait for async operations\n      await new Promise(resolve => setTimeout(resolve, 0));\n\n      expect(consoleSpy).toHaveBeenCalledWith(\n        'Failed to send analytics event:',\n        expect.any(Error)\n      );\n\n      consoleSpy.mockRestore();\n    });\n  });\n});"