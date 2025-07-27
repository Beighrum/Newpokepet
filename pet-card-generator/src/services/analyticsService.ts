interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: number;
  category: 'user' | 'system' | 'business' | 'performance';
}

interface UserMetrics {
  userId: string;
  activationDate?: number;
  lastActiveDate: number;
  totalSessions: number;
  totalCardGenerations: number;
  totalVideoGenerations: number;
  subscriptionTier: 'free' | 'pro' | 'premium';
  lifetimeValue: number;
  retentionDays: number[];
}

interface BusinessMetrics {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  cardGeneration: {
    total: number;
    successRate: number;
    averageTime: number;
    byRarity: Record<string, number>;
  };
  videoGeneration: {
    total: number;
    successRate: number;
    averageTime: number;
  };
  conversion: {
    signupRate: number;
    activationRate: number;
    premiumConversionRate: number;
  };
  revenue: {
    total: number;
    monthly: number;
    averageRevenuePerUser: number;
  };
}

interface SystemMetrics {
  apiCosts: {
    total: number;
    byService: Record<string, number>;
    trend: Array<{ date: string; cost: number }>;
  };
  performance: {
    averageLoadTime: number;
    errorRate: number;
    uptime: number;
  };
  usage: {
    totalRequests: number;
    peakConcurrency: number;
    bandwidthUsage: number;
  };
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeAnalytics();
  }

  private initializeAnalytics(): void {
    // Initialize Google Analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.GOOGLE_ANALYTICS_ID || '', {
        custom_map: { custom_dimension_1: 'user_tier' }
      });
    }

    // Initialize other analytics providers
    this.initializeMixpanel();
    this.initializeAmplitude();
    
    // Track page views automatically
    this.setupPageViewTracking();
    
    // Track user interactions
    this.setupInteractionTracking();
  }

  // Set user context
  setUser(userId: string, properties?: Record<string, any>): void {
    this.userId = userId;
    
    // Update Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.GOOGLE_ANALYTICS_ID || '', {
        user_id: userId,
        custom_map: { custom_dimension_1: properties?.tier || 'free' }
      });
    }

    // Update Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.identify(userId);
      (window as any).mixpanel.people.set(properties || {});
    }

    // Update Amplitude
    if (typeof window !== 'undefined' && (window as any).amplitude) {
      (window as any).amplitude.getInstance().setUserId(userId);
      (window as any).amplitude.getInstance().setUserProperties(properties || {});
    }

    this.track('user_identified', properties);
  }

  // Track events
  track(eventName: string, properties?: Record<string, any>, category: AnalyticsEvent['category'] = 'user'): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      category
    };

    // Store locally
    this.events.push(event);
    this.persistEvents();

    // Send to external services
    this.sendToGoogleAnalytics(event);
    this.sendToMixpanel(event);
    this.sendToAmplitude(event);
    this.sendToCustomEndpoint(event);

    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }
  }

  // Track page views
  trackPageView(page: string, properties?: Record<string, any>): void {
    this.track('page_view', {
      page,
      url: window.location.href,
      referrer: document.referrer,
      ...properties
    });
  }

  // Track user activation milestones
  trackActivation(milestone: string, properties?: Record<string, any>): void {
    this.track('activation_milestone', {
      milestone,
      ...properties
    }, 'business');
  }

  // Track card generation events
  trackCardGeneration(success: boolean, properties?: Record<string, any>): void {
    this.track('card_generation', {
      success,
      ...properties
    }, 'business');
  }

  // Track video generation events
  trackVideoGeneration(success: boolean, properties?: Record<string, any>): void {
    this.track('video_generation', {
      success,
      ...properties
    }, 'business');
  }

  // Track subscription events
  trackSubscription(action: 'upgrade' | 'downgrade' | 'cancel', properties?: Record<string, any>): void {
    this.track('subscription_change', {
      action,
      ...properties
    }, 'business');
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
    this.track('performance_metric', {
      metric,
      value,
      ...properties
    }, 'performance');
  }

  // Track API costs
  trackApiCost(service: string, cost: number, properties?: Record<string, any>): void {
    this.track('api_cost', {
      service,
      cost,
      ...properties
    }, 'system');
  }

  // Track errors
  trackError(error: Error, context?: Record<string, any>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      ...context
    }, 'system');
  }

  // Get user metrics
  async getUserMetrics(userId: string): Promise<UserMetrics | null> {
    try {
      const response = await fetch(`/api/analytics/users/${userId}/metrics`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch user metrics:', error);
    }
    return null;
  }

  // Get business metrics
  async getBusinessMetrics(timeRange?: { start: number; end: number }): Promise<BusinessMetrics | null> {
    try {
      const params = new URLSearchParams();
      if (timeRange) {
        params.append('start', timeRange.start.toString());
        params.append('end', timeRange.end.toString());
      }
      
      const response = await fetch(`/api/analytics/business?${params}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch business metrics:', error);
    }
    return null;
  }

  // Get system metrics
  async getSystemMetrics(): Promise<SystemMetrics | null> {
    try {
      const response = await fetch('/api/analytics/system');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    }
    return null;
  }

  // Get events for analysis
  getEvents(filter?: {
    category?: AnalyticsEvent['category'];
    userId?: string;
    timeRange?: { start: number; end: number };
  }): AnalyticsEvent[] {
    let filteredEvents = [...this.events];

    if (filter?.category) {
      filteredEvents = filteredEvents.filter(event => event.category === filter.category);
    }

    if (filter?.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === filter.userId);
    }

    if (filter?.timeRange) {
      filteredEvents = filteredEvents.filter(event => 
        event.timestamp >= filter.timeRange!.start && 
        event.timestamp <= filter.timeRange!.end
      );
    }

    return filteredEvents;
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.track('analytics_enabled');
    } else {
      this.track('analytics_disabled');
    }
  }

  // Clear stored events
  clearEvents(): void {
    this.events = [];
    localStorage.removeItem('analytics_events');
  }

  // Export events for analysis
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  // Private methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private persistEvents(): void {
    try {
      // Keep only last 1000 events in localStorage
      const eventsToStore = this.events.slice(-1000);
      localStorage.setItem('analytics_events', JSON.stringify(eventsToStore));
    } catch (error) {
      console.warn('Failed to persist analytics events:', error);
    }
  }

  private loadPersistedEvents(): void {
    try {
      const stored = localStorage.getItem('analytics_events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load persisted analytics events:', error);
    }
  }

  private sendToGoogleAnalytics(event: AnalyticsEvent): void {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.name, {
        event_category: event.category,
        event_label: event.properties?.label,
        value: event.properties?.value,
        user_id: event.userId,
        session_id: event.sessionId,
        custom_parameters: event.properties
      });
    }
  }

  private sendToMixpanel(event: AnalyticsEvent): void {
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(event.name, {
        ...event.properties,
        category: event.category,
        session_id: event.sessionId,
        timestamp: event.timestamp
      });
    }
  }

  private sendToAmplitude(event: AnalyticsEvent): void {
    if (typeof window !== 'undefined' && (window as any).amplitude) {
      (window as any).amplitude.getInstance().logEvent(event.name, {
        ...event.properties,
        category: event.category,
        session_id: event.sessionId
      });
    }
  }

  private async sendToCustomEndpoint(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.warn('Failed to send event to custom endpoint:', error);
    }
  }

  private initializeMixpanel(): void {
    if (typeof window !== 'undefined' && process.env.MIXPANEL_TOKEN) {
      // Initialize Mixpanel if token is available
      const script = document.createElement('script');
      script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      script.onload = () => {
        (window as any).mixpanel.init(process.env.MIXPANEL_TOKEN);
      };
      document.head.appendChild(script);
    }
  }

  private initializeAmplitude(): void {
    if (typeof window !== 'undefined' && process.env.AMPLITUDE_API_KEY) {
      // Initialize Amplitude if API key is available
      const script = document.createElement('script');
      script.src = 'https://cdn.amplitude.com/libs/amplitude-8.21.9-min.gz.js';
      script.onload = () => {
        (window as any).amplitude.getInstance().init(process.env.AMPLITUDE_API_KEY);
      };
      document.head.appendChild(script);
    }
  }

  private setupPageViewTracking(): void {
    if (typeof window !== 'undefined') {
      // Track initial page view
      this.trackPageView(window.location.pathname);

      // Track navigation changes (for SPAs)
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
          analyticsService.trackPageView(window.location.pathname);
        }, 0);
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(() => {
          analyticsService.trackPageView(window.location.pathname);
        }, 0);
      };

      window.addEventListener('popstate', () => {
        this.trackPageView(window.location.pathname);
      });
    }
  }

  private setupInteractionTracking(): void {
    if (typeof window !== 'undefined') {
      // Track clicks on important elements
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        // Track button clicks
        if (target.tagName === 'BUTTON' || target.closest('button')) {
          const button = target.tagName === 'BUTTON' ? target : target.closest('button');
          const buttonText = button?.textContent?.trim();
          const buttonId = button?.id;
          const dataTestId = button?.getAttribute('data-testid');
          
          this.track('button_click', {
            text: buttonText,
            id: buttonId,
            testId: dataTestId,
            page: window.location.pathname
          });
        }

        // Track link clicks
        if (target.tagName === 'A' || target.closest('a')) {
          const link = target.tagName === 'A' ? target : target.closest('a');
          const href = (link as HTMLAnchorElement)?.href;
          const linkText = link?.textContent?.trim();
          
          this.track('link_click', {
            href,
            text: linkText,
            page: window.location.pathname
          });
        }
      });

      // Track form submissions
      document.addEventListener('submit', (event) => {
        const form = event.target as HTMLFormElement;
        const formId = form.id;
        const formAction = form.action;
        
        this.track('form_submit', {
          id: formId,
          action: formAction,
          page: window.location.pathname
        });
      });
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// React hook for analytics
export const useAnalytics = () => {
  const track = React.useCallback((eventName: string, properties?: Record<string, any>) => {
    analyticsService.track(eventName, properties);
  }, []);

  const trackPageView = React.useCallback((page: string, properties?: Record<string, any>) => {
    analyticsService.trackPageView(page, properties);
  }, []);

  const setUser = React.useCallback((userId: string, properties?: Record<string, any>) => {
    analyticsService.setUser(userId, properties);
  }, []);

  return {
    track,
    trackPageView,
    setUser,
    trackActivation: analyticsService.trackActivation.bind(analyticsService),
    trackCardGeneration: analyticsService.trackCardGeneration.bind(analyticsService),
    trackVideoGeneration: analyticsService.trackVideoGeneration.bind(analyticsService),
    trackSubscription: analyticsService.trackSubscription.bind(analyticsService),
    trackPerformance: analyticsService.trackPerformance.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService)
  };
};

export default analyticsService;