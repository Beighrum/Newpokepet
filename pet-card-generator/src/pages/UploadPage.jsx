import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Wand2, 
  AlertCircle, 
  CheckCircle,
  Info
} from 'lucide-react';
import PhotoUpload from '@/components/upload/PhotoUpload';
import { SanitizedInput } from '@/components/sanitization/SanitizedInput';
import { SanitizedTextArea } from '@/components/sanitization/SanitizedTextArea';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('realistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const styles = [
    { id: 'realistic', name: 'Realistic', description: 'Photorealistic style' },
    { id: 'cartoon', name: 'Cartoon', description: 'Fun cartoon style' },
    { id: 'fantasy', name: 'Fantasy', description: 'Magical fantasy style' },
    { id: 'cyberpunk', name: 'Cyberpunk', description: 'Futuristic cyberpunk style' }
  ];

  const handleImageSelect = (file, croppedBlobData) => {
    setSelectedFile(file);
    setCroppedBlob(croppedBlobData);
    setError(null);
  };

  const handleUploadProgress = (progress) => {
    setUploadProgress(progress);
  };

  const handleUploadComplete = (url) => {
    setSuccess('Image uploaded successfully!');
    setUploadProgress(0);
  };

  const handleUploadError = (errorMessage) => {
    setError(errorMessage);
    setUploadProgress(0);
  };

  const handleGenerateCard = async () => {
    if (!selectedFile || !petName.trim()) {
      setError('Please upload an image and enter your pet\'s name');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Simulate card generation process
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadProgress(i);
      }

      setSuccess('Pet card generated successfully!');
      // Here you would typically navigate to the result page or show the generated card
      
    } catch (err) {
      setError('Failed to generate pet card. Please try again.');
    } finally {
      setIsGenerating(false);
      setUploadProgress(0);
    }
  };

  const canGenerate = selectedFile && petName.trim() && !isGenerating;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Your Pet Card
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload a photo of your pet and watch AI transform it into a stunning collectible card
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  Upload Pet Photo
                </CardTitle>
                <CardDescription>
                  Choose a clear, well-lit photo of your pet for the best results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhotoUpload
                  onImageSelect={handleImageSelect}
                  onUploadProgress={handleUploadProgress}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  maxFileSize={10}
                  acceptedFormats={['image/jpeg', 'image/png', 'image/webp']}
                  requireSquare={true}
                />
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tips for Best Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Use high-quality, well-lit photos</p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Ensure your pet is the main subject</p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Avoid blurry or dark images</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Images will be cropped to square format</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pet Details</CardTitle>
                <CardDescription>
                  Tell us about your pet to personalize the card
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="petName">Pet Name *</Label>
                  <SanitizedInput
                    id="petName"
                    placeholder="Enter your pet's name"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    maxLength={50}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="petType">Pet Type</Label>
                  <SanitizedInput
                    id="petType"
                    placeholder="e.g., Golden Retriever, Persian Cat, etc."
                    value={petType}
                    onChange={(e) => setPetType(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <SanitizedTextArea
                    id="description"
                    placeholder="Tell us about your pet's personality, favorite activities, or special traits..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    {description.length}/500 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Style Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Card Style</CardTitle>
                <CardDescription>
                  Choose the artistic style for your pet card
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {styles.map((styleOption) => (
                    <button
                      key={styleOption.id}
                      onClick={() => setStyle(styleOption.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        style === styleOption.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{styleOption.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {styleOption.description}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Generation Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wand2 className="w-5 h-5 mr-2 text-purple-600" />
                  Generate Card
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Generating your pet card...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerateCard}
                  disabled={!canGenerate}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Pet Card
                    </>
                  )}
                </Button>

                {!canGenerate && !isGenerating && (
                  <p className="text-sm text-gray-500 text-center">
                    {!selectedFile ? 'Upload an image to continue' : 'Enter your pet\'s name to continue'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;