import React, { useEffect, createContext, useContext } from 'react';
import analyticsService from '@/services/analyticsService';
import abTestingService from '@/services/abTestingService';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsContextType {
  analyticsService: typeof analyticsService;
  abTestingService: typeof abTestingService;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize analytics when user changes
    if (user) {
      analyticsService.setUser(user.uid, {
        userType: user.subscription?.tier || 'free',
        registrationDate: user.metadata?.creationTime,
        lastActiveDate: new Date().toISOString(),
        deviceType: getDeviceType(),
        browserType: getBrowserType()
      });
      
      abTestingService.setUser(user.uid);
    }
  }, [user]);

  useEffect(() => {
    // Set up global error tracking
    const handleError = (event: ErrorEvent) => {
      analyticsService.trackError({
        message: event.message,
        stack: event.error?.stack,
        source: event.filename || 'unknown',
        userId: user?.uid,
        fatal: false
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analyticsService.trackError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        source: 'promise',
        userId: user?.uid,
        fatal: false
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [user]);

  useEffect(() => {
    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        analyticsService.trackEvent({
          name: 'page_hidden',
          parameters: {
            page_path: window.location.pathname
          }
        });
      } else {
        analyticsService.trackEvent({
          name: 'page_visible',
          parameters: {
            page_path: window.location.pathname
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Track session duration
    const sessionStart = Date.now();

    const trackSessionDuration = () => {
      const sessionDuration = Date.now() - sessionStart;
      analyticsService.trackEvent({
        name: 'session_duration',
        parameters: {
          duration: sessionDuration,
          duration_minutes: Math.floor(sessionDuration / 60000)
        }
      });
    };

    // Track session duration on page unload
    window.addEventListener('beforeunload', trackSessionDuration);

    return () => {
      window.removeEventListener('beforeunload', trackSessionDuration);
      trackSessionDuration(); // Track when component unmounts
    };
  }, []);

  const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  };

  const getBrowserType = (): string => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  const contextValue: AnalyticsContextType = {
    analyticsService,
    abTestingService
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsProvider;