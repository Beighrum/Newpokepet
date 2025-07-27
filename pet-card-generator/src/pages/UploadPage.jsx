import React, { useState, useCallback, useRef } from 'react';
import { useAnalytics, useInteractionTracking, usePerformanceTracking } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Share2,
  Sparkles,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ImageCard from '@/components/ImageCard';
import { SanitizedInput } from '@/components/sanitization/SanitizedInput';
import { SanitizedTextArea } from '@/components/sanitization/SanitizedTextArea';
import { petCardSanitizationService } from '@/services/petCardSanitization';
import { securityEventLogger } from '@/services/securityEventLogger';
import SecurityStatusIndicator from '@/components/SecurityStatusIndicator';

const UploadPage = () => {
  // Analytics hooks
  const { trackCardGeneration } = useAnalytics();
  const { trackFileUpload, trackFormSubmit } = useInteractionTracking();
  const { trackAPICall } = usePerformanceTracking();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [description, setDescription] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCard, setGeneratedCard] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [securityViolations, setSecurityViolations] = useState([]);
  const [sanitizedFormData, setSanitizedFormData] = useState({
    petName: '',
    petType: '',
    description: '',
    customTags: ''
  });
  
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, etc.)');
      
      // Track failed file upload
      trackFileUpload(file.type, file.size, false, 'Invalid file type');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      
      // Track failed file upload
      trackFileUpload(file.type, file.size, false, 'File too large');
      return;
    }

    // Track successful file upload
    trackFileUpload(file.type, file.size, true);

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Clear selected file
  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Generate card
  const handleGenerateCard = async () => {
    if (!selectedFile || !user) {
      setError('Please select an image and ensure you are logged in');
      return;
    }

    const startTime = Date.now();
    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);

    try {
      // Convert file to base64
      setGenerationProgress(20);
      const base64Data = await fileToBase64(selectedFile);

      // Sanitize form data before sending
      const formData = {
        petName: petName.trim() || 'Unknown Pet',
        petType: petType.trim() || 'Pet',
        description: description.trim() || undefined,
        customTags: customTags.trim() ? customTags.split(',').map(tag => tag.trim()).filter(tag => tag) : undefined
      };

      const sanitizedData = await petCardSanitizationService.sanitizeCardMetadata(formData);
      
      // Log any security violations found during sanitization
      if (sanitizedData.sanitizationInfo.violationsFound > 0) {
        await securityEventLogger.logSecurityEvent({
          type: 'content_sanitization',
          severity: 'warning',
          userId: user.uid,
          details: {
            violations: sanitizedData.sanitizationInfo.violations,
            contentType: 'pet_card_upload',
            originalContent: formData,
            sanitizedContent: sanitizedData
          }
        });
      }

      // Prepare request data with sanitized content
      const requestData = {
        imageData: base64Data,
        ...sanitizedData,
        userId: user.uid
      };

      setGenerationProgress(40);

      // Call the generate API
      const apiStartTime = Date.now();
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(requestData)
      });

      const apiEndTime = Date.now();
      const apiResponseTime = apiEndTime - apiStartTime;

      setGenerationProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        
        // Track API call failure
        trackAPICall('/api/generate', 'POST', apiResponseTime, false, response.status);
        
        throw new Error(errorData.message || 'Failed to generate card');
      }

      const result = await response.json();
      setGenerationProgress(100);

      // Track API call success
      trackAPICall('/api/generate', 'POST', apiResponseTime, true, response.status);

      if (result.success) {
        const endTime = Date.now();
        const totalGenerationTime = endTime - startTime;
        
        // Track successful card generation
        trackCardGeneration({
          cardId: result.card.id || 'unknown',
          petType: sanitizedData.petType || 'unknown',
          rarity: result.card.rarity || 'common',
          generationTime: totalGenerationTime,
          success: true
        });
        
        setGeneratedCard(result.card);
        // Clear form after successful generation
        clearFile();
        setPetName('');
        setPetType('');
        setDescription('');
        setCustomTags('');
        setSecurityViolations([]);
      } else {
        throw new Error(result.message || 'Card generation failed');
      }

    } catch (error) {
      console.error('Error generating card:', error);
      
      const endTime = Date.now();
      const totalGenerationTime = endTime - startTime;
      
      // Track failed card generation
      trackCardGeneration({
        cardId: 'failed',
        petType: petType || 'unknown',
        rarity: 'unknown',
        generationTime: totalGenerationTime,
        success: false,
        errorMessage: error.message
      });
      
      setError(error.message || 'An unexpected error occurred while generating the card');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Download generated card
  const handleDownloadCard = async () => {
    if (!generatedCard?.images?.processed) return;

    try {
      const response = await fetch(generatedCard.images.processed);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generatedCard.petName}-card.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading card:', error);
      setError('Failed to download card');
    }
  };

  // Share generated card
  const handleShareCard = async () => {
    if (!generatedCard) return;

    const shareData = {
      title: `Check out my ${generatedCard.rarity} ${generatedCard.petName} card!`,
      text: `I just generated an awesome ${generatedCard.rarity} trading card for my pet ${generatedCard.petName}!`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.title} ${shareData.url}`);
        // You could show a toast notification here
        alert('Card link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing card:', error);
    }
  };

  // Generate another card
  const handleGenerateAnother = () => {
    setGeneratedCard(null);
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              🐾 Pet Cards
            </button>
            <div className="text-sm text-gray-600">
              Welcome, {user?.displayName || user?.email}
            </div>
          </div>
        </div>
      </header>

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Generate Pet Trading Card
            </h1>
            <p className="text-lg text-gray-600">
              Transform your pet photos into unique collectible trading cards
            </p>
          </div>

        {!generatedCard ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Pet Photo
                </CardTitle>
                <CardDescription>
                  Select or drag and drop a photo of your pet to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload Area */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : selectedFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={clearFile}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">
                          Drag and drop your image here, or{' '}
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-500 font-medium"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            browse
                          </button>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports JPEG, PNG (max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {/* Pet Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="petName">Pet Name</Label>
                    <SanitizedInput
                      value={petName}
                      onChange={setPetName}
                      placeholder="Enter your pet's name"
                      maxLength={50}
                      contentType="pet_card_metadata"
                      onSecurityViolation={(violation) => {
                        setSecurityViolations(prev => [...prev, violation]);
                        // Log security violation for pet name
                        securityEventLogger.logSecurityEvent({
                          type: 'input_sanitization_violation',
                          severity: 'info',
                          userId: user?.uid,
                          details: {
                            field: 'petName',
                            violation,
                            timestamp: new Date()
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="petType">Pet Type</Label>
                    <SanitizedInput
                      value={petType}
                      onChange={setPetType}
                      placeholder="e.g., Dog, Cat, Bird, etc."
                      maxLength={30}
                      contentType="pet_card_metadata"
                      onSecurityViolation={(violation) => {
                        setSecurityViolations(prev => [...prev, violation]);
                        // Log security violation for pet type
                        securityEventLogger.logSecurityEvent({
                          type: 'input_sanitization_violation',
                          severity: 'info',
                          userId: user?.uid,
                          details: {
                            field: 'petType',
                            violation,
                            timestamp: new Date()
                          }
                        });
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <SanitizedTextArea
                      value={description}
                      onChange={setDescription}
                      placeholder="Add a description for your pet card..."
                      maxLength={200}
                      rows={3}
                      contentType="pet_card_metadata"
                      onSecurityViolation={(violation) => {
                        setSecurityViolations(prev => [...prev, violation]);
                        // Log security violation for description
                        securityEventLogger.logSecurityEvent({
                          type: 'input_sanitization_violation',
                          severity: 'info',
                          userId: user?.uid,
                          details: {
                            field: 'description',
                            violation,
                            timestamp: new Date()
                          }
                        });
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customTags">Custom Tags (Optional)</Label>
                    <SanitizedInput
                      value={customTags}
                      onChange={setCustomTags}
                      placeholder="e.g., playful, energetic, friendly (comma-separated)"
                      maxLength={100}
                      contentType="pet_card_metadata"
                      onSecurityViolation={(violation) => {
                        setSecurityViolations(prev => [...prev, violation]);
                        // Log security violation for custom tags
                        securityEventLogger.logSecurityEvent({
                          type: 'input_sanitization_violation',
                          severity: 'info',
                          userId: user?.uid,
                          details: {
                            field: 'customTags',
                            violation,
                            timestamp: new Date()
                          }
                        });
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separate multiple tags with commas
                    </p>
                  </div>
                </div>

                {/* Security Violations Alert */}
                {securityViolations.length > 0 && (
                  <div className="space-y-2">
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Content has been automatically sanitized for security. 
                        {securityViolations.length} potential issue{securityViolations.length > 1 ? 's' : ''} detected and resolved.
                      </AlertDescription>
                    </Alert>
                    <div className="flex justify-center">
                      <SecurityStatusIndicator
                        contentType="pet_card_metadata"
                        sanitizationInfo={{
                          violationsFound: securityViolations.length,
                          violations: securityViolations.map(v => ({
                            type: v.type,
                            severity: 'medium',
                            description: `${v.type} violation detected and sanitized`
                          })),
                          lastSanitized: new Date(),
                          sanitizationVersion: '1.0.0'
                        }}
                        size="md"
                        showDetails={true}
                      />
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateCard}
                  disabled={!selectedFile || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Card...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Trading Card
                    </>
                  )}
                </Button>

                {/* Progress Bar */}
                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-gray-600 text-center">
                      {generationProgress < 30 && 'Processing image...'}
                      {generationProgress >= 30 && generationProgress < 70 && 'Generating card...'}
                      {generationProgress >= 70 && 'Finalizing...'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions/Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Tips for Best Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Clear, well-lit photos</p>
                      <p className="text-sm text-gray-600">
                        Use good lighting and avoid blurry or dark images
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Focus on your pet</p>
                      <p className="text-sm text-gray-600">
                        Make sure your pet is the main subject of the photo
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">High resolution</p>
                      <p className="text-sm text-gray-600">
                        Higher quality images produce better trading cards
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Unique poses</p>
                      <p className="text-sm text-gray-600">
                        Action shots and personality-filled poses work great
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Card Features</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Rarity</Badge>
                      <span className="text-gray-600">Auto-assigned</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Stats</Badge>
                      <span className="text-gray-600">AI-generated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Evolution</Badge>
                      <span className="text-gray-600">3 stages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Sharing</Badge>
                      <span className="text-gray-600">Social ready</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Generated Card Display */
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Card Generated Successfully!</span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="max-w-sm">
                <ImageCard
                  card={generatedCard}
                  onClick={() => {}}
                  showStats={true}
                />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={handleDownloadCard} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleShareCard} variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button onClick={handleGenerateAnother}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Another
              </Button>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Your {generatedCard.rarity} Card</CardTitle>
                <CardDescription>
                  {generatedCard.petName} • {generatedCard.petType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(generatedCard.stats || {}).map(([stat, value]) => (
                    <div key={stat} className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{value}</div>
                      <div className="text-sm text-gray-600 capitalize">{stat}</div>
                    </div>
                  ))}
                </div>
                
                {generatedCard.evolution && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Evolution Stage</span>
                      <Badge variant="outline">
                        Stage {generatedCard.evolution.stage} of {generatedCard.evolution.maxStage}
                      </Badge>
                    </div>
                    {generatedCard.evolution.canEvolve && (
                      <p className="text-sm text-gray-600 mt-1">
                        This card can be evolved! Visit the Evolution page to upgrade it.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
