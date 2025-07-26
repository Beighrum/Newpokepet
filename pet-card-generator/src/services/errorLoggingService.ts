interface ErrorLog {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId: string;
  url: string;
  userAgent: string;
  fingerprint?: string;
  tags?: string[];
  breadcrumbs?: Breadcrumb[];
}

interface Breadcrumb {
  timestamp: number;
  message: string;
  category: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, any>;
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByType: Record<string, number>;
  errorsByPage: Record<string, number>;
  recentErrors: ErrorLog[];
  topErrors: Array<{
    fingerprint: string;
    count: number;
    lastSeen: number;
    message: string;
  }>;
}

interface MonitoringConfig {
  maxBreadcrumbs?: number;
  maxStoredErrors?: number;
  enableConsoleCapture?: boolean;
  enableUnhandledRejection?: boolean;
  enableWindowError?: boolean;
  sampleRate?: number;
  beforeSend?: (errorLog: ErrorLog) => ErrorLog | null;
  integrations?: {
    sentry?: boolean;
    customEndpoint?: string;
  };
}

class ErrorLoggingService {
  private errors: ErrorLog[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private sessionId: string;
  private config: Required<Omit<MonitoringConfig, 'beforeSend' | 'integrations'>> & Pick<MonitoringConfig, 'beforeSend' | 'integrations'>;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;

  constructor(config: MonitoringConfig = {}) {
    this.sessionId = this.generateSessionId();
    this.config = {
      maxBreadcrumbs: 50,
      maxStoredErrors: 100,
      enableConsoleCapture: true,
      enableUnhandledRejection: true,
      enableWindowError: true,
      sampleRate: 1.0,
      ...config
    };

    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;

    this.initialize();
  }

  private initialize(): void {
    // Capture unhandled errors
    if (this.config.enableWindowError) {
      window.addEventListener('error', this.handleWindowError);
    }

    // Capture unhandled promise rejections
    if (this.config.enableUnhandledRejection) {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }

    // Capture console errors
    if (this.config.enableConsoleCapture) {
      this.setupConsoleCapture();
    }

    // Add navigation breadcrumb
    this.addBreadcrumb('Navigation', 'navigation', 'info', {
      url: window.location.href
    });
  }

  // Log an error
  logError(
    error: Error | string,
    context?: Record<string, any>,
    level: ErrorLog['level'] = 'error',
    tags?: string[]
  ): string {
    // Apply sampling
    if (Math.random() > this.config.sampleRate) {
      return '';
    }

    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      fingerprint: this.generateFingerprint(error),
      tags,
      breadcrumbs: [...this.breadcrumbs]
    };

    // Apply beforeSend filter
    const processedLog = this.config.beforeSend ? this.config.beforeSend(errorLog) : errorLog;
    if (!processedLog) {
      return '';
    }

    // Store error
    this.storeError(processedLog);

    // Send to external services
    this.sendToExternalServices(processedLog);

    // Add breadcrumb for this error
    this.addBreadcrumb(
      `Error: ${processedLog.message}`,
      'error',
      level,
      { errorId: processedLog.id }
    );

    return processedLog.id;
  }

  // Add breadcrumb
  addBreadcrumb(
    message: string,
    category: string,
    level: Breadcrumb['level'] = 'info',
    data?: Record<string, any>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      message,
      category,
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  // Get error metrics
  getMetrics(): ErrorMetrics {
    const now = Date.now();
    const recentErrors = this.errors.filter(error => now - error.timestamp < 24 * 60 * 60 * 1000);

    const errorsByLevel = this.errors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByType = this.errors.reduce((acc, error) => {
      const type = this.getErrorType(error.message);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByPage = this.errors.reduce((acc, error) => {
      const page = new URL(error.url).pathname;
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by fingerprint to find top errors
    const fingerprintGroups = this.errors.reduce((acc, error) => {
      if (!error.fingerprint) return acc;
      
      if (!acc[error.fingerprint]) {
        acc[error.fingerprint] = {
          fingerprint: error.fingerprint,
          count: 0,
          lastSeen: 0,
          message: error.message
        };
      }
      
      acc[error.fingerprint].count++;
      acc[error.fingerprint].lastSeen = Math.max(acc[error.fingerprint].lastSeen, error.timestamp);
      
      return acc;
    }, {} as Record<string, any>);

    const topErrors = Object.values(fingerprintGroups)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: this.errors.length,
      errorsByLevel,
      errorsByType,
      errorsByPage,
      recentErrors: recentErrors.slice(-20),
      topErrors
    };
  }

  // Get all errors
  getErrors(limit?: number): ErrorLog[] {
    const errors = [...this.errors].reverse(); // Most recent first
    return limit ? errors.slice(0, limit) : errors;
  }

  // Get errors by filter
  getErrorsBy(filter: {
    level?: ErrorLog['level'];
    userId?: string;
    timeRange?: { start: number; end: number };
    tags?: string[];
    fingerprint?: string;
  }): ErrorLog[] {
    return this.errors.filter(error => {
      if (filter.level && error.level !== filter.level) return false;
      if (filter.userId && error.userId !== filter.userId) return false;
      if (filter.timeRange) {
        if (error.timestamp < filter.timeRange.start || error.timestamp > filter.timeRange.end) {
          return false;
        }
      }
      if (filter.tags && !filter.tags.some(tag => error.tags?.includes(tag))) return false;
      if (filter.fingerprint && error.fingerprint !== filter.fingerprint) return false;
      
      return true;
    });
  }

  // Clear errors
  clearErrors(): void {
    this.errors = [];
    this.breadcrumbs = [];
  }

  // Export errors for debugging
  exportErrors(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      timestamp: Date.now(),
      errors: this.errors,
      breadcrumbs: this.breadcrumbs,
      metrics: this.getMetrics()
    }, null, 2);
  }

  // Set user context
  setUser(userId: string, userData?: Record<string, any>): void {
    this.addBreadcrumb(
      `User identified: ${userId}`,
      'user',
      'info',
      userData
    );
  }

  // Set custom context
  setContext(key: string, value: any): void {
    this.addBreadcrumb(
      `Context set: ${key}`,
      'context',
      'debug',
      { [key]: value }
    );
  }

  // Destroy service
  destroy(): void {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    if (this.config.enableConsoleCapture) {
      console.error = this.originalConsoleError;
      console.warn = this.originalConsoleWarn;
    }
  }

  // Handle window errors
  private handleWindowError = (event: ErrorEvent): void => {
    this.logError(
      event.error || new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      },
      'error',
      ['unhandled', 'window-error']
    );
  };

  // Handle unhandled promise rejections
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    this.logError(
      error,
      { type: 'unhandled-promise-rejection' },
      'error',
      ['unhandled', 'promise-rejection']
    );
  };

  // Setup console capture
  private setupConsoleCapture(): void {
    console.error = (...args) => {
      this.originalConsoleError.apply(console, args);
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      this.logError(
        new Error(message),
        { consoleArgs: args },
        'error',
        ['console']
      );
    };

    console.warn = (...args) => {
      this.originalConsoleWarn.apply(console, args);
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      this.logError(
        message,
        { consoleArgs: args },
        'warning',
        ['console']
      );
    };
  }

  // Store error locally
  private storeError(errorLog: ErrorLog): void {
    this.errors.push(errorLog);

    // Limit stored errors
    if (this.errors.length > this.config.maxStoredErrors) {
      this.errors = this.errors.slice(-this.config.maxStoredErrors);
    }

    // Store in localStorage for persistence
    try {
      const recentErrors = this.errors.slice(-20); // Store only recent errors
      localStorage.setItem('errorLogs', JSON.stringify(recentErrors));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // Send to external monitoring services
  private sendToExternalServices(errorLog: ErrorLog): void {
    // Send to Sentry
    if (this.config.integrations?.sentry && (window as any).Sentry) {
      (window as any).Sentry.withScope((scope: any) => {
        scope.setTag('errorId', errorLog.id);
        scope.setTag('sessionId', errorLog.sessionId);
        scope.setLevel(errorLog.level);
        
        if (errorLog.userId) {
          scope.setUser({ id: errorLog.userId });
        }
        
        if (errorLog.context) {
          scope.setContext('custom', errorLog.context);
        }
        
        if (errorLog.tags) {
          errorLog.tags.forEach(tag => scope.setTag(tag, true));
        }
        
        // Add breadcrumbs
        errorLog.breadcrumbs?.forEach(breadcrumb => {
          scope.addBreadcrumb({
            message: breadcrumb.message,
            category: breadcrumb.category,
            level: breadcrumb.level,
            data: breadcrumb.data,
            timestamp: breadcrumb.timestamp / 1000
          });
        });
        
        const error = new Error(errorLog.message);
        if (errorLog.stack) {
          error.stack = errorLog.stack;
        }
        
        (window as any).Sentry.captureException(error);
      });
    }

    // Send to custom endpoint
    if (this.config.integrations?.customEndpoint) {
      fetch(this.config.integrations.customEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorLog)
      }).catch(err => {
        console.warn('Failed to send error to custom endpoint:', err);
      });
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Generate error fingerprint for grouping
  private generateFingerprint(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' ? error.stack : '';
    
    // Simple fingerprint based on error message and first stack frame
    const firstStackLine = stack?.split('\n')[1] || '';
    const fingerprint = `${message}:${firstStackLine}`;
    
    // Create hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  // Get current user ID (implement based on your auth system)
  private getCurrentUserId(): string | undefined {
    // This should integrate with your authentication system
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || user.uid;
    } catch {
      return undefined;
    }
  }

  // Get error type from message
  private getErrorType(message: string): string {
    if (message.includes('Network')) return 'NetworkError';
    if (message.includes('TypeError')) return 'TypeError';
    if (message.includes('ReferenceError')) return 'ReferenceError';
    if (message.includes('SyntaxError')) return 'SyntaxError';
    if (message.includes('fetch')) return 'FetchError';
    if (message.includes('timeout')) return 'TimeoutError';
    if (message.includes('permission')) return 'PermissionError';
    return 'UnknownError';
  }
}

// React hook for error logging
export const useErrorLogging = () => {
  const [errorLoggingService] = React.useState(() => new ErrorLoggingService());

  const logError = React.useCallback((
    error: Error | string,
    context?: Record<string, any>,
    level?: ErrorLog['level'],
    tags?: string[]
  ) => {
    return errorLoggingService.logError(error, context, level, tags);
  }, [errorLoggingService]);

  const addBreadcrumb = React.useCallback((
    message: string,
    category: string,
    level?: Breadcrumb['level'],
    data?: Record<string, any>
  ) => {
    errorLoggingService.addBreadcrumb(message, category, level, data);
  }, [errorLoggingService]);

  React.useEffect(() => {
    return () => {
      errorLoggingService.destroy();
    };
  }, [errorLoggingService]);

  return {
    logError,
    addBreadcrumb,
    getMetrics: () => errorLoggingService.getMetrics(),
    getErrors: (limit?: number) => errorLoggingService.getErrors(limit),
    setUser: (userId: string, userData?: Record<string, any>) => 
      errorLoggingService.setUser(userId, userData),
    setContext: (key: string, value: any) => 
      errorLoggingService.setContext(key, value),
    exportErrors: () => errorLoggingService.exportErrors()
  };
};

// Export singleton instance
export const errorLoggingService = new ErrorLoggingService();
export { ErrorLoggingService };
export default errorLoggingService;