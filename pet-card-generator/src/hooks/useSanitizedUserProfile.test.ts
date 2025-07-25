/**
 * Tests for useSanitizedUserProfile hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSanitizedUserProfile } from './useSanitizedUserProfile';
import { userProfileSanitizationService, UserProfile } from '../services/userProfileSanitization';

// Mock the sanitization service
vi.mock('../services/userProfileSanitization', () => ({
  userProfileSanitizationService: {
    sanitizeUserProfile: vi.fn(),
    validateUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
    needsResanitization: vi.fn(),
    getSanitizationSummary: vi.fn()
  }
}));

describe('useSanitizedUserProfile', () => {
  const mockService = userProfileSanitizationService as any;

  const mockProfile: UserProfile = {
    id: 'user123',
    email: 'test@example.com',
    displayName: 'John Doe',
    bio: 'I love pets',
    createdAt: new Date('2023-01-01')
  };

  const mockSanitizedProfile = {
    ...mockProfile,
    sanitizationInfo: {
      lastUpdated: new Date(),
      profileVersion: '1.0.0',
      violationsCount: 0,
      sanitizedFields: []
    }
  };

  const mockSanitizationResult = {
    profile: mockSanitizedProfile,
    sanitizationResults: {
      displayName: {
        sanitizedContent: 'John Doe',
        originalContent: 'John Doe',
        removedElements: [],
        securityViolations: [],
        processingTime: 10,
        isValid: true
      },
      bio: {
        sanitizedContent: 'I love pets',
        originalContent: 'I love pets',
        removedElements: [],
        securityViolations: [],
        processingTime: 15,
        isValid: true
      }
    },
    hasViolations: false,
    totalViolations: 0
  };

  const mockValidationResult = {
    isValid: true,
    fieldValidations: {
      displayName: {
        isValid: true,
        violations: [],
        riskLevel: 'low' as const,
        recommendedAction: 'allow' as const,
        confidence: 0.95
      },
      bio: {
        isValid: true,
        violations: [],
        riskLevel: 'low' as const,
        recommendedAction: 'allow' as const,
        confidence: 0.95
      }
    },
    overallRiskLevel: 'low' as const,
    recommendedAction: 'allow' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockService.sanitizeUserProfile.mockResolvedValue(mockSanitizationResult);
    mockService.validateUserProfile.mockResolvedValue(mockValidationResult);
    mockService.updateUserProfile.mockResolvedValue(mockSanitizationResult);
    mockService.needsResanitization.mockReturnValue(false);
    mockService.getSanitizationSummary.mockReturnValue({
      lastSanitized: new Date(),
      violationsFound: 0,
      sanitizedFields: [],
      isUpToDate: true
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useSanitizedUserProfile());

      expect(result.current.profile).toBeNull();
      expect(result.current.originalProfile).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.sanitizationResult).toBeNull();
      expect(result.current.validationResult).toBeNull();
    });

    it('should auto-sanitize initial profile when provided', async () => {
      const { result } = renderHook(() => 
        useSanitizedUserProfile(mockProfile, { autoSanitize: true })
      );

      await waitFor(() => {
        expect(mockService.sanitizeUserProfile).toHaveBeenCalledWith(mockProfile);
      });

      expect(result.current.profile).toEqual(mockSanitizedProfile);
      expect(result.current.originalProfile).toEqual(mockProfile);
    });

    it('should not auto-sanitize when autoSanitize is false', () => {
      renderHook(() => 
        useSanitizedUserProfile(mockProfile, { autoSanitize: false })
      );

      expect(mockService.sanitizeUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeProfile', () => {
    it('should sanitize profile and update state', async () => {
      const { result } = renderHook(() => useSanitizedUserProfile());

      await act(async () => {
        const sanitizationResult = await result.current.sanitizeProfile(mockProfile);
        expect(sanitizationResult).toEqual(mockSanitizationResult);
      });

      expect(result.current.profile).toEqual(mockSanitizedProfile);
      expect(result.current.originalProfile).toEqual(mockProfile);
      expect(result.current.sanitizationResult).toEqual(mockSanitizationResult);
      expect(mockService.sanitizeUserProfile).toHaveBeenCalledWith(mockProfile);
    });

    it('should handle sanitization errors', async () => {
      const error = new Error('Sanitization failed');
      mockService.sanitizeUserProfile.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSanitizedUserProfile());

      await act(async () => {
        await expect(result.current.sanitizeProfile(mockProfile)).rejects.toThrow('Sanitization failed');
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.profile).toBeNull();
    });

    it('should auto-validate when validateOnChange is true', async () => {
      const { result } = renderHook(() => 
        useSanitizedUserProfile(undefined, { validateOnChange: true })
      );

      await act(async () => {
        await result.current.sanitizeProfile(mockProfile);
      });

      expect(mockService.validateUserProfile).toHaveBeenCalledWith(mockProfile);
      expect(result.current.validationResult).toEqual(mockValidationResult);
    });
  });

  describe('validateProfile', () => {
    it('should validate profile and update state', async () => {
      const { result } = renderHook(() => useSanitizedUserProfile());

      await act(async () => {
        const validationResult = await result.current.validateProfile(mockProfile);
        expect(validationResult).toEqual(mockValidationResult);
      });

      expect(result.current.validationResult).toEqual(mockValidationResult);
      expect(mockService.validateUserProfile).toHaveBeenCalledWith(mockProfile);
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      mockService.validateUserProfile.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSanitizedUserProfile());

      await act(async () => {
        await expect(result.current.validateProfile(mockProfile)).rejects.toThrow('Validation failed');
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('updateProfile', () => {
    it('should update profile with debouncing', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => 
        useSanitizedUserProfile(mockProfile, { debounceMs: 300 })
      );

      // Wait for initial sanitization
      await waitFor(() => {
        expect(result.current.originalProfile).toEqual(mockProfile);
      });

      const updates = { displayName: 'Jane Doe', bio: 'Updated bio' };

      act(() => {
        result.current.updateProfile(updates);
      });

      // Fast-forward time to trigger debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockService.updateUserProfile).toHaveBeenCalledWith(mockProfile, updates);
      });

      vi.useRealTimers();
    });

    it('should throw error when no original profile exists', async () => {
      const { result } = renderHook(() => useSanitizedUserProfile());

      await act(async () => {
        await expect(result.current.updateProfile({ displayName: 'New Name' }))
          .rejects.toThrow('No original profile to update');
      });
    });

    it('should debounce multiple rapid updates', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => 
        useSanitizedUserProfile(mockProfile, { debounceMs: 300 })
      );

      // Wait for initial sanitization
      await waitFor(() => {
        expect(result.current.originalProfile).toEqual(mockProfile);
      });

      // Make multiple rapid updates
      act(() => {
        result.current.updateProfile({ displayName: 'Update 1' });
        result.current.updateProfile({ displayName: 'Update 2' });
        result.current.updateProfile({ displayName: 'Update 3' });
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Should only call once with the last update
        expect(mockService.updateUserProfile).toHaveBeenCalledTimes(1);
        expect(mockService.updateUserProfile).toHaveBeenCalledWith(mockProfile, { displayName: 'Update 3' });
      });

      vi.useRealTimers();
    });
  });

  describe('clearProfile', () => {
    it('should clear all profile state', async () => {
      const { result } = renderHook(() => useSanitizedUserProfile(mockProfile));

      // Wait for initial sanitization
      await waitFor(() => {
        expect(result.current.profile).toEqual(mockSanitizedProfile);
      });

      act(() => {
        result.current.clearProfile();
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.originalProfile).toBeNull();
      expect(result.current.sanitizationResult).toBeNull();
      expect(result.current.validationResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('computed values', () => {
    it('should compute hasViolations correctly', async () => {
      const resultWithViolations = {
        ...mockSanitizationResult,
        hasViolations: true,
        totalViolations: 2
      };

      mockService.sanitizeUserProfile.mockResolvedValueOnce(resultWithViolations);

      const { result } = renderHook(() => useSanitizedUserProfile());

      await act(async () => {
        await result.current.sanitizeProfile(mockProfile);
      });

      expect(result.current.hasViolations).toBe(true);
    });

    it('should compute needsResanitization correctly', async () => {
      mockService.needsResanitization.mockReturnValue(true);

      const { result } = renderHook(() => useSanitizedUserProfile(mockProfile));

      await waitFor(() => {
        expect(result.current.needsResanitization).toBe(true);
      });
    });

    it('should get sanitization summary', async () => {
      const { result } = renderHook(() => useSanitizedUserProfile(mockProfile));

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockSanitizedProfile);
      });

      const summary = result.current.getSanitizationSummary();
      expect(summary).toEqual({
        lastSanitized: expect.any(Date),
        violationsFound: 0,
        sanitizedFields: [],
        isUpToDate: true
      });
    });
  });

  describe('loading states', () => {
    it('should track loading states correctly', async () => {
      const { result } = renderHook(() => useSanitizedUserProfile());

      // Mock a slow sanitization
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockService.sanitizeUserProfile.mockReturnValueOnce(slowPromise);

      act(() => {
        result.current.sanitizeProfile(mockProfile);
      });

      expect(result.current.isSanitizing).toBe(true);
      expect(result.current.isLoading).toBe(true);

      act(() => {
        resolvePromise!(mockSanitizationResult);
      });

      await waitFor(() => {
        expect(result.current.isSanitizing).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});