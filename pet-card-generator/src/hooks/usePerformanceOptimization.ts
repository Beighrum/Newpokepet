import { useEffect, useCallback, useState } from 'react';
import { imageOptimizationService } from '@/services/imageOptimizationService';
import { imageCache, apiCache } from '@/services/cacheService';
import { performanceMonitoringService } from '@/services/performanceMonitoringService';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  cacheStats: {
    imageCache: any;
    apiCache: any;
  };
}

interface UsePerformanceOptimizationReturn {
  // Metrics
  metrics: PerformanceMetrics | null;
  isMonitoring: boolean;
  
  // Image optimization
  optimizeImage: (file: File, options?: any) => Promise<any>;
  generateImageVariants: (file: File) => Promise<any[]>;
  
  // Caching
  cacheImage: (key: string, data: any, ttl?: number) => void;
  getCachedImage: (key: string) => any;
  cacheApiResponse: (key: string, data: any, ttl?: number) => void;
  getCachedApiResponse: (key: string) => any;
  
  // Performance monitoring
  startMonitoring: () => void;
  stopMonitoring: () => void;
  recordCustomMetric: (name: string, value: number, tags?: Record<string, string>) => void;
  measureFunction: <T>(name: string, fn: () => T) => T;
  measureAsyncFunction: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  
  // Utilities
  preloadImages: (urls: string[]) => Promise<void>;
  clearCaches: () => void;
  getPerformanceReport: () => any;
}

export const usePerformanceOptimization = (): UsePerformanceOptimizationReturn => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Initialize performance monitoring
  useEffect(() => {
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, []);

  // Update metrics periodically
  useEffect(() => {
    if (!isMonitoring) return;

    const updateMetrics = () => {
      const report = performanceMonitoringService.getPerformanceReport();
      
      const newMetrics: PerformanceMetrics = {
        pageLoadTime: report.pageLoad.loadComplete,
        firstContentfulPaint: report.pageLoad.firstContentfulPaint,
        largestContentfulPaint: report.webVitals.find(v => v.name === 'LCP')?.value || 0,
        cumulativeLayoutShift: report.webVitals.find(v => v.name === 'CLS')?.value || 0,
        memoryUsage: report.memoryUsage ? {
          used: report.memoryUsage.usedJSHeapSize,
          total: report.memoryUsage.totalJSHeapSize,
          limit: report.memoryUsage.jsHeapSizeLimit
        } : undefined,
        cacheStats: {
          imageCache: imageCache.getStats(),
          apiCache: apiCache.getStats()
        }
      };
      
      setMetrics(newMetrics);
    };

    // Update metrics every 10 seconds
    const interval = setInterval(updateMetrics, 10000);
    
    // Initial update
    updateMetrics();
    
    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Start performance monitoring
  const startMonitoring = useCallback(() => {
    performanceMonitoringService.startMonitoring();
    setIsMonitoring(true);
  }, []);

  // Stop performance monitoring
  const stopMonitoring = useCallback(() => {
    performanceMonitoringService.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  // Image optimization functions
  const optimizeImage = useCallback(async (file: File, options?: any) => {
    return performanceMonitoringService.measureAsyncFunction(
      'image-optimization',
      () => imageOptimizationService.optimizeImage(file, options)
    );
  }, []);

  const generateImageVariants = useCallback(async (file: File) => {
    return performanceMonitoringService.measureAsyncFunction(
      'image-variants-generation',
      () => imageOptimizationService.generateImageVariants(file)
    );
  }, []);

  // Caching functions
  const cacheImage = useCallback((key: string, data: any, ttl?: number) => {
    imageCache.set(key, data, ttl);
    performanceMonitoringService.recordMetric('cache-image-set', 1, { key });
  }, []);

  const getCachedImage = useCallback((key: string) => {
    const result = imageCache.get(key);
    performanceMonitoringService.recordMetric(
      result ? 'cache-image-hit' : 'cache-image-miss', 
      1, 
      { key }
    );
    return result;
  }, []);

  const cacheApiResponse = useCallback((key: string, data: any, ttl?: number) => {
    apiCache.set(key, data, ttl);
    performanceMonitoringService.recordMetric('cache-api-set', 1, { key });
  }, []);

  const getCachedApiResponse = useCallback((key: string) => {
    const result = apiCache.get(key);
    performanceMonitoringService.recordMetric(
      result ? 'cache-api-hit' : 'cache-api-miss', 
      1, 
      { key }
    );
    return result;
  }, []);

  // Performance monitoring functions
  const recordCustomMetric = useCallback((name: string, value: number, tags?: Record<string, string>) => {
    performanceMonitoringService.recordMetric(name, value, tags);
  }, []);

  const measureFunction = useCallback(<T>(name: string, fn: () => T): T => {
    return performanceMonitoringService.measureFunction(name, fn);
  }, []);

  const measureAsyncFunction = useCallback(<T>(name: string, fn: () => Promise<T>): Promise<T> => {
    return performanceMonitoringService.measureAsyncFunction(name, fn);
  }, []);

  // Utility functions
  const preloadImages = useCallback(async (urls: string[]): Promise<void> => {
    return performanceMonitoringService.measureAsyncFunction(
      'image-preloading',
      async () => {
        const promises = urls.map(url => {
          return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to preload ${url}`));
            img.src = url;
          });
        });

        try {
          await Promise.all(promises);
          performanceMonitoringService.recordMetric('images-preloaded', urls.length);
        } catch (error) {
          console.error('Image preloading failed:', error);
          performanceMonitoringService.recordMetric('image-preload-errors', 1);
        }
      }
    );
  }, []);

  const clearCaches = useCallback(() => {
    imageCache.clear();
    apiCache.clear();
    performanceMonitoringService.recordMetric('caches-cleared', 1);
  }, []);

  const getPerformanceReport = useCallback(() => {
    return performanceMonitoringService.getPerformanceReport();
  }, []);

  return {
    // Metrics
    metrics,
    isMonitoring,
    
    // Image optimization
    optimizeImage,
    generateImageVariants,
    
    // Caching
    cacheImage,
    getCachedImage,
    cacheApiResponse,
    getCachedApiResponse,
    
    // Performance monitoring
    startMonitoring,
    stopMonitoring,
    recordCustomMetric,
    measureFunction,
    measureAsyncFunction,
    
    // Utilities
    preloadImages,
    clearCaches,
    getPerformanceReport
  };
};