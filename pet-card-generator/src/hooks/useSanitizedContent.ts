/**
 * React hook for sanitizing content with loading states, error handling, and retry logic
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { sanitizationService } from '../services/sanitization';
import { sanitizationCache } from '../services/sanitizationCache';
import {
  SanitizeOptions,
  SanitizedResult,
  UseSanitizedContentHook,
  ContentType
} from '../types/sanitization';

interface UseSanitizedContentOptions {
  contentType?: ContentType;
  retryAttempts?: number;
  retryDelay?: number;
  enableMemoization?: boolean;
  useCentralizedCache?: boolean;
  useLazySanitization?: boolean;
  useWorkerSanitization?: boolean;
  priority?: number;
}

export function useSanitizedContent(options: UseSanitizedContentOptions = {}): UseSanitizedContentHook {
  const {
    contentType = ContentType.GENERAL,
    retryAttempts = 3,
    retryDelay = 1000,
    enableMemoization = true,
    useCentralizedCache = true,
    useLazySanitization = false,
    useWorkerSanitization = false,
    priority = 1
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<SanitizedResult | null>(null);

  // Memoization cache for sanitized content
  const memoCache = useRef<Map<string, SanitizedResult>>(new Map());
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate cache key for memoization
  const generateCacheKey = useCallback((content: string, options?: SanitizeOptions): string => {
    return `${content}_${JSON.stringify(options)}_${contentType}`;
  }, [contentType]);

  // Clear memoization cache
  const clearCache = useCallback(() => {
    memoCache.current.clear();
    if (useCentralizedCache) {
      sanitizationCache.invalidateByContentType(contentType);
    }
  }, [contentType, useCentralizedCache]);

  // Retry logic with exponential backoff
  const retryWithBackoff = useCallback(async (
    fn: () => Promise<SanitizedResult>,
    attempt: number = 0
  ): Promise<SanitizedResult> => {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retryAttempts) {
        throw err;
      }

      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, attempt + 1);
    }
  }, [retryAttempts, retryDelay]);

  // Synchronous sanitization with memoization
  const sanitize = useCallback((content: string, options?: SanitizeOptions): string => {
    try {
      setError(null);

      if (!content || typeof content !== 'string') {
        return '';
      }

      // Check centralized cache first, then local memoization cache
      if (useCentralizedCache) {
        const cachedResult = sanitizationCache.get(content, options, contentType);
        if (cachedResult) {
          setLastResult(cachedResult);
          return cachedResult.sanitizedContent;
        }
      } else if (enableMemoization) {
        const cacheKey = generateCacheKey(content, options);
        const cachedResult = memoCache.current.get(cacheKey);
        if (cachedResult) {
          setLastResult(cachedResult);
          return cachedResult.sanitizedContent;
        }
      }

      // Get content-type specific configuration
      const contentTypeConfig = sanitizationService.getConfigForContentType(contentType);
      const mergedOptions = { ...contentTypeConfig, ...options };

      // Perform synchronous sanitization
      const result = sanitizationService.sanitizeSync(content, mergedOptions);
      setLastResult(result);

      // Cache the result in centralized cache or local memoization
      if (useCentralizedCache) {
        sanitizationCache.set(content, result, options, contentType);
      } else if (enableMemoization) {
        const cacheKey = generateCacheKey(content, options);
        memoCache.current.set(cacheKey, result);

        // Limit cache size to prevent memory leaks
        if (memoCache.current.size > 100) {
          const firstKey = memoCache.current.keys().next().value;
          if (firstKey) {
            memoCache.current.delete(firstKey);
          }
        }
      }

      // Log security violations if any
      if (result.securityViolations.length > 0) {
        console.warn('Security violations detected during sanitization:', result.securityViolations);
      }

      return result.sanitizedContent;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sanitization failed');
      setError(error);
      console.error('Synchronous sanitization error:', error);
      
      // Fail secure - return empty string
      return '';
    }
  }, [contentType, enableMemoization, generateCacheKey]);

  // Asynchronous sanitization with retry logic
  const sanitizeAsync = useCallback(async (content: string, options?: SanitizeOptions): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!content || typeof content !== 'string') {
        setIsLoading(false);
        return '';
      }

      // Check centralized cache first, then local memoization cache
      if (useCentralizedCache) {
        const cachedResult = sanitizationCache.get(content, options, contentType);
        if (cachedResult) {
          setLastResult(cachedResult);
          setIsLoading(false);
          return cachedResult.sanitizedContent;
        }
      } else if (enableMemoization) {
        const cacheKey = generateCacheKey(content, options);
        const cachedResult = memoCache.current.get(cacheKey);
        if (cachedResult) {
          setLastResult(cachedResult);
          setIsLoading(false);
          return cachedResult.sanitizedContent;
        }
      }

      // Get content-type specific configuration
      const contentTypeConfig = sanitizationService.getConfigForContentType(contentType);
      const mergedOptions = { ...contentTypeConfig, ...options };

      // Perform asynchronous sanitization with retry logic
      const result = await retryWithBackoff(async () => {
        if (useWorkerSanitization) {
          return await sanitizationService.sanitizeWithWorker(content, mergedOptions, contentType);
        } else if (useLazySanitization) {
          return await sanitizationService.lazySanitize(content, mergedOptions, contentType, priority);
        } else {
          return await sanitizationService.sanitizeHTML(content, mergedOptions);
        }
      });

      setLastResult(result);

      // Cache the result in centralized cache or local memoization
      if (useCentralizedCache) {
        sanitizationCache.set(content, result, options, contentType);
      } else if (enableMemoization) {
        const cacheKey = generateCacheKey(content, options);
        memoCache.current.set(cacheKey, result);

        // Limit cache size to prevent memory leaks
        if (memoCache.current.size > 100) {
          const firstKey = memoCache.current.keys().next().value;
          if (firstKey) {
            memoCache.current.delete(firstKey);
          }
        }
      }

      // Log security violations if any
      if (result.securityViolations.length > 0) {
        console.warn('Security violations detected during async sanitization:', result.securityViolations);
      }

      setIsLoading(false);
      return result.sanitizedContent;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Async sanitization failed');
      setError(error);
      setIsLoading(false);
      console.error('Asynchronous sanitization error:', error);
      
      // Fail secure - return empty string
      return '';
    }
  }, [contentType, enableMemoization, generateCacheKey, retryWithBackoff]);

  // Cleanup function to clear timeouts and cache
  const cleanup = useCallback(() => {
    // Clear any pending retry timeouts
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();
    
    // Clear memoization cache
    clearCache();
  }, [clearCache]);

  // Memoized return object to prevent unnecessary re-renders
  const hookReturn = useMemo(() => ({
    sanitize,
    sanitizeAsync,
    isLoading,
    error,
    lastResult,
    clearCache,
    cleanup
  }), [sanitize, sanitizeAsync, isLoading, error, lastResult, clearCache, cleanup]);

  return hookReturn;
}

// Export additional utility hooks for specific content types
export function useSanitizedUserProfile() {
  return useSanitizedContent({ contentType: ContentType.USER_PROFILE });
}

export function useSanitizedPetCard() {
  return useSanitizedContent({ contentType: ContentType.PET_CARD_METADATA });
}

export function useSanitizedComment() {
  return useSanitizedContent({ contentType: ContentType.COMMENT });
}

export function useSanitizedSocialSharing() {
  return useSanitizedContent({ contentType: ContentType.SOCIAL_SHARING });
}

export default useSanitizedContent;