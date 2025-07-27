import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Lazy import analytics services to prevent initialization errors
let analyticsService: any = null;
let abTestingService: any = null;

try {
  analyticsService = require('@/services/analyticsService').default;
} catch (error) {
  console.warn('Analytics service not available:', error);
}

try {
  abTestingService = require('@/services/abTestingService').default;
} catch (error) {
  console.warn('A/B testing service not available:', error);
}

interface UseAnalyticsOptions {
  trackPageViews?: boolean;
  trackUserInteractions?: boolean;
  enableABTesting?: boolean;
}

interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
}

interface ConversionEvent {
  eventName: string;
  value?: number;
  currency?: string;
  items?: Array<{
    itemId: string;
    itemName: string;
    category: string;
    quantity: number;
    price: number;
  }>;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const {
    trackPageViews = true,
    trackUserInteractions = true,
    enableABTesting = true
  } = options;

  const location = useLocation();

  // Track page views automatically
  useEffect(() => {
    if (trackPageViews) {
      analyticsService.trackPageView(location.pathname);
    }
  }, [location.pathname, trackPageViews]);

  // Track custom event
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    if (analyticsService) {
      analyticsService.trackEvent(event);
    }
  }, []);

  // Track conversion
  const trackConversion = useCallback((conversion: ConversionEvent) => {
    if (analyticsService) {
      analyticsService.trackConversion(conversion);
    }
  }, []);

  // Track user engagement
  const trackEngagement = useCallback((action: string, category: string, label?: string, value?: number) => {
    if (analyticsService) {
      analyticsService.trackEngagement(action, category, label, value);
    }
  }, []);

  // Track card generation
  const trackCardGeneration = useCallback((cardData: {
    cardId: string;
    petType: string;
    rarity: string;
    generationTime: number;
    success: boolean;
    errorMessage?: string;
  }) => {
    if (analyticsService) {
      analyticsService.trackCardGeneration(cardData);
    }
  }, []);

  // Track subscription events
  const trackSubscription = useCallback((subscriptionData: {
    action: 'subscribe' | 'upgrade' | 'cancel' | 'renew';
    plan: string;
    value: number;
    currency: string;
  }) => {
    if (analyticsService) {
      analyticsService.trackSubscription(subscriptionData);
    }
  }, []);

  // Track errors
  const trackError = useCallback((error: {
    message: string;
    stack?: string;
    source: string;
    userId?: string;
    fatal: boolean;
  }) => {
    if (analyticsService) {
      analyticsService.trackError(error);
    }
  }, []);

  // A/B Testing functions
  const getABTestVariant = useCallback((testId: string): string | null => {
    if (!enableABTesting || !abTestingService) return null;
    return abTestingService.getVariant(testId);
  }, [enableABTesting]);

  const isInABTestVariant = useCallback((testId: string, variantId: string): boolean => {
    if (!enableABTesting || !abTestingService) return false;
    return abTestingService.isInVariant(testId, variantId);
  }, [enableABTesting]);

  const getABTestConfig = useCallback((testId: string): Record<string, any> => {
    if (!enableABTesting || !abTestingService) return {};
    return abTestingService.getVariantConfig(testId);
  }, [enableABTesting]);

  const trackABTestConversion = useCallback((testId: string, metric: string, value: number = 1) => {
    if (!enableABTesting || !abTestingService) return;
    abTestingService.trackConversion(testId, metric, value);
  }, [enableABTesting]);

  // Set user properties
  const setUser = useCallback((userId: string, properties?: Record<string, any>) => {
    if (analyticsService) {
      analyticsService.setUser(userId, properties);
    }
    if (enableABTesting && abTestingService) {
      abTestingService.setUser(userId);
    }
  }, [enableABTesting]);

  // Update user properties
  const updateUserProperties = useCallback((properties: Record<string, any>) => {
    if (analyticsService) {
      analyticsService.updateUserProperties(properties);
    }
  }, []);

  return {
    // Event tracking
    trackEvent,
    trackConversion,
    trackEngagement,
    trackCardGeneration,
    trackSubscription,
    trackError,
    
    // A/B Testing
    getABTestVariant,
    isInABTestVariant,
    getABTestConfig,
    trackABTestConversion,
    
    // User management
    setUser,
    updateUserProperties,
    
    // Analytics service instance (for advanced usage)
    analyticsService,
    abTestingService
  };
};

// Hook for tracking component interactions
export const useInteractionTracking = () => {
  const { trackEvent, trackEngagement } = useAnalytics();

  const trackClick = useCallback((elementId: string, elementType: string, additionalData?: Record<string, any>) => {
    trackEvent({
      name: 'click',
      parameters: {
        element_id: elementId,
        element_type: elementType,
        ...additionalData
      }
    });
  }, [trackEvent]);

  const trackFormSubmit = useCallback((formId: string, formType: string, success: boolean, errorMessage?: string) => {
    trackEvent({
      name: 'form_submit',
      parameters: {
        form_id: formId,
        form_type: formType,
        success,
        error_message: errorMessage
      }
    });
  }, [trackEvent]);

  const trackFileUpload = useCallback((fileType: string, fileSize: number, success: boolean, errorMessage?: string) => {
    trackEvent({
      name: 'file_upload',
      parameters: {
        file_type: fileType,
        file_size: fileSize,
        success,
        error_message: errorMessage
      }
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount: number, source: string) => {
    trackEvent({
      name: 'search',
      parameters: {
        search_query: query,
        results_count: resultsCount,
        search_source: source
      }
    });
  }, [trackEvent]);

  const trackShare = useCallback((contentType: string, contentId: string, shareMethod: string) => {
    trackEvent({
      name: 'share',
      parameters: {
        content_type: contentType,
        content_id: contentId,
        share_method: shareMethod
      }
    });
  }, [trackEvent]);

  const trackDownload = useCallback((contentType: string, contentId: string, format: string) => {
    trackEvent({
      name: 'download',
      parameters: {
        content_type: contentType,
        content_id: contentId,
        download_format: format
      }
    });
  }, [trackEvent]);

  return {
    trackClick,
    trackFormSubmit,
    trackFileUpload,
    trackSearch,
    trackShare,
    trackDownload
  };
};

// Hook for performance tracking
export const usePerformanceTracking = () => {
  const { trackEvent } = useAnalytics();

  const trackPageLoad = useCallback((pageName: string, loadTime: number) => {
    trackEvent({
      name: 'page_load_time',
      parameters: {
        page_name: pageName,
        load_time: loadTime
      }
    });
  }, [trackEvent]);

  const trackAPICall = useCallback((endpoint: string, method: string, responseTime: number, success: boolean, statusCode?: number) => {
    trackEvent({
      name: 'api_call',
      parameters: {
        api_endpoint: endpoint,
        http_method: method,
        response_time: responseTime,
        success,
        status_code: statusCode
      }
    });
  }, [trackEvent]);

  const trackImageLoad = useCallback((imageUrl: string, loadTime: number, success: boolean, errorMessage?: string) => {
    trackEvent({
      name: 'image_load',
      parameters: {
        image_url: imageUrl,
        load_time: loadTime,
        success,
        error_message: errorMessage
      }
    });
  }, [trackEvent]);

  return {
    trackPageLoad,
    trackAPICall,
    trackImageLoad
  };
};

// Hook for business metrics tracking
export const useBusinessMetrics = () => {
  const { trackConversion, trackEvent } = useAnalytics();

  const trackSignup = useCallback((method: string, userType: string) => {
    trackConversion({
      eventName: 'signup',
      value: 1,
      items: [{
        itemId: 'signup',
        itemName: 'User Signup',
        category: 'acquisition',
        quantity: 1,
        price: 0
      }]
    });

    trackEvent({
      name: 'signup_completed',
      parameters: {
        signup_method: method,
        user_type: userType
      }
    });
  }, [trackConversion, trackEvent]);

  const trackPurchase = useCallback((planId: string, planName: string, amount: number, currency: string = 'USD') => {
    trackConversion({
      eventName: 'purchase',
      value: amount,
      currency,
      items: [{
        itemId: planId,
        itemName: planName,
        category: 'subscription',
        quantity: 1,
        price: amount
      }]
    });
  }, [trackConversion]);

  const trackTrialStart = useCallback((planId: string, planName: string, trialDays: number) => {
    trackEvent({
      name: 'trial_start',
      parameters: {
        plan_id: planId,
        plan_name: planName,
        trial_days: trialDays
      }
    });
  }, [trackEvent]);

  const trackFeatureUsage = useCallback((featureName: string, usageCount: number, userType: string) => {
    trackEvent({
      name: 'feature_usage',
      parameters: {
        feature_name: featureName,
        usage_count: usageCount,
        user_type: userType
      }
    });
  }, [trackEvent]);

  return {
    trackSignup,
    trackPurchase,
    trackTrialStart,
    trackFeatureUsage
  };
};

export default useAnalytics;