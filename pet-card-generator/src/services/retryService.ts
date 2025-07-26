interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
  abortSignal?: AbortSignal;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

class RetryService {
  private static readonly DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryCondition' | 'onRetry' | 'abortSignal'>> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true
  };

  // Execute function with retry logic
  static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        // Check if operation was aborted
        if (options.abortSignal?.aborted) {
          throw new Error('Operation aborted');
        }

        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;

        // Check if we should retry this error
        if (options.retryCondition && !options.retryCondition(error, attempt)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === opts.maxAttempts) {
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, opts);

        // Call retry callback if provided
        if (options.onRetry) {
          options.onRetry(error, attempt, delay);
        }

        // Wait before next attempt
        await this.delay(delay, options.abortSignal);
      }
    }

    throw lastError;
  }

  // Execute with detailed result information
  static async executeWithResult<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let attempts = 0;

    try {
      const data = await this.execute(fn, {
        ...options,
        onRetry: (error, attempt, delay) => {
          attempts = attempt;
          options.onRetry?.(error, attempt, delay);
        }
      });

      return {
        success: true,
        data,
        attempts: attempts + 1,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error,
        attempts: attempts + 1,
        totalTime: Date.now() - startTime
      };
    }
  }

  // Retry HTTP requests with specific error handling
  static async retryFetch(
    url: string,
    init?: RequestInit,
    options: RetryOptions = {}
  ): Promise<Response> {
    return this.execute(
      async () => {
        const response = await fetch(url, init);
        
        // Retry on server errors (5xx) and some client errors
        if (response.status >= 500 || response.status === 429 || response.status === 408) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      },
      {
        retryCondition: (error, attempt) => {
          // Don't retry client errors (except rate limiting and timeout)
          if (error.message.includes('HTTP 4') && 
              !error.message.includes('HTTP 429') && 
              !error.message.includes('HTTP 408')) {
            return false;
          }
          return true;
        },
        ...options
      }
    );
  }

  // Retry with circuit breaker pattern
  static createCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: RetryOptions & {
      failureThreshold?: number;
      resetTimeout?: number;
    } = {}
  ) {
    const failureThreshold = options.failureThreshold || 5;
    const resetTimeout = options.resetTimeout || 60000;
    
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async (): Promise<T> => {
      const now = Date.now();

      // Check if circuit should reset
      if (state === 'open' && now - lastFailureTime >= resetTimeout) {
        state = 'half-open';
        failureCount = 0;
      }

      // Fail fast if circuit is open
      if (state === 'open') {
        throw new Error('Circuit breaker is open');
      }

      try {
        const result = await this.execute(fn, options);
        
        // Reset on success
        if (state === 'half-open') {
          state = 'closed';
        }
        failureCount = 0;
        
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        // Open circuit if threshold reached
        if (failureCount >= failureThreshold) {
          state = 'open';
        }

        throw error;
      }
    };
  }

  // Batch retry multiple operations
  static async retryBatch<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions & {
      concurrency?: number;
      failFast?: boolean;
    } = {}
  ): Promise<Array<RetryResult<T>>> {
    const { concurrency = 3, failFast = false, ...retryOptions } = options;
    const results: Array<RetryResult<T>> = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await this.executeWithResult(operation, retryOptions);
          
          if (failFast && !result.success) {
            throw result.error;
          }
          
          return result;
        } catch (error) {
          if (failFast) {
            throw error;
          }
          
          return {
            success: false,
            error,
            attempts: retryOptions.maxAttempts || this.DEFAULT_OPTIONS.maxAttempts,
            totalTime: 0
          } as RetryResult<T>;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // Calculate delay with exponential backoff and jitter
  private static calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'retryCondition' | 'onRetry' | 'abortSignal'>>): number {
    const exponentialDelay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
    let delay = Math.min(exponentialDelay, options.maxDelay);

    // Add jitter to prevent thundering herd
    if (options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  // Promisified delay with abort support
  private static delay(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new Error('Operation aborted'));
      };

      abortSignal?.addEventListener('abort', abortHandler, { once: true });

      // Clean up listener when promise resolves
      setTimeout(() => {
        abortSignal?.removeEventListener('abort', abortHandler);
      }, ms);
    });
  }
}

// Utility functions for common retry scenarios
export const retryUtils = {
  // Retry API calls with common settings
  apiCall: <T>(fn: () => Promise<T>, options?: RetryOptions) =>
    RetryService.execute(fn, {
      maxAttempts: 3,
      baseDelay: 1000,
      retryCondition: (error) => {
        // Retry on network errors and server errors
        return error.name === 'NetworkError' || 
               error.message.includes('fetch') ||
               error.message.includes('5') ||
               error.message.includes('timeout');
      },
      ...options
    }),

  // Retry file operations
  fileOperation: <T>(fn: () => Promise<T>, options?: RetryOptions) =>
    RetryService.execute(fn, {
      maxAttempts: 2,
      baseDelay: 500,
      retryCondition: (error) => {
        // Retry on file system errors but not permission errors
        return !error.message.includes('permission') &&
               !error.message.includes('access denied');
      },
      ...options
    }),

  // Retry database operations
  databaseOperation: <T>(fn: () => Promise<T>, options?: RetryOptions) =>
    RetryService.execute(fn, {
      maxAttempts: 3,
      baseDelay: 2000,
      retryCondition: (error) => {
        // Retry on connection errors and timeouts
        return error.message.includes('connection') ||
               error.message.includes('timeout') ||
               error.message.includes('deadlock');
      },
      ...options
    }),

  // Retry with exponential backoff for rate limiting
  rateLimited: <T>(fn: () => Promise<T>, options?: RetryOptions) =>
    RetryService.execute(fn, {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 60000,
      backoffFactor: 2,
      retryCondition: (error) => {
        return error.message.includes('429') ||
               error.message.includes('rate limit') ||
               error.message.includes('too many requests');
      },
      ...options
    })
};

// Hook for using retry in React components
export const useRetry = () => {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [lastError, setLastError] = React.useState<any>(null);

  const executeWithRetry = React.useCallback(async <T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> => {
    setIsRetrying(true);
    setRetryCount(0);
    setLastError(null);

    try {
      const result = await RetryService.execute(fn, {
        ...options,
        onRetry: (error, attempt, delay) => {
          setRetryCount(attempt);
          setLastError(error);
          options?.onRetry?.(error, attempt, delay);
        }
      });

      setIsRetrying(false);
      return result;
    } catch (error) {
      setIsRetrying(false);
      setLastError(error);
      throw error;
    }
  }, []);

  return {
    executeWithRetry,
    isRetrying,
    retryCount,
    lastError
  };
};

export { RetryService };
export default RetryService;