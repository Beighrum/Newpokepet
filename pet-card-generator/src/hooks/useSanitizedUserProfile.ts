/**
 * React hook for sanitized user profile management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  userProfileSanitizationService, 
  UserProfile, 
  SanitizedUserProfile,
  UserProfileSanitizationResult,
  UserProfileValidationResult
} from '../services/userProfileSanitization';

export interface UseSanitizedUserProfileOptions {
  autoSanitize?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
}

export interface UseSanitizedUserProfileReturn {
  // Profile state
  profile: SanitizedUserProfile | null;
  originalProfile: UserProfile | null;
  
  // Loading and error states
  isLoading: boolean;
  isSanitizing: boolean;
  isValidating: boolean;
  error: Error | null;
  
  // Sanitization results
  sanitizationResult: UserProfileSanitizationResult | null;
  validationResult: UserProfileValidationResult | null;
  
  // Actions
  sanitizeProfile: (profile: UserProfile) => Promise<UserProfileSanitizationResult>;
  validateProfile: (profile: UserProfile) => Promise<UserProfileValidationResult>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'bio'>>) => Promise<UserProfileSanitizationResult>;
  clearProfile: () => void;
  
  // Utility functions
  hasViolations: boolean;
  needsResanitization: boolean;
  getSanitizationSummary: () => {
    lastSanitized: Date;
    violationsFound: number;
    sanitizedFields: string[];
    isUpToDate: boolean;
  } | null;
}

export function useSanitizedUserProfile(
  initialProfile?: UserProfile,
  options: UseSanitizedUserProfileOptions = {}
): UseSanitizedUserProfileReturn {
  const {
    autoSanitize = true,
    validateOnChange = true,
    debounceMs = 300
  } = options;

  // State
  const [profile, setProfile] = useState<SanitizedUserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(initialProfile || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sanitizationResult, setSanitizationResult] = useState<UserProfileSanitizationResult | null>(null);
  const [validationResult, setValidationResult] = useState<UserProfileValidationResult | null>(null);

  // Refs for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Auto-sanitize initial profile
  useEffect(() => {
    if (initialProfile && autoSanitize && !profile) {
      sanitizeProfile(initialProfile);
    }
  }, [initialProfile, autoSanitize]);

  /**
   * Sanitize user profile
   */
  const sanitizeProfile = useCallback(async (profileToSanitize: UserProfile): Promise<UserProfileSanitizationResult> => {
    if (!mountedRef.current) return Promise.reject(new Error('Component unmounted'));

    setIsSanitizing(true);
    setError(null);

    try {
      const result = await userProfileSanitizationService.sanitizeUserProfile(profileToSanitize);
      
      if (mountedRef.current) {
        setProfile(result.profile);
        setOriginalProfile(profileToSanitize);
        setSanitizationResult(result);
        
        // Auto-validate if enabled
        if (validateOnChange) {
          validateProfile(profileToSanitize);
        }
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sanitization failed');
      if (mountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setIsSanitizing(false);
      }
    }
  }, [validateOnChange]);

  /**
   * Validate user profile
   */
  const validateProfile = useCallback(async (profileToValidate: UserProfile): Promise<UserProfileValidationResult> => {
    if (!mountedRef.current) return Promise.reject(new Error('Component unmounted'));

    setIsValidating(true);
    setError(null);

    try {
      const result = await userProfileSanitizationService.validateUserProfile(profileToValidate);
      
      if (mountedRef.current) {
        setValidationResult(result);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Validation failed');
      if (mountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setIsValidating(false);
      }
    }
  }, []);

  /**
   * Update user profile with debouncing
   */
  const updateProfile = useCallback(async (
    updates: Partial<Pick<UserProfile, 'displayName' | 'bio'>>
  ): Promise<UserProfileSanitizationResult> => {
    if (!originalProfile) {
      throw new Error('No original profile to update');
    }

    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout
      debounceTimeoutRef.current = setTimeout(async () => {
        if (!mountedRef.current) {
          reject(new Error('Component unmounted'));
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const result = await userProfileSanitizationService.updateUserProfile(originalProfile, updates);
          
          if (mountedRef.current) {
            setProfile(result.profile);
            setOriginalProfile({ ...originalProfile, ...updates, updatedAt: new Date() });
            setSanitizationResult(result);
            
            // Auto-validate if enabled
            if (validateOnChange) {
              const updatedProfile = { ...originalProfile, ...updates };
              await validateProfile(updatedProfile);
            }
          }
          
          resolve(result);
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Profile update failed');
          if (mountedRef.current) {
            setError(error);
          }
          reject(error);
        } finally {
          if (mountedRef.current) {
            setIsLoading(false);
          }
        }
      }, debounceMs);
    });
  }, [originalProfile, validateOnChange, debounceMs]);

  /**
   * Clear profile state
   */
  const clearProfile = useCallback(() => {
    setProfile(null);
    setOriginalProfile(null);
    setSanitizationResult(null);
    setValidationResult(null);
    setError(null);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  /**
   * Get sanitization summary
   */
  const getSanitizationSummary = useCallback(() => {
    if (!profile) return null;
    return userProfileSanitizationService.getSanitizationSummary(profile);
  }, [profile]);

  // Computed values
  const hasViolations = sanitizationResult?.hasViolations ?? false;
  const needsResanitization = profile ? userProfileSanitizationService.needsResanitization(profile) : false;

  return {
    // Profile state
    profile,
    originalProfile,
    
    // Loading and error states
    isLoading: isLoading || isSanitizing || isValidating,
    isSanitizing,
    isValidating,
    error,
    
    // Sanitization results
    sanitizationResult,
    validationResult,
    
    // Actions
    sanitizeProfile,
    validateProfile,
    updateProfile,
    clearProfile,
    
    // Utility values
    hasViolations,
    needsResanitization,
    getSanitizationSummary
  };
}