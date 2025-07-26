interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
  cached: boolean;
}

interface PerformanceReport {
  pageLoad: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
  };
  webVitals: WebVitalsMetric[];
  resources: ResourceTiming[];
  userTiming: PerformanceMetric[];
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  customMetrics: PerformanceMetric[];
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private webVitals: WebVitalsMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  constructor() {
    this.initializeWebVitals();
    this.setupPerformanceObservers();
  }

  // Start performance monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.collectInitialMetrics();
    
    // Monitor navigation timing
    if ('navigation' in performance) {
      this.monitorNavigationTiming();
    }

    // Monitor resource timing
    this.monitorResourceTiming();

    // Monitor long tasks
    this.monitorLongTasks();

    console.log('Performance monitoring started');
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    console.log('Performance monitoring stopped');
  }

  // Record custom metric
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Also add to performance timeline
    if ('mark' in performance) {
      performance.mark(`custom-${name}-${value}`);
    }
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const duration = performance.now() - startTime;
    
    this.recordMetric(`function-${name}`, duration, { type: 'execution-time' });
    
    return result;
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    
    this.recordMetric(`async-function-${name}`, duration, { type: 'execution-time' });
    
    return result;
  }

  // Start timing measurement
  startTiming(name: string): void {
    if ('mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  // End timing measurement
  endTiming(name: string): number {
    if ('mark' in performance && 'measure' in performance) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        this.recordMetric(name, measure.duration, { type: 'timing' });
        return measure.duration;
      }
    }
    
    return 0;
  }

  // Get performance report
  getPerformanceReport(): PerformanceReport {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const userTiming = performance.getEntriesByType('measure') as PerformanceMeasure[];

    const report: PerformanceReport = {
      pageLoad: {
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart || 0,
        loadComplete: navigation?.loadEventEnd - navigation?.navigationStart || 0,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint()
      },
      webVitals: [...this.webVitals],
      resources: resources.map(resource => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize || 0,
        type: this.getResourceType(resource.name),
        cached: resource.transferSize === 0 && resource.decodedBodySize > 0
      })),
      userTiming: userTiming.map(measure => ({
        name: measure.name,
        value: measure.duration,
        timestamp: measure.startTime,
        tags: { type: 'user-timing' }
      })),
      customMetrics: [...this.metrics]
    };

    // Add memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      report.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    return report;
  }

  // Get metrics by name pattern
  getMetricsByPattern(pattern: RegExp): PerformanceMetric[] {
    return this.metrics.filter(metric => pattern.test(metric.name));
  }

  // Get average metric value
  getAverageMetric(name: string): number {
    const matchingMetrics = this.metrics.filter(metric => metric.name === name);
    if (matchingMetrics.length === 0) return 0;
    
    const sum = matchingMetrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / matchingMetrics.length;
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = [];
    this.webVitals = [];
    
    if ('clearMarks' in performance) {
      performance.clearMarks();
    }
    
    if ('clearMeasures' in performance) {
      performance.clearMeasures();
    }
  }

  // Initialize Web Vitals monitoring
  private initializeWebVitals(): void {
    // Import and setup web-vitals if available
    if (typeof window !== 'undefined') {
      this.setupWebVitalsCollection();
    }
  }

  // Setup Web Vitals collection
  private setupWebVitalsCollection(): void {
    // CLS (Cumulative Layout Shift)
    this.observeLayoutShift();
    
    // FID (First Input Delay)
    this.observeFirstInputDelay();
    
    // LCP (Largest Contentful Paint)
    this.observeLargestContentfulPaint();
  }

  // Observe layout shift
  private observeLayoutShift(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          let clsValue = 0;
          
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          
          if (clsValue > 0) {
            this.recordWebVital('CLS', clsValue);
          }
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Layout shift observation not supported');
      }
    }
  }

  // Observe first input delay
  private observeFirstInputDelay(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidValue = (entry as any).processingStart - entry.startTime;
            this.recordWebVital('FID', fidValue);
          }
        });
        
        observer.observe({ entryTypes: ['first-input'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('First input delay observation not supported');
      }
    }
  }

  // Observe largest contentful paint
  private observeLargestContentfulPaint(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordWebVital('LCP', lastEntry.startTime);
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Largest contentful paint observation not supported');
      }
    }
  }

  // Record Web Vital metric
  private recordWebVital(name: WebVitalsMetric['name'], value: number): void {
    const rating = this.getRating(name, value);
    
    const metric: WebVitalsMetric = {
      name,
      value,
      rating,
      timestamp: Date.now()
    };
    
    this.webVitals.push(metric);
  }

  // Get rating for Web Vital
  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 }
    };
    
    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  // Setup performance observers
  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) return;

    // Observe paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, entry.startTime, { type: 'paint' });
        }
      });
      
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (e) {
      console.warn('Paint timing observation not supported');
    }
  }

  // Monitor navigation timing
  private monitorNavigationTiming(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.recordMetric('dns-lookup', navigation.domainLookupEnd - navigation.domainLookupStart);
        this.recordMetric('tcp-connection', navigation.connectEnd - navigation.connectStart);
        this.recordMetric('request-response', navigation.responseEnd - navigation.requestStart);
        this.recordMetric('dom-processing', navigation.domContentLoadedEventEnd - navigation.responseEnd);
      }
    });
  }

  // Monitor resource timing
  private monitorResourceTiming(): void {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resource = entry as PerformanceResourceTiming;
            this.recordMetric(
              `resource-${this.getResourceType(resource.name)}`,
              resource.duration,
              {
                name: resource.name,
                size: resource.transferSize?.toString() || '0',
                cached: (resource.transferSize === 0 && resource.decodedBodySize > 0).toString()
              }
            );
          }
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource timing observation not supported');
      }
    }
  }

  // Monitor long tasks
  private monitorLongTasks(): void {
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('long-task', entry.duration, { type: 'performance-issue' });
          }
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        console.warn('Long task observation not supported');
      }
    }
  }

  // Collect initial metrics
  private collectInitialMetrics(): void {
    // Record initial page load metrics
    if (document.readyState === 'complete') {
      this.recordPageLoadMetrics();
    } else {
      window.addEventListener('load', () => this.recordPageLoadMetrics());
    }
  }

  // Record page load metrics
  private recordPageLoadMetrics(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.recordMetric('page-load-time', navigation.loadEventEnd - navigation.navigationStart);
      this.recordMetric('dom-content-loaded', navigation.domContentLoadedEventEnd - navigation.navigationStart);
    }
  }

  // Get first paint timing
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint?.startTime || 0;
  }

  // Get first contentful paint timing
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint?.startTime || 0;
  }

  // Get resource type from URL
  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.css$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.match(/\.(mp4|webm|ogg)$/)) return 'video';
    if (url.match(/\.(mp3|wav|ogg)$/)) return 'audio';
    return 'other';
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
export default performanceMonitoringService;