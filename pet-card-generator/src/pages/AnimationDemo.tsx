import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  Download,
  FileImage,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import AnimationPreview from '@/components/animation/AnimationPreview';
import { useSimpleAnimation } from '@/hooks/useSimpleAnimation';

const AnimationDemo: React.FC = () => {
  const {
    currentAnimation,
    isCreating,
    error,
    history,
    createCSSAnimation,
    createBoomerangFallback,
    clearError,
    clearHistory,
    supportedTypes,
    getDefaultConfig,
    formatFileSize
  } = useSimpleAnimation();

  const [selectedImage, setSelectedImage] = useState<string>('/api/placeholder/400/400');
  const [selectedType, setSelectedType] = useState<string>('pulse');

  // Sample pet images for demo
  const sampleImages = [
    '/api/placeholder/400/400',
    '/api/placeholder/400/401',
    '/api/placeholder/400/402',
    '/api/placeholder/400/403'
  ];

  // Handle quick animation creation
  const handleQuickAnimation = (type: string) => {
    const config = getDefaultConfig(type as any);
    createCSSAnimation(config);
    setSelectedType(type);
  };

  // Handle fallback creation
  const handleCreateFallback = () => {
    createBoomerangFallback(selectedImage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎬 Pet Card Animation System Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Create engaging animations for pet cards with CSS-based effects, 
            fallback mechanisms, and file size optimization. Toggle animations 
            on/off and preview before finalizing your cards.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {supportedTypes.length}
              </div>
              <div className="text-sm text-gray-600">Animation Types</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {history.length}
              </div>
              <div className="text-sm text-gray-600">Created Animations</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {currentAnimation ? formatFileSize(currentAnimation.fileSize || 0) : '0 B'}
              </div>
              <div className="text-sm text-gray-600">Current Size</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                2MB
              </div>
              <div className="text-sm text-gray-600">Size Limit</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Animation Preview */}
          <div className="space-y-6">
            <AnimationPreview
              imageUrl={selectedImage}
              onAnimationCreated={(id) => console.log('Animation created:', id)}
            />

            {/* Image Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileImage className="w-5 h-5 mr-2 text-gray-500" />
                  Sample Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {sampleImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(image)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === image 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Sample pet ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      {selectedImage === image && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls & Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                  Quick Animations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {supportedTypes.map((type) => (
                    <Button
                      key={type}
                      onClick={() => handleQuickAnimation(type)}
                      variant={selectedType === type ? 'default' : 'outline'}
                      size="sm"
                      disabled={isCreating}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleCreateFallback}
                    variant="secondary"
                    size="sm"
                    disabled={isCreating}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Create Boomerang Fallback
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Animation History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gray-500" />
                    Animation History
                  </span>
                  {history.length > 0 && (
                    <Button
                      onClick={clearHistory}
                      variant="ghost"
                      size="sm"
                    >
                      Clear
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No animations created yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {history.map((animation, index) => (
                      <div 
                        key={animation.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={
                                animation.status === 'completed' ? 'default' :
                                animation.status === 'failed' ? 'destructive' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {animation.status}
                            </Badge>
                            <span className="text-sm font-medium capitalize">
                              {animation.config.type}
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-500 mt-1">
                            {animation.config.duration}ms • {animation.config.frames} frames
                            {animation.fileSize && (
                              <> • {formatFileSize(animation.fileSize)}</>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          {animation.type === 'css' && (
                            <Badge variant="outline" className="text-xs">CSS</Badge>
                          )}
                          {animation.type === 'gif' && (
                            <Badge variant="outline" className="text-xs">GIF</Badge>
                          )}
                          {animation.type === 'fallback' && (
                            <Badge variant="outline" className="text-xs">Fallback</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    onClick={clearError}
                    variant="ghost"
                    size="sm"
                  >
                    Clear
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Technical Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-500" />
                  Technical Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">✨ Animation Types</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Fade: Opacity transitions</li>
                      <li>• Zoom: Scale transformations</li>
                      <li>• Slide: Position movements</li>
                      <li>• Bounce: Vertical animations</li>
                      <li>• Pulse: Combined scale + opacity</li>
                      <li>• Boomerang: Flip effects</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">🎛️ Controls</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Play/Pause animations</li>
                      <li>• Toggle animations on/off</li>
                      <li>• Adjustable duration & frames</li>
                      <li>• Loop and reverse options</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">🛡️ Fallback System</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• 2-frame boomerang fallback</li>
                      <li>• File size optimization</li>
                      <li>• CSS-based animations</li>
                      <li>• Graceful degradation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationDemo;