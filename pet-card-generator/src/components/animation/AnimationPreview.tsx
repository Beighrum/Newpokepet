import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Settings,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { useSimpleAnimation } from '@/hooks/useSimpleAnimation';
import { AnimationConfig } from '@/services/simpleAnimationService';

interface AnimationPreviewProps {
  imageUrl: string;
  onAnimationCreated?: (animationId: string) => void;
  className?: string;
}

const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  imageUrl,
  onAnimationCreated,
  className = ''
}) => {
  const {
    currentAnimation,
    isCreating,
    error,
    createCSSAnimation,
    createFrameAnimation,
    createBoomerangFallback,
    getAnimationCSS,
    isUnderSizeLimit,
    clearError,
    supportedTypes,
    getDefaultConfig,
    formatFileSize
  } = useSimpleAnimation();

  const [config, setConfig] = useState<AnimationConfig>(getDefaultConfig('pulse'));
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Update animation when config changes
  useEffect(() => {
    if (animationEnabled && imageUrl) {
      createCSSAnimation(config);
    }
  }, [config, animationEnabled, imageUrl, createCSSAnimation]);

  // Inject CSS when animation is created
  useEffect(() => {
    if (currentAnimation && currentAnimation.cssAnimation) {
      // Remove previous style
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
      }

      // Add new style
      const style = document.createElement('style');
      style.textContent = currentAnimation.cssAnimation;
      document.head.appendChild(style);
      styleRef.current = style;

      onAnimationCreated?.(currentAnimation.id);
    }

    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, [currentAnimation, onAnimationCreated]);

  // Handle animation type change
  const handleTypeChange = (type: AnimationConfig['type']) => {
    const newConfig = getDefaultConfig(type);
    setConfig(newConfig);
  };

  // Handle duration change
  const handleDurationChange = (duration: number[]) => {
    setConfig(prev => ({ ...prev, duration: duration[0] }));
  };

  // Handle frames change
  const handleFramesChange = (frames: number[]) => {
    setConfig(prev => ({ ...prev, frames: frames[0] }));
  };

  // Toggle animation playback
  const togglePlayback = () => {
    if (imageRef.current) {
      if (isPlaying) {
        imageRef.current.style.animationPlayState = 'paused';
      } else {
        imageRef.current.style.animationPlayState = 'running';
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Reset animation
  const resetAnimation = () => {
    if (imageRef.current) {
      imageRef.current.style.animation = 'none';
      setTimeout(() => {
        if (imageRef.current && currentAnimation?.cssAnimation) {
          imageRef.current.className = 'pet-card-animated';
        }
      }, 10);
    }
  };

  // Create fallback animation
  const handleCreateFallback = () => {
    createBoomerangFallback(imageUrl);
  };

  // Download animation (placeholder)
  const handleDownload = () => {
    if (currentAnimation) {
      // In a real implementation, this would download the actual GIF
      console.log('Download animation:', currentAnimation.id);
    }
  };

  const isUnderLimit = currentAnimation ? isUnderSizeLimit(currentAnimation) : true;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Eye className="w-5 h-5 mr-2 text-blue-500" />
              Animation Preview
            </span>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="animation-toggle" className="text-sm">
                Animation
              </Label>
              <Switch
                id="animation-toggle"
                checked={animationEnabled}
                onCheckedChange={setAnimationEnabled}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Pet card preview"
                className={`w-64 h-64 object-cover rounded-lg shadow-lg ${
                  animationEnabled && currentAnimation ? 'pet-card-animated' : ''
                }`}
                style={{
                  animationPlayState: isPlaying ? 'running' : 'paused'
                }}
              />
              
              {!animationEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <EyeOff className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-2">
            <Button
              onClick={togglePlayback}
              variant="outline"
              size="sm"
              disabled={!animationEnabled || !currentAnimation}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </>
              )}
            </Button>
            
            <Button
              onClick={resetAnimation}
              variant="outline"
              size="sm"
              disabled={!animationEnabled || !currentAnimation}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>

          {/* Animation Info */}
          {currentAnimation && (
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
              <div>
                <span className="font-medium">Type:</span> {config.type}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {config.duration}ms
              </div>
              <div>
                <span className="font-medium">Frames:</span> {config.frames}
              </div>
              <div>
                <span className="font-medium">Size:</span> 
                <span className={isUnderLimit ? 'text-green-600' : 'text-red-600'}>
                  {formatFileSize(currentAnimation.fileSize || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
              <Button
                onClick={clearError}
                variant="ghost"
                size="sm"
                className="mt-2"
              >
                Clear Error
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-500" />
              Animation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Animation Type */}
            <div className="space-y-2">
              <Label>Animation Type</Label>
              <Select
                value={config.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="capitalize">{type}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration: {config.duration}ms</Label>
              <Slider
                value={[config.duration]}
                onValueChange={handleDurationChange}
                min={500}
                max={5000}
                step={100}
                className="w-full"
              />
            </div>

            {/* Frames */}
            <div className="space-y-2">
              <Label>Frames: {config.frames}</Label>
              <Slider
                value={[config.frames]}
                onValueChange={handleFramesChange}
                min={2}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="loop"
                  checked={config.loop}
                  onCheckedChange={(loop) => setConfig(prev => ({ ...prev, loop }))}
                />
                <Label htmlFor="loop">Loop</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="reverse"
                  checked={config.reverse}
                  onCheckedChange={(reverse) => setConfig(prev => ({ ...prev, reverse }))}
                />
                <Label htmlFor="reverse">Reverse</Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button
                onClick={handleCreateFallback}
                variant="outline"
                size="sm"
                disabled={isCreating}
              >
                <Zap className="w-4 h-4 mr-2" />
                Create Fallback
              </Button>
              
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                disabled={!currentAnimation || isCreating}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnimationPreview;