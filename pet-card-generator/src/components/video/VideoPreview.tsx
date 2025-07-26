import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Download,
  Share2,
  RotateCcw,
  Settings,
  Loader2
} from 'lucide-react';
import { VideoGenerationResult } from '@/services/videoGenerationService';
import { cn } from '@/lib/utils';

interface VideoPreviewProps {
  video: VideoGenerationResult;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
  onDownload?: () => void;
  onShare?: () => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  video,
  autoPlay = false,
  controls = true,
  className = '',
  onDownload,
  onShare
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([100]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update video element when props change
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.volume = volume[0] / 100;
    videoElement.muted = isMuted;

    if (autoPlay && !isPlaying) {
      handlePlay();
    }
  }, [volume, isMuted, autoPlay]);

  // Handle video events
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load video');
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('loadstart', handleLoadStart);

    return () => {
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlay = async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    try {
      await videoElement.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Error playing video:', err);
      setError('Failed to play video');
    }
  };

  const handlePause = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.pause();
    setIsPlaying(false);
  };

  const handleSeek = (newTime: number[]) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.currentTime = newTime[0];
    setCurrentTime(newTime[0]);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    setVolume(newVolume);
    videoElement.volume = newVolume[0] / 100;
    
    if (newVolume[0] === 0) {
      setIsMuted(true);
      videoElement.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      videoElement.muted = false;
    }
  };

  const handleMuteToggle = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoElement.muted = newMuted;
  };

  const handleFullscreen = async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    try {
      if (!document.fullscreenElement) {
        await videoElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleRestart = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      handlePlay();
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Play className="w-5 h-5 mr-2 text-purple-600" />
              Video Preview
            </CardTitle>
            <CardDescription>
              {video.resolution} • {video.quality} • {formatFileSize(video.fileSize)}
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {video.status}
            </Badge>
            {onShare && (
              <Button variant="ghost" size="sm" onClick={onShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            )}
            {onDownload && (
              <Button variant="ghost" size="sm" onClick={onDownload}>
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Player */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}
          
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
              <div className="text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <div>{error}</div>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={video.videoUrl}
              poster={video.thumbnailUrl}
              className="w-full h-full object-contain"
              playsInline
              preload="metadata"
            />
          )}

          {/* Play/Pause Overlay */}
          {!isLoading && !error && (
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer group"
              onClick={isPlaying ? handlePause : handlePlay}
            >
              <div className={cn(
                'bg-black/50 rounded-full p-4 transition-opacity',
                isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
              )}>
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {controls && !error && (
          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="space-y-1">
              <Slider
                value={[currentTime]}
                onValueChange={handleSeek}
                min={0}
                max={duration || 100}
                step={0.1}
                className="w-full"
                disabled={isLoading}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isPlaying ? handlePause : handlePlay}
                  disabled={isLoading}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestart}
                  disabled={isLoading}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                {/* Volume Control */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMuteToggle}
                    disabled={isLoading}
                  >
                    {isMuted || volume[0] === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <div className="w-20">
                    <Slider
                      value={volume}
                      onValueChange={handleVolumeChange}
                      min={0}
                      max={100}
                      step={1}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreen}
                  disabled={isLoading}
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Video Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Resolution:</span>
              <span className="ml-2 font-medium">{video.resolution}</span>
            </div>
            <div>
              <span className="text-gray-600">Quality:</span>
              <span className="ml-2 font-medium capitalize">{video.quality}</span>
            </div>
            <div>
              <span className="text-gray-600">Duration:</span>
              <span className="ml-2 font-medium">{video.duration}s</span>
            </div>
            <div>
              <span className="text-gray-600">Size:</span>
              <span className="ml-2 font-medium">{formatFileSize(video.fileSize)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPreview;