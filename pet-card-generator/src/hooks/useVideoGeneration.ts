import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/models/Card';
import { 
  videoGenerationService, 
  VideoGenerationJob, 
  VideoResolution, 
  VideoQuality, 
  VideoStyle 
} from '@/services/videoGenerationService';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface UseVideoGenerationReturn {
  // State
  isGenerating: boolean;
  error: string | null;
  jobs: VideoGenerationJob[];
  queueStatus: {
    queueLength: number;
    processing: number;
    maxConcurrent: number;
    totalJobs: number;
  };
  
  // Actions
  generateVideo: (
    card: Card,
    options?: {
      resolution?: VideoResolution;
      quality?: VideoQuality;
      duration?: number;
      style?: VideoStyle;
    }
  ) => Promise<VideoGenerationJob | null>;
  getJob: (jobId: string) => VideoGenerationJob | null;
  cancelJob: (jobId: string) => boolean;
  refreshJobs: () => void;
  clearError: () => void;
  
  // Utilities
  estimateTime: (resolution: VideoResolution, quality: VideoQuality) => number;
  getPricing: () => any;
  hasVideoAccess: boolean;
}

export const useVideoGeneration = (): UseVideoGenerationReturn => {
  const { user } = useAuth();
  const { hasFeatureAccess } = useSubscription();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<VideoGenerationJob[]>([]);
  const [queueStatus, setQueueStatus] = useState({
    queueLength: 0,
    processing: 0,
    maxConcurrent: 3,
    totalJobs: 0
  });

  const hasVideoAccess = hasFeatureAccess('videoGeneration');

  // Load user jobs
  const loadJobs = useCallback(() => {
    if (!user) {
      setJobs([]);
      return;
    }

    const userJobs = videoGenerationService.getUserJobs(user.id);
    setJobs(userJobs);
    
    const status = videoGenerationService.getQueueStatus();
    setQueueStatus(status);
  }, [user]);

  // Auto-refresh jobs every 5 seconds when there are active jobs
  useEffect(() => {
    loadJobs();
    
    const hasActiveJobs = jobs.some(job => 
      job.status === 'queued' || job.status === 'processing'
    );
    
    if (hasActiveJobs) {
      const interval = setInterval(loadJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [loadJobs, jobs]);

  // Generate video
  const generateVideo = useCallback(async (
    card: Card,
    options: {
      resolution?: VideoResolution;
      quality?: VideoQuality;
      duration?: number;
      style?: VideoStyle;
    } = {}
  ): Promise<VideoGenerationJob | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    if (!hasVideoAccess) {
      setError('Video generation requires Pro subscription');
      return null;
    }

    try {
      setIsGenerating(true);
      setError(null);
      
      const job = await videoGenerationService.generateVideo(card, user.id, options);
      
      // Refresh jobs to include the new one
      loadJobs();
      
      return job;
    } catch (err) {
      console.error('Error generating video:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, hasVideoAccess, loadJobs]);

  // Get specific job
  const getJob = useCallback((jobId: string): VideoGenerationJob | null => {
    return videoGenerationService.getJob(jobId);
  }, []);

  // Cancel job
  const cancelJob = useCallback((jobId: string): boolean => {
    const success = videoGenerationService.cancelJob(jobId);
    if (success) {
      loadJobs(); // Refresh jobs after cancellation
    }
    return success;
  }, [loadJobs]);

  // Refresh jobs manually
  const refreshJobs = useCallback(() => {
    loadJobs();
  }, [loadJobs]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Estimate generation time
  const estimateTime = useCallback((resolution: VideoResolution, quality: VideoQuality): number => {
    return videoGenerationService.estimateGenerationTime(resolution, quality);
  }, []);

  // Get pricing information
  const getPricing = useCallback(() => {
    return videoGenerationService.getVideoPricing();
  }, []);

  return {
    // State
    isGenerating,
    error,
    jobs,
    queueStatus,
    
    // Actions
    generateVideo,
    getJob,
    cancelJob,
    refreshJobs,
    clearError,
    
    // Utilities
    estimateTime,
    getPricing,
    hasVideoAccess
  };
};