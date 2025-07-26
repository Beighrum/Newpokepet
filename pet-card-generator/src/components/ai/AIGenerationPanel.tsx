import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wand2, 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Settings
} from 'lucide-react';
import { useAIGeneration } from '@/hooks/useAIGeneration';
import { GenerationRequest } from '@/services/aiImageGeneration';

interface AIGenerationPanelProps {
  onGenerationComplete?: (imageUrl: string, metadata: any) => void;
  onGenerationStart?: () => void;
  className?: string;
}

const AIGenerationPanel: React.FC<AIGenerationPanelProps> = ({
  onGenerationComplete,
  onGenerationStart,
  className = ''
}) => {
  const {
    isGenerating,
    currentGeneration,
    progress,
    error,
    availableStyles,
    generateImage,
    cancelGeneration,
    clearError,
    progressPercentage,
    progressMessage
  } = useAIGeneration();

  const [formData, setFormData] = useState({
    imageFile: null as File | null,
    imageUrl: '',
    style: 'realistic',
    petType: '',
    petName: '',
    customPrompt: '',
    seed: undefined as number | undefined
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle form submission
  const handleGenerate = useCallback(async () => {
    if (!formData.imageFile && !formData.imageUrl) {
      return;
    }

    clearError();
    onGenerationStart?.();

    // For demo purposes, we'll use a placeholder URL if no file is uploaded
    // In a real implementation, you'd upload the file to your server first
    const imageUrl = formData.imageUrl || 'https://example.com/placeholder-pet.jpg';

    const request: GenerationRequest = {
      imageUrl,
      style: formData.style,
      petType: formData.petType || 'pet',
      petName: formData.petName || 'Pet',
      customPrompt: formData.customPrompt || undefined,
      seed: formData.seed
    };

    const result = await generateImage(request);
    
    if (result && result.status === 'completed' && result.imageUrl) {
      onGenerationComplete?.(result.imageUrl, result.metadata);
    }
  }, [formData, generateImage, clearError, onGenerationStart, onGenerationComplete]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    await cancelGeneration();
  }, [cancelGeneration]);

  // Clear uploaded image
  const clearImage = useCallback(() => {
    setFormData(prev => ({ ...prev, imageFile: null, imageUrl: '' }));
    setImagePreview(null);
  }, []);

  const selectedStyle = availableStyles.find(s => s.id === formData.style);
  const canGenerate = (formData.imageFile || formData.imageUrl) && !isGenerating;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center\">
            <Wand2 className=\"w-5 h-5 mr-2 text-purple-500\" />
            AI Pet Card Generation
          </CardTitle>
        </CardHeader>
        <CardContent className=\"space-y-6\">
          {/* Image Upload */}
          <div className=\"space-y-3\">
            <Label htmlFor=\"image-upload\">Pet Photo</Label>
            
            {!imagePreview ? (
              <div className=\"border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors\">
                <input
                  id=\"image-upload\"
                  type=\"file\"
                  accept=\"image/*\"
                  onChange={handleFileUpload}
                  className=\"hidden\"
                  disabled={isGenerating}
                />
                <label
                  htmlFor=\"image-upload\"
                  className=\"cursor-pointer flex flex-col items-center space-y-2\"
                >
                  <Upload className=\"w-8 h-8 text-gray-400\" />
                  <span className=\"text-sm text-gray-600\">
                    Click to upload or drag and drop
                  </span>
                  <span className=\"text-xs text-gray-500\">
                    PNG, JPG up to 10MB
                  </span>
                </label>
              </div>
            ) : (
              <div className=\"relative\">
                <img
                  src={imagePreview}
                  alt=\"Pet preview\"
                  className=\"w-full h-48 object-cover rounded-lg\"
                />
                <Button
                  onClick={clearImage}
                  size=\"sm\"
                  variant=\"destructive\"
                  className=\"absolute top-2 right-2\"
                  disabled={isGenerating}
                >
                  <X className=\"w-4 h-4\" />
                </Button>
              </div>
            )}

            {/* Alternative URL input */}
            <div className=\"text-center text-sm text-gray-500\">
              or
            </div>
            <div>
              <Label htmlFor=\"image-url\">Image URL</Label>
              <Input
                id=\"image-url\"
                type=\"url\"
                placeholder=\"https://example.com/pet-photo.jpg\"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                disabled={isGenerating || !!formData.imageFile}
              />
            </div>
          </div>

          {/* Style Selection */}
          <div className=\"space-y-3\">
            <Label>Generation Style</Label>
            <Select
              value={formData.style}
              onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStyles.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    <div className=\"flex items-center space-x-2\">
                      <span>{style.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedStyle && (
              <p className=\"text-sm text-gray-600\">{selectedStyle.description}</p>
            )}
          </div>

          {/* Pet Details */}
          <div className=\"grid grid-cols-2 gap-4\">
            <div>
              <Label htmlFor=\"pet-type\">Pet Type</Label>
              <Input
                id=\"pet-type\"
                placeholder=\"e.g., dog, cat, rabbit\"
                value={formData.petType}
                onChange={(e) => setFormData(prev => ({ ...prev, petType: e.target.value }))}
                disabled={isGenerating}
              />
            </div>
            <div>
              <Label htmlFor=\"pet-name\">Pet Name</Label>
              <Input
                id=\"pet-name\"
                placeholder=\"e.g., Buddy, Luna\"
                value={formData.petName}
                onChange={(e) => setFormData(prev => ({ ...prev, petName: e.target.value }))}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <Button
              type=\"button\"
              variant=\"ghost\"
              size=\"sm\"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className=\"flex items-center space-x-2\"
            >
              <Settings className=\"w-4 h-4\" />
              <span>Advanced Options</span>
            </Button>

            {showAdvanced && (
              <div className=\"mt-4 space-y-4 p-4 border rounded-lg bg-gray-50\">
                <div>
                  <Label htmlFor=\"custom-prompt\">Custom Prompt (Optional)</Label>
                  <Textarea
                    id=\"custom-prompt\"
                    placeholder=\"Override the default prompt with your own...\"
                    value={formData.customPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, customPrompt: e.target.value }))}
                    disabled={isGenerating}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor=\"seed\">Seed (Optional)</Label>
                  <Input
                    id=\"seed\"
                    type=\"number\"
                    placeholder=\"Random seed for reproducible results\"
                    value={formData.seed || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      seed: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    disabled={isGenerating}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant=\"destructive\">
              <AlertCircle className=\"h-4 w-4\" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className=\"space-y-3\">
              <div className=\"flex items-center justify-between\">
                <span className=\"text-sm font-medium\">Generating...</span>
                <span className=\"text-sm text-gray-500\">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className=\"w-full\" />
              <p className=\"text-sm text-gray-600\">{progressMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className=\"flex space-x-3\">
            {!isGenerating ? (
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className=\"flex-1\"
                size=\"lg\"
              >
                <Sparkles className=\"w-4 h-4 mr-2\" />
                Generate Pet Card
              </Button>
            ) : (
              <Button
                onClick={handleCancel}
                variant=\"destructive\"
                className=\"flex-1\"
                size=\"lg\"
              >
                <X className=\"w-4 h-4 mr-2\" />
                Cancel Generation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Result */}
      {currentGeneration && currentGeneration.status === 'completed' && currentGeneration.imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center\">
              <CheckCircle className=\"w-5 h-5 mr-2 text-green-500\" />
              Generation Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"space-y-4\">
              <img
                src={currentGeneration.imageUrl}
                alt=\"Generated pet card\"
                className=\"w-full rounded-lg shadow-lg\"
              />
              
              <div className=\"grid grid-cols-2 gap-4 text-sm\">
                <div>
                  <span className=\"font-medium\">Style:</span> {currentGeneration.metadata?.style}
                </div>
                <div>
                  <span className=\"font-medium\">Pet:</span> {currentGeneration.metadata?.petName}
                </div>
              </div>

              <div className=\"flex space-x-2\">
                <Button
                  onClick={() => {
                    if (currentGeneration.imageUrl) {
                      const link = document.createElement('a');
                      link.href = currentGeneration.imageUrl;
                      link.download = `pet-card-${Date.now()}.png`;
                      link.click();
                    }
                  }}
                  variant=\"outline\"
                  size=\"sm\"
                >
                  <ImageIcon className=\"w-4 h-4 mr-2\" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIGenerationPanel;