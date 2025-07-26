import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  gifAnimationService, 
  AnimationRequest, 
  AnimationResult, 
  AnimationProgress,
  AnimationFrame,
  AnimationOptions
} from '@/services/gifAnimationService';

interface UseGifAnimationOptions {
  autoCleanup?: boolean;
  cleanupInterval?: number;
}

interface AnimationState {
  isCreating: boolean;
  currentAnimation: AnimationResult | null;
  progress: AnimationProgress | null;
  error: string | null;
  history: AnimationResult[];
}

export const useGifAnimation = (options: UseGifAnimationOptions = {}) => {
  const { autoCleanup = true, cleanupInterval = 300000 } = options; // 5 minutes default
  
  const [state, setState] = useState<AnimationState>({
    isCreating: false,
    currentAnimation: null,
    progress: null,
    error: null,
    history: []
  });

  const cleanupIntervalRef = useRef<NodeJS.Timeout>();
  const currentAnimationIdRef = useRef<string | null>(null);

  // Create animation
  const createAnimation = useCallback(async (request: AnimationRequest): Promise<AnimationResult | null> => {
    setState(prev => ({
      ...prev,
      isCreating: true,
      error: null,
      progress: null
    }));

    try {
      // Validate options
      const validationErrors = gifAnimationService.constructor.validateOptions(request.options);
      if (validationErrors.length > 0) {
        throw new Error(`Invalid options: ${validationErrors.join(', ')}`);
      }

      // Start animation creation
      const result = await gifAnimationService.createAnimation(request);
      currentAnimationIdRef.current = result.id;

      // Subscribe to progress updates
      gifAnimationService.subscribeToProgress(result.id, (progress) => {
        setState(prev => ({
          ...prev,
          progress
        }));
      });

      // Poll for completion
      const finalResult = await pollForCompletion(result.id);
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        currentAnimation: finalResult,
        history: [finalResult, ...prev.history.slice(0, 9)] // Keep last 10
      }));

      // Cleanup subscription
      gifAnimationService.unsubscribeFromProgress(result.id);
      currentAnimationIdRef.current = null;

      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Animation creation failed';
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: errorMessage,
        progress: null
      }));

      if (currentAnimationIdRef.current) {
        gifAnimationService.unsubscribeFromProgress(currentAnimationIdRef.current);
        currentAnimationIdRef.current = null;
      }

      return null;
    }
  }, []);

  // Create standard animation
  const createStandardAnimation = useCallback(async (
    frames: AnimationFrame[],
    options: Partial<AnimationOptions> = {}
  ): Promise<AnimationResult | null> => {
    const defaultOptions: AnimationOptions = {
      width: 512,
      height: 512,
      quality: 10,
      workers: 2,
      repeat: 0, // infinite loop
      dither: false,
      ...options
    };

    const request: AnimationRequest = {
      frames,
      options: defaultOptions,
      type: 'standard',
      maxFileSize: 2 * 1024 * 1024 // 2MB
    };

    return createAnimation(request);
  }, [createAnimation]);

  // Create boomerang animation
  const createBoomerangAnimation = useCallback(async (
    frames: AnimationFrame[],
    options: Partial<AnimationOptions> = {}
  ): Promise<AnimationResult | null> => {
    const defaultOptions: AnimationOptions = {
      width: 512,
      height: 512,
      quality: 10,
      workers: 2,
      repeat: 0, // infinite loop
      dither: false,
      ...options
    };

    const request: AnimationRequest = {
      frames,
      options: defaultOptions,
      type: 'boomerang',
      maxFileSize: 2 * 1024 * 1024 // 2MB
    };

    return createAnimation(request);
  }, [createAnimation]);

  // Create animation from images
  const createAnimationFromImages = useCallback(async (
    images: (HTMLImageElement | string)[],
    delay: number = 500,
    type: 'standard' | 'boomerang' = 'standard',
    options: Partial<AnimationOptions> = {}
  ): Promise<AnimationResult | null> => {
    try {
      const frames = await gifAnimationService.createFramesFromImages(images, delay);
      
      if (type === 'boomerang') {
        return createBoomerangAnimation(frames, options);
      } else {
        return createStandardAnimation(frames, options);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create frames from images'
      }));
      return null;
    }
  }, [createStandardAnimation, createBoomerangAnimation]);

  // Create animation with effects
  const createAnimationWithEffects = useCallback(async (
    baseImage: HTMLImageElement | string,
    effectType: 'zoom' | 'fade' | 'rotate' | 'pulse',
    frameCount: number = 5,
    delay: number = 200,
    options: Partial<AnimationOptions> = {}
  ): Promise<AnimationResult | null> => {
    try {
      const frames = await gifAnimationService.createFramesWithEffects(
        baseImage, 
        effectType, 
        frameCount, 
        delay
      );
      
      return createStandardAnimation(frames, options);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create frames with effects'
      }));
      return null;
    }
  }, [createStandardAnimation]);

  // Create fallback boomerang
  const createFallbackBoomerang = useCallback(async (
    frame1: AnimationFrame,
    frame2: AnimationFrame,
    options: Partial<AnimationOptions> = {}
  ): Promise<AnimationResult | null> => {
    try {
      return await gifAnimationService.createBoomerangFallback(frame1, frame2, options);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create fallback boomerang'
      }));
      return null;
    }
  }, []);

  // Cancel current animation
  const cancelAnimation = useCallback(async (): Promise<boolean> => {
    if (!currentAnimationIdRef.current) {
      return false;
    }

    const success = gifAnimationService.cancelAnimation(currentAnimationIdRef.current);
    
    if (success) {
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: 'Animation cancelled',
        progress: null
      }));

      gifAnimationService.unsubscribeFromProgress(currentAnimationIdRef.current);
      currentAnimationIdRef.current = null;
    }

    return success;
  }, []);

  // Get animation by ID
  const getAnimation = useCallback((animationId: string): AnimationResult | null => {
    return gifAnimationService.getAnimationStatus(animationId);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      history: []
    }));
  }, []);

  // Download animation
  const downloadAnimation = useCallback((animation: AnimationResult, filename?: string) => {
    if (!animation.blob || !animation.url) {
      return false;
    }

    const link = document.createElement('a');
    link.href = animation.url;
    link.download = filename || `animation-${animation.id}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  }, []);

  // Poll for animation completion
  const pollForCompletion = useCallback(async (animationId: string): Promise<AnimationResult> => {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(() => {
        const result = gifAnimationService.getAnimationStatus(animationId);
        
        if (!result) {
          clearInterval(pollInterval);
          reject(new Error('Animation not found'));
          return;
        }

        if (result.status === 'completed') {
          clearInterval(pollInterval);
          resolve(result);
        } else if (result.status === 'failed') {
          clearInterval(pollInterval);
          reject(new Error(result.error || 'Animation creation failed'));
        }
      }, 500); // Poll every 500ms

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Animation creation timeout'));
      }, 120000);
    });
  }, []);

  // Setup cleanup interval
  useEffect(() => {
    if (autoCleanup) {
      cleanupIntervalRef.current = setInterval(() => {
        gifAnimationService.cleanup();
      }, cleanupInterval);
    }

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [autoCleanup, cleanupInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAnimationIdRef.current) {
        gifAnimationService.unsubscribeFromProgress(currentAnimationIdRef.current);
      }
    };
  }, []);

  return {
    // State
    isCreating: state.isCreating,
    currentAnimation: state.currentAnimation,
    progress: state.progress,
    error: state.error,
    history: state.history,

    // Actions
    createAnimation,
    createStandardAnimation,
    createBoomerangAnimation,
    createAnimationFromImages,
    createAnimationWithEffects,
    createFallbackBoomerang,
    cancelAnimation,
    getAnimation,
    clearError,
    clearHistory,
    downloadAnimation,

    // Computed values
    progressPercentage: state.progress?.progress || 0,
    progressMessage: state.progress?.message || '',
    progressStage: state.progress?.stage || 'preparing',
    hasHistory: state.history.length > 0,
    lastAnimation: state.history[0] || null,
    
    // Utilities
    formatFileSize: gifAnimationService.constructor.formatFileSize,
    validateOptions: gifAnimationService.constructor.validateOptions
  };
};

export default useGifAnimation;