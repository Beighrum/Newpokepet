/**
 * Firebase integration for sanitized user profiles
 * Demonstrates how to integrate user profile sanitization with Firebase Auth and Firestore
 */

import { 
  userProfileSanitizationService, 
  UserProfile, 
  SanitizedUserProfile,
  UserProfileSanitizationResult 
} from './userProfileSanitization';

// Mock Firebase types for demonstration
interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface FirestoreDocument {
  id: string;
  data: () => any;
  exists: boolean;
}

/**
 * Service for integrating sanitized user profiles with Firebase
 */
class FirebaseUserProfileIntegrationService {
  private readonly COLLECTION_NAME = 'sanitized_user_profiles';
  private readonly PROFILE_VERSION = '1.0.0';

  /**
   * Create or update user profile with sanitization
   */
  async createOrUpdateUserProfile(
    firebaseUser: FirebaseUser,
    profileUpdates: Partial<Pick<UserProfile, 'displayName' | 'bio'>>
  ): Promise<UserProfileSanitizationResult> {
    try {
      // Get existing profile or create new one
      const existingProfile = await this.getUserProfile(firebaseUser.uid);
      
      const profileData: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: profileUpdates.displayName || firebaseUser.displayName || 'Anonymous User',
        bio: profileUpdates.bio,
        createdAt: existingProfile?.createdAt || new Date(),
        updatedAt: new Date()
      };

      // Sanitize the profile
      const sanitizationResult = await userProfileSanitizationService.sanitizeUserProfile(profileData);

      // Save to Firestore (mock implementation)
      await this.saveUserProfileToFirestore(sanitizationResult.profile);

      // Log security events if violations found
      if (sanitizationResult.hasViolations) {
        await this.logSecurityEvents(firebaseUser.uid, sanitizationResult);
      }

      return sanitizationResult;
    } catch (error) {
      console.error('Failed to create/update user profile:', error);
      throw new Error(`Profile update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(userId: string): Promise<SanitizedUserProfile | null> {
    try {
      // Mock Firestore get operation
      const doc = await this.mockFirestoreGet(userId);
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      
      // Check if profile needs re-sanitization
      const profile = data as SanitizedUserProfile;
      if (userProfileSanitizationService.needsResanitization(profile)) {
        console.log(`Profile ${userId} needs re-sanitization`);
        // In a real implementation, you might trigger re-sanitization here
      }

      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Update user profile display name with sanitization
   */
  async updateDisplayName(userId: string, newDisplayName: string): Promise<UserProfileSanitizationResult> {
    const existingProfile = await this.getUserProfile(userId);
    
    if (!existingProfile) {
      throw new Error('User profile not found');
    }

    // Convert to UserProfile for updating
    const userProfile: UserProfile = {
      id: existingProfile.id,
      email: existingProfile.email,
      displayName: existingProfile.displayName,
      bio: existingProfile.bio,
      createdAt: existingProfile.createdAt,
      updatedAt: existingProfile.updatedAt
    };

    const result = await userProfileSanitizationService.updateUserProfile(userProfile, {
      displayName: newDisplayName
    });

    await this.saveUserProfileToFirestore(result.profile);

    if (result.hasViolations) {
      await this.logSecurityEvents(userId, result);
    }

    return result;
  }

  /**
   * Update user profile bio with sanitization
   */
  async updateBio(userId: string, newBio: string): Promise<UserProfileSanitizationResult> {
    const existingProfile = await this.getUserProfile(userId);
    
    if (!existingProfile) {
      throw new Error('User profile not found');
    }

    // Convert to UserProfile for updating
    const userProfile: UserProfile = {
      id: existingProfile.id,
      email: existingProfile.email,
      displayName: existingProfile.displayName,
      bio: existingProfile.bio,
      createdAt: existingProfile.createdAt,
      updatedAt: existingProfile.updatedAt
    };

    const result = await userProfileSanitizationService.updateUserProfile(userProfile, {
      bio: newBio
    });

    await this.saveUserProfileToFirestore(result.profile);

    if (result.hasViolations) {
      await this.logSecurityEvents(userId, result);
    }

    return result;
  }

  /**
   * Validate user profile updates before saving
   */
  async validateProfileUpdates(
    userId: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'bio'>>
  ): Promise<{
    isValid: boolean;
    violations: any[];
    canProceed: boolean;
    message: string;
  }> {
    try {
      const existingProfile = await this.getUserProfile(userId);
      
      if (!existingProfile) {
        throw new Error('User profile not found');
      }

      // Create temporary profile for validation
      const tempProfile: UserProfile = {
        id: existingProfile.id,
        email: existingProfile.email,
        displayName: updates.displayName || existingProfile.displayName,
        bio: updates.bio !== undefined ? updates.bio : existingProfile.bio,
        createdAt: existingProfile.createdAt,
        updatedAt: new Date()
      };

      const validationResult = await userProfileSanitizationService.validateUserProfile(tempProfile);

      let message = 'Profile updates are valid';
      let canProceed = true;

      if (!validationResult.isValid) {
        switch (validationResult.recommendedAction) {
          case 'block':
            message = 'Profile updates contain dangerous content and cannot be saved';
            canProceed = false;
            break;
          case 'flag':
            message = 'Profile updates contain suspicious content and will be reviewed';
            canProceed = true;
            break;
          case 'sanitize':
            message = 'Profile updates will be sanitized before saving';
            canProceed = true;
            break;
          default:
            message = 'Profile updates are valid';
            canProceed = true;
        }
      }

      return {
        isValid: validationResult.isValid,
        violations: validationResult.fieldValidations.displayName?.violations || [],
        canProceed,
        message
      };
    } catch (error) {
      return {
        isValid: false,
        violations: [],
        canProceed: false,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get sanitization summary for user profile
   */
  async getProfileSanitizationSummary(userId: string): Promise<{
    lastSanitized: Date | null;
    violationsFound: number;
    sanitizedFields: string[];
    isUpToDate: boolean;
    needsUpdate: boolean;
  } | null> {
    const profile = await this.getUserProfile(userId);
    
    if (!profile) {
      return null;
    }

    const summary = userProfileSanitizationService.getSanitizationSummary(profile);
    
    return {
      lastSanitized: summary?.lastSanitized || null,
      violationsFound: summary?.violationsFound || 0,
      sanitizedFields: summary?.sanitizedFields || [],
      isUpToDate: summary?.isUpToDate || false,
      needsUpdate: userProfileSanitizationService.needsResanitization(profile)
    };
  }

  /**
   * Batch re-sanitize user profiles (for version updates)
   */
  async batchResanitizeProfiles(userIds: string[]): Promise<{
    processed: number;
    errors: number;
    results: Array<{
      userId: string;
      success: boolean;
      error?: string;
      violationsFound?: number;
    }>;
  }> {
    const results: Array<{
      userId: string;
      success: boolean;
      error?: string;
      violationsFound?: number;
    }> = [];

    let processed = 0;
    let errors = 0;

    for (const userId of userIds) {
      try {
        const profile = await this.getUserProfile(userId);
        
        if (!profile) {
          results.push({
            userId,
            success: false,
            error: 'Profile not found'
          });
          errors++;
          continue;
        }

        if (!userProfileSanitizationService.needsResanitization(profile)) {
          results.push({
            userId,
            success: true,
            violationsFound: 0
          });
          processed++;
          continue;
        }

        // Convert to UserProfile for re-sanitization
        const userProfile: UserProfile = {
          id: profile.id,
          email: profile.email,
          displayName: profile.displayName,
          bio: profile.bio,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        };

        const sanitizationResult = await userProfileSanitizationService.sanitizeUserProfile(userProfile);
        await this.saveUserProfileToFirestore(sanitizationResult.profile);

        results.push({
          userId,
          success: true,
          violationsFound: sanitizationResult.totalViolations
        });
        processed++;

        if (sanitizationResult.hasViolations) {
          await this.logSecurityEvents(userId, sanitizationResult);
        }
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errors++;
      }
    }

    return {
      processed,
      errors,
      results
    };
  }

  /**
   * Mock Firestore operations (in real implementation, use Firebase SDK)
   */
  private async mockFirestoreGet(userId: string): Promise<FirestoreDocument> {
    // Mock implementation - in real code, use Firebase SDK
    return {
      id: userId,
      exists: false, // Would check actual Firestore
      data: () => ({})
    };
  }

  private async saveUserProfileToFirestore(profile: SanitizedUserProfile): Promise<void> {
    // Mock implementation - in real code, use Firebase SDK
    console.log(`Saving sanitized profile to Firestore:`, {
      userId: profile.id,
      displayName: profile.displayName,
      bio: profile.bio,
      sanitizationInfo: profile.sanitizationInfo
    });
  }

  private async logSecurityEvents(userId: string, result: UserProfileSanitizationResult): Promise<void> {
    // Mock implementation - in real code, log to security monitoring system
    console.warn(`Security violations detected for user ${userId}:`, {
      totalViolations: result.totalViolations,
      sanitizedFields: result.profile.sanitizationInfo.sanitizedFields,
      violations: {
        displayName: result.sanitizationResults.displayName.securityViolations,
        bio: result.sanitizationResults.bio?.securityViolations || []
      }
    });
  }
}

// Export singleton instance
export const firebaseUserProfileIntegrationService = new FirebaseUserProfileIntegrationService();
export default firebaseUserProfileIntegrationService;