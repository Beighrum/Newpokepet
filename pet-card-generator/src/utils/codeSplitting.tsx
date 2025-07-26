import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

// Generic loading component
const DefaultLoadingComponent: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="space-y-4 w-full max-w-md">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <SkeletonCard />
    </div>
  </div>
);

// Page loading component
const PageLoadingComponent: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Component loading wrapper
interface LoadingWrapperProps {
  fallback?: React.ComponentType;
  children: React.ReactNode;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ 
  fallback: FallbackComponent = DefaultLoadingComponent, 
  children 
}) => (
  <Suspense fallback={<FallbackComponent />}>
    {children}
  </Suspense>
);

// Higher-order component for lazy loading
function withLazyLoading<P extends object>(
  Component: LazyExoticComponent<ComponentType<P>>,
  LoadingComponent: React.ComponentType = DefaultLoadingComponent
) {
  return (props: P) => (
    <Suspense fallback={<LoadingComponent />}>
      <Component {...props} />
    </Suspense>
  );
}

// Lazy load pages with custom loading states
export const lazyLoadPage = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  LoadingComponent: React.ComponentType = PageLoadingComponent
) => {
  const LazyComponent = React.lazy(importFn);
  return withLazyLoading(LazyComponent, LoadingComponent);
};

// Lazy load components with custom loading states
export const lazyLoadComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  LoadingComponent: React.ComponentType = DefaultLoadingComponent
) => {
  const LazyComponent = React.lazy(importFn);
  return withLazyLoading(LazyComponent, LoadingComponent);
};

// Preload component for better UX
export const preloadComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  // Start loading the component
  importFn();
};

// Route-based code splitting helper
export const createLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  preload = false
) => {
  if (preload) {
    // Preload after a short delay
    setTimeout(() => preloadComponent(importFn), 100);
  }
  
  return lazyLoadPage(importFn);
};

// Bundle analyzer helper (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    // Log bundle information
    console.group('Bundle Analysis');
    
    // Check for large chunks
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    scripts.forEach(script => {
      const src = (script as HTMLScriptElement).src;
      if (src.includes('chunk')) {
        console.log('Chunk found:', src);
      }
    });
    
    // Check for CSS files
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    stylesheets.forEach(link => {
      const href = (link as HTMLLinkElement).href;
      console.log('Stylesheet:', href);
    });
    
    console.groupEnd();
  }
};

// Performance-aware component loader
export class ComponentLoader {
  private static loadedComponents = new Set<string>();
  private static loadingComponents = new Map<string, Promise<any>>();

  static async loadComponent(
    name: string,
    importFn: () => Promise<{ default: ComponentType<any> }>
  ): Promise<ComponentType<any>> {
    // Return immediately if already loaded
    if (this.loadedComponents.has(name)) {
      return (await importFn()).default;
    }

    // Return existing promise if currently loading
    if (this.loadingComponents.has(name)) {
      return this.loadingComponents.get(name)!;
    }

    // Start loading
    const loadPromise = importFn().then(module => {
      this.loadedComponents.add(name);
      this.loadingComponents.delete(name);
      return module.default;
    }).catch(error => {
      this.loadingComponents.delete(name);
      throw error;
    });

    this.loadingComponents.set(name, loadPromise);
    return loadPromise;
  }

  static preloadComponents(components: Array<{
    name: string;
    importFn: () => Promise<{ default: ComponentType<any> }>;
  }>) {
    // Preload components with requestIdleCallback if available
    const preload = () => {
      components.forEach(({ name, importFn }) => {
        if (!this.loadedComponents.has(name) && !this.loadingComponents.has(name)) {
          this.loadComponent(name, importFn).catch(console.error);
        }
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload);
    } else {
      setTimeout(preload, 100);
    }
  }

  static getLoadedComponents(): string[] {
    return Array.from(this.loadedComponents);
  }

  static clearCache(): void {
    this.loadedComponents.clear();
    this.loadingComponents.clear();
  }
}

// Lazy loading hook
export const useLazyComponent = (
  name: string,
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  const [Component, setComponent] = React.useState<ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    ComponentLoader.loadComponent(name, importFn)
      .then(comp => {
        setComponent(() => comp);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [name, importFn]);

  return { Component, loading, error };
};

export {
  LoadingWrapper,
  withLazyLoading,
  DefaultLoadingComponent,
  PageLoadingComponent
};