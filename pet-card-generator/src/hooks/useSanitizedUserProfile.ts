/**
 * React hook for sanitized user profile management - Simple Mock Version
 */

import { useState, useCallback, useEffect } from 'react';

// Simple mock types
interface UserProfile {
  displayName?: string;
  bio?: string;
  userId?: string;
}

interface SanitizedUserProfile extends UserProfile {
  sanitizationInfo?: {
    lastSanitized: Date;
    violationsFound: number;
  };
}

// Simple mock hook for user profile
export function useSanitizedUserProfile(user: any) {
  const [sanitizedProfile, setSanitizedProfile] = useState<SanitizedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      // Mock sanitized profile
      setTimeout(() => {
        setSanitizedProfile({
          displayName: user.displayName || 'User',
          bio: 'This is a mock bio',
          sanitizationInfo: {
            lastSanitized: new Date(),
            violationsFound: 0
          }
        });
        setIsLoading(false);
      }, 100);
    } else {
      setSanitizedProfile(null);
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    // Mock refresh
    return Promise.resolve();
  }, []);

  return {
    sanitizedProfile,
    isLoading,
    refreshProfile
  };
}