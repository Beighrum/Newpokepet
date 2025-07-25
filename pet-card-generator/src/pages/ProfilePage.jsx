/**
 * User Profile Page with Sanitization
 * Demonstrates secure user profile management
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSanitizedUserProfile } from '@/hooks/useSanitizedUserProfile';
import { SanitizedInput } from '@/components/sanitization/SanitizedInput';
import { SanitizedTextArea } from '@/components/sanitization/SanitizedTextArea';
import { SafeHTMLDisplay } from '@/components/sanitization/SafeHTMLDisplay';
import SecurityStatusIndicator from '@/components/SecurityStatusIndicator';
import { userProfileSanitizationService } from '@/services/userProfileSanitization';
import { securityEventLogger } from '@/services/securityEventLogger';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user } = useAuth();
  const { sanitizedProfile, isLoading: profileLoading, refreshProfile } = useSanitizedUserProfile(user);
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [securityViolations, setSecurityViolations] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load profile data
  useEffect(() => {
    if (sanitizedProfile) {
      setDisplayName(sanitizedProfile.displayName || user?.displayName || '');
      setBio(sanitizedProfile.bio || '');
    } else if (user && !profileLoading) {
      setDisplayName(user.displayName || '');
      setBio('');
    }
  }, [sanitizedProfile, user, profileLoading]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);
    setSecurityViolations([]);

    try {
      // Sanitize profile data
      const profileData = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        userId: user.uid
      };

      const sanitizedData = await userProfileSanitizationService.sanitizeUserProfile(profileData);

      // Log any security violations
      if (sanitizedData.sanitizationInfo.violationsFound > 0) {
        setSecurityViolations(sanitizedData.sanitizationInfo.violations);
        
        await securityEventLogger.logSecurityEvent({
          type: 'profile_sanitization',
          severity: 'warning',
          userId: user.uid,
          details: {
            violations: sanitizedData.sanitizationInfo.violations,
            originalData: profileData,
            sanitizedData: sanitizedData
          }
        });
      }

      // Save to backend (mock implementation)
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(sanitizedData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Refresh the sanitized profile
      await refreshProfile();
      
      setSuccess(true);
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (sanitizedProfile) {
      setDisplayName(sanitizedProfile.displayName || user?.displayName || '');
      setBio(sanitizedProfile.bio || '');
    } else {
      setDisplayName(user?.displayName || '');
      setBio('');
    }
    setIsEditing(false);
    setSecurityViolations([]);
    setError(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Profile</h1>
          <p className="text-lg text-gray-600">
            Manage your profile with enhanced security
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Your profile information is automatically sanitized for security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar and Basic Info */}
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user.photoURL} alt={displayName || 'User'} />
                  <AvatarFallback className="text-lg">
                    {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Joined {user.metadata?.creationTime ? 
                        new Date(user.metadata.creationTime).toLocaleDateString() : 
                        'Recently'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                {isEditing ? (
                  <SanitizedInput
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="Enter your display name"
                    maxLength={50}
                    contentType="user_profile"
                    onSecurityViolation={(violation) => {
                      setSecurityViolations(prev => [...prev, violation]);
                      securityEventLogger.logSecurityEvent({
                        type: 'profile_input_violation',
                        severity: 'info',
                        userId: user.uid,
                        details: {
                          field: 'displayName',
                          violation
                        }
                      });
                    }}
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                    {sanitizedProfile?.displayName ? (
                      <SafeHTMLDisplay
                        content={sanitizedProfile.displayName}
                        contentType="user_profile"
                        fallback={displayName}
                      />
                    ) : (
                      <span className="text-gray-500">No display name set</span>
                    )}
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <SanitizedTextArea
                    value={bio}
                    onChange={setBio}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                    rows={4}
                    contentType="user_profile"
                    onSecurityViolation={(violation) => {
                      setSecurityViolations(prev => [...prev, violation]);
                      securityEventLogger.logSecurityEvent({
                        type: 'profile_input_violation',
                        severity: 'info',
                        userId: user.uid,
                        details: {
                          field: 'bio',
                          violation
                        }
                      });
                    }}
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded-md min-h-[100px]">
                    {sanitizedProfile?.bio ? (
                      <SafeHTMLDisplay
                        content={sanitizedProfile.bio}
                        contentType="user_profile"
                        fallback={bio}
                      />
                    ) : (
                      <span className="text-gray-500">No bio added yet</span>
                    )}
                  </div>
                )}
              </div>

              {/* Security Status */}
              {sanitizedProfile?.sanitizationInfo && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Security Status</span>
                    <SecurityStatusIndicator
                      contentType="user_profile"
                      sanitizationInfo={sanitizedProfile.sanitizationInfo}
                      size="md"
                      showDetails={true}
                    />
                  </div>
                </div>
              )}

              {/* Security Violations Alert */}
              {securityViolations.length > 0 && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Content has been automatically sanitized for security. 
                    {securityViolations.length} potential issue{securityViolations.length > 1 ? 's' : ''} detected and resolved.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={isSaving}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="flex-1"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security Features</span>
              </CardTitle>
              <CardDescription>
                Your profile is protected by advanced security measures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Content Sanitization</h4>
                  <p className="text-sm text-green-700">
                    All profile content is automatically sanitized to prevent XSS attacks
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Real-time Validation</h4>
                  <p className="text-sm text-blue-700">
                    Input is validated in real-time as you type for immediate feedback
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Security Monitoring</h4>
                  <p className="text-sm text-purple-700">
                    All security events are logged and monitored for suspicious activity
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">Safe HTML Support</h4>
                  <p className="text-sm text-orange-700">
                    Limited HTML formatting is supported while maintaining security
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;