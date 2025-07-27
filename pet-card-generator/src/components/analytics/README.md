# Analytics and Monitoring System

This directory contains the comprehensive analytics and monitoring system for the Pet Card Generator application.

## Overview

The analytics system provides:
- **Google Analytics integration** for user behavior tracking
- **Custom event tracking** for card generation and user actions
- **Performance monitoring** with real-time metrics
- **A/B testing framework** for feature optimization
- **Business intelligence dashboard** for insights
- **Real-time monitoring** of system health

## Components

### Core Services

#### `analyticsService.ts`
Main analytics service that handles:
- Event tracking (page views, user interactions, conversions)
- Google Analytics integration
- Custom analytics endpoint communication
- Performance metrics collection
- Error tracking
- User property management

#### `abTestingService.ts`
A/B testing framework that provides:
- Deterministic user assignment to test variants
- Exposure and conversion tracking
- Test configuration management
- Results collection and analysis
- Local storage persistence

### React Components

#### `AnalyticsDashboard.tsx`
Main dashboard component that combines all analytics views:
- Overview tab with key metrics
- Business intelligence insights
- Performance monitoring
- A/B testing management

#### `BusinessIntelligenceDashboard.tsx`
Business-focused analytics dashboard featuring:
- User engagement trends
- Conversion funnel analysis
- Device breakdown
- Top pages performance
- Revenue and subscription metrics

#### `PerformanceMonitoringDashboard.tsx`
Technical performance monitoring dashboard with:
- Real-time system metrics
- Core Web Vitals tracking
- Service health monitoring
- Error tracking and alerting
- Resource usage monitoring

#### `ABTestingDashboard.tsx`
A/B testing management interface providing:
- Active test overview
- Variant performance comparison
- Statistical significance analysis
- Test creation and management

#### `AnalyticsProvider.tsx`
React context provider that:
- Initializes analytics services
- Sets up global error tracking
- Manages user identification
- Handles session tracking

### React Hooks

#### `useAnalytics.ts`
Comprehensive hooks for analytics integration:
- `useAnalytics()` - Main analytics hook
- `useInteractionTracking()` - User interaction tracking
- `usePerformanceTracking()` - Performance metrics
- `useBusinessMetrics()` - Business event tracking

## Usage

### Basic Setup

1. **Wrap your app with AnalyticsProvider:**
```tsx
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';

function App() {
  return (
    <AnalyticsProvider>
      <YourAppContent />
    </AnalyticsProvider>
  );
}
```

2. **Use analytics hooks in components:**
```tsx
import { useAnalytics, useInteractionTracking } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackEvent, trackConversion } = useAnalytics();
  const { trackClick } = useInteractionTracking();

  const handleButtonClick = () => {
    trackClick('cta_button', 'button', { page: 'landing' });
    trackConversion({
      eventName: 'signup_intent',
      value: 1
    });
  };

  return <button onClick={handleButtonClick}>Sign Up</button>;
}
```

### Event Tracking

#### Standard Events
```tsx
// Page view (automatic with useAnalytics)
trackEvent({
  name: 'page_view',
  parameters: {
    page_path: '/upload',
    page_title: 'Upload Pet Photo'
  }
});

// User interaction
trackEvent({
  name: 'button_click',
  parameters: {
    button_id: 'generate_card',
    button_text: 'Generate Card'
  }
});

// Card generation
trackCardGeneration({
  cardId: 'card_123',
  petType: 'dog',
  rarity: 'rare',
  generationTime: 2500,
  success: true
});
```

#### Conversion Tracking
```tsx
// Purchase conversion
trackConversion({
  eventName: 'purchase',
  value: 29.99,
  currency: 'USD',
  items: [{
    itemId: 'premium_plan',
    itemName: 'Premium Plan',
    category: 'subscription',
    quantity: 1,
    price: 29.99
  }]
});

// Signup conversion
trackConversion({
  eventName: 'signup',
  value: 1
});
```

### A/B Testing

#### Getting Test Variants
```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function HeroSection() {
  const { getABTestVariant, getABTestConfig, trackABTestConversion } = useAnalytics();
  
  const ctaConfig = getABTestConfig('hero_cta_test');
  const buttonText = ctaConfig.buttonText || 'Get Started';
  
  const handleCTAClick = () => {
    trackABTestConversion('hero_cta_test', 'cta_click');
    // Handle click...
  };

  return (
    <button onClick={handleCTAClick}>
      {buttonText}
    </button>
  );
}
```

#### Creating Tests
```tsx
import abTestingService from '@/services/abTestingService';

// Create a new A/B test
abTestingService.createTest({
  id: 'pricing_page_test',
  name: 'Pricing Page Layout Test',
  description: 'Test different pricing page layouts',
  variants: [
    {
      id: 'control',
      name: 'Current Layout',
      weight: 50,
      config: { layout: 'current' },
      isControl: true
    },
    {
      id: 'variant_a',
      name: 'New Layout',
      weight: 50,
      config: { layout: 'new' }
    }
  ],
  metrics: {
    primary: 'subscription_conversion',
    secondary: ['page_time', 'scroll_depth']
  }
});

// Start the test
abTestingService.startTest('pricing_page_test');
```

### Performance Monitoring

#### Tracking Performance Metrics
```tsx
import { usePerformanceTracking } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackPageLoad, trackAPICall } = usePerformanceTracking();

  useEffect(() => {
    const startTime = performance.now();
    
    // Simulate page load
    setTimeout(() => {
      const loadTime = performance.now() - startTime;
      trackPageLoad('upload_page', loadTime);
    }, 100);
  }, []);

  const handleAPICall = async () => {
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/generate');
      const endTime = performance.now();
      
      trackAPICall('/api/generate', 'POST', endTime - startTime, response.ok, response.status);
    } catch (error) {
      const endTime = performance.now();
      trackAPICall('/api/generate', 'POST', endTime - startTime, false);
    }
  };
}
```

## Configuration

### Environment Variables

```env
# Google Analytics
REACT_APP_GA_MEASUREMENT_ID=GA_MEASUREMENT_ID

# Custom Analytics Endpoint
REACT_APP_ANALYTICS_ENDPOINT=https://api.yourapp.com/analytics

# A/B Testing Endpoint
REACT_APP_AB_TESTING_ENDPOINT=https://api.yourapp.com/ab-testing
```

### Google Analytics Setup

1. Create a Google Analytics 4 property
2. Get your Measurement ID
3. Set the `REACT_APP_GA_MEASUREMENT_ID` environment variable
4. The analytics service will automatically initialize GA

### Custom Analytics Backend

If you want to send events to your own analytics backend:

1. Set up an endpoint that accepts POST requests with event data
2. Configure `REACT_APP_ANALYTICS_ENDPOINT`
3. Events will be sent to both Google Analytics and your custom endpoint

## Dashboard Access

The analytics dashboard can be accessed at `/analytics` (you'll need to add this route to your router):

```tsx
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

// In your router
<Route path="/analytics" element={<AnalyticsDashboard />} />
```

## Testing

The analytics system includes comprehensive tests:

```bash
# Run analytics tests
npm test src/services/__tests__/analyticsService.test.ts
npm test src/services/__tests__/abTestingService.test.ts
```

## Best Practices

1. **Event Naming**: Use consistent, descriptive event names
2. **Parameter Structure**: Keep event parameters consistent across similar events
3. **Privacy**: Ensure no PII is sent in analytics events
4. **Performance**: Batch events when possible to reduce network requests
5. **Testing**: Always test A/B tests with small traffic before full rollout
6. **Monitoring**: Set up alerts for critical metrics and errors

## Troubleshooting

### Common Issues

1. **Events not appearing in GA**: Check that `REACT_APP_GA_MEASUREMENT_ID` is set correctly
2. **A/B tests not working**: Ensure user is set with `setUser()` before accessing variants
3. **Performance metrics missing**: Check that performance observers are supported in the browser
4. **Dashboard not loading**: Verify all required dependencies are installed

### Debug Mode

In development, the analytics service runs in debug mode and logs all events to the console. Check the browser console for detailed analytics information.

## Security Considerations

- All analytics data is anonymized
- No sensitive user information is tracked
- GDPR compliance through anonymized IP addresses
- Secure transmission of all analytics data
- User consent handling (implement based on your privacy policy)

## Future Enhancements

- Real-time dashboard updates via WebSocket
- Advanced segmentation and cohort analysis
- Machine learning insights and predictions
- Custom alert system for business metrics
- Integration with additional analytics providers