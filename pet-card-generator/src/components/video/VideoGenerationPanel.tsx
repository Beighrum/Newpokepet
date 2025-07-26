import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  Play, 
  Settings, 
  Clock, 
  DollarSign,
  Sparkles,
  AlertTriangle,
  Loader2,
  Crown
} from 'lucide-react';
import { Card as CardModel } from '@/models/Card';
import { VideoResolution, VideoQuality, VideoStyle } from '@/services/videoGenerationService';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import PremiumGate from '@/components/premium/PremiumGate';
import { cn } from '@/lib/utils';

interface VideoGenerationPanelProps {
  card: CardModel;
  onVideoGenerated?: (jobId: string) => void;
  className?: string;
}

const RESOLUTION_OPTIONS: { value: VideoResolution; label: string; description: string }[] = [
  { value: '480p', label: '480p', description: 'Standard quality, fast generation' },
  { value: '720p', label: '720p HD', description: 'High definition, balanced quality' },
  { value: '1080p', label: '1080p Full HD', description: 'Full HD, premium quality' },
  { value: '4K', label: '4K Ultra HD', description: 'Ultra high definition, best quality' }
];

const QUALITY_OPTIONS: { value: VideoQuality; label: string; description: string }[] = [
  { value: 'draft', label: 'Draft', description: 'Quick preview quality' },
  { value: 'standard', label: 'Standard', description: 'Good balance of quality and speed' },
  { value: 'high', label: 'High', description: 'High quality output' },
  { value: 'premium', label: 'Premium', description: 'Maximum quality and detail' }
];

const STYLE_OPTIONS: { value: VideoStyle; label: string; description: string; icon: string }[] = [
  { value: 'natural', label: 'Natural', description: 'Realistic movement and lighting', icon: '🌿' },
  { value: 'cinematic', label: 'Cinematic', description: 'Film-like quality with dramatic effects', icon: '🎬' },
  { value: 'animated', label: 'Animated', description: 'Cartoon-style bouncy movement', icon: '🎨' },
  { value: 'artistic', label: 'Artistic', description: 'Creative effects and transitions', icon: '✨' }
];

const VideoGenerationPanel: React.FC<VideoGenerationPanelProps> = ({
  card,
  onVideoGenerated,
  className = ''
}) => {
  const {
    isGenerating,
    error,
    generateVideo,
    estimateTime,
    getPricing,
    hasVideoAccess,
    clearError
  } = useVideoGeneration();

  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [quality, setQuality] = useState<VideoQuality>('standard');
  const [duration, setDuration] = useState([3]);
  const [style, setStyle] = useState<VideoStyle>('natural');

  const pricing = getPricing();
  const estimatedTime = estimateTime(resolution, quality);
  const estimatedCost = pricing[resolution]?.[quality] || 0;

  const handleGenerate = async () => {
    const job = await generateVideo(card, {
      resolution,
      quality,
      duration: duration[0],
      style
    });

    if (job) {
      onVideoGenerated?.(job.id);
    }
  };

  const videoGenerationContent = (
    <div className={cn('space-y-6', className)}>
      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-2 h-auto p-0 text-red-600 hover:text-red-700"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="w-5 h-5 mr-2 text-purple-600" />
            Video Generation
          </CardTitle>
          <CardDescription>
            Transform {card.petName} into a high-quality video animation
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Card Preview */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
              <img
                src={card.image.thumbnailUrl}
                alt={card.petName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{card.petName}</h3>
              <p className="text-sm text-gray-600 capitalize">{card.petType}</p>
              <div className="flex items-center mt-1">
                <Badge variant="outline" className="text-xs">
                  {card.rarity}
                </Badge>
              </div>
            </div>
          </div>

          {/* Video Settings */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Resolution */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Resolution</Label>
              <Select value={resolution} onValueChange={(value: VideoResolution) => setResolution(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quality */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quality</Label>
              <Select value={quality} onValueChange={(value: VideoQuality) => setQuality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Duration</Label>
              <span className="text-sm text-gray-600">{duration[0]} seconds</span>
            </div>
            <Slider
              value={duration}
              onValueChange={setDuration}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1s</span>
              <span>5s</span>
              <span>10s</span>
            </div>
          </div>

          {/* Style */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Animation Style</Label>
            <div className="grid grid-cols-2 gap-3">
              {STYLE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setStyle(option.value)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-left',
                    style === option.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generation Info */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-blue-800">
                  Est. Time: {Math.ceil(estimatedTime / 60)} min
                </span>
              </div>
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-blue-800">
                  Cost: ${estimatedCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Generate Video
              </>
            )}
          </Button>

          {/* Pro Features Notice */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start">
              <Crown className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">Pro Feature</h4>
                <p className="text-sm text-yellow-700">
                  Video generation is available exclusively for Pro subscribers. 
                  Upgrade to unlock unlimited video creation with premium quality options.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Wrap in premium gate if user doesn't have access
  if (!hasVideoAccess) {
    return (
      <PremiumGate
        feature="video_generation"
        requiredTier="pro"
        title="Video Generation"
        description="Create stunning video animations from your pet cards"
        className={className}
      >
        {videoGenerationContent}
      </PremiumGate>
    );
  }

  return videoGenerationContent;
};

export default VideoGenerationPanel;