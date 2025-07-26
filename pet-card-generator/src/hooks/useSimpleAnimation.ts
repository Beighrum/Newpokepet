import { useState, useCallback, useEffect } from 'react';
import { 
  simpleAnimationService, 
  AnimationConfig, 
  AnimationResult 
} from '@/services/simpleAnimationService';

interface UseSimpleAnimationState {
  currentAnimation: AnimationResult | null;
  isCreating: boolean;
  error: string | null;
  history: AnimationResult[];
}

export const useSimpleAnimation = () => {
  const [state, setState] = useState<UseSimpleAnimationState>({
    currentAnimation: null,
    isCreating: false,
    error: null,
    history: []
  });

  // Create CSS animation
  const createCSSAnimation = useCallback((config: AnimationConfig) => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));
    
    try {
      const result = simpleAnimationService.createCSSAnimation(config);
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        currentAnimation: result,
        history: [result, ...prev.history.slice(0, 9)] // Keep last 10
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Animation creation failed';
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: errorMessage
      }));
      return null;
    }
  }, []);

  // Create frame animation
  const createFrameAnimation = useCallback(async (
    imageUrl: string, 
    config: AnimationConfig
  ) => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));
    
    try {
      const result = await simpleAnimationService.createFrameAnimation(imageUrl, config);
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        currentAnimation: result,
        history: [result, ...prev.history.slice(0, 9)]
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Frame animation creation failed';
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: errorMessage
      }));
      return null;
    }
  }, []);

  // Create boomerang fallback
  const createBoomerangFallback = useCallback((imageUrl: string) => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));
    
    try {
      const result = simpleAnimationService.createBoomerangFallback(imageUrl);
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        currentAnimation: result,
        history: [result, ...prev.history.slice(0, 9)]
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Boomerang fallback creation failed';
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: errorMessage
      }));
      return null;
    }
  }, []);

  // Get animation by ID
  const getAnimation = useCallback((animationId: string) => {
    return simpleAnimationService.getAnimation(animationId);
  }, []);

  // Get animation CSS
  const getAnimationCSS = useCallback((animationId: string) => {
    return simpleAnimationService.getAnimationCSS(animationId);
  }, []);

  // Check size limit
  const isUnderSizeLimit = useCallback((animation: AnimationResult, maxSize?: number) => {
    return simpleAnimationService.isUnderSizeLimit(animation, maxSize);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      simpleAnimationService.cleanup();
    };
  }, []);

  return {
    // State
    currentAnimation: state.currentAnimation,
    isCreating: state.isCreating,
    error: state.error,
    history: state.history,

    // Actions
    createCSSAnimation,
    createFrameAnimation,
    createBoomerangFallback,
    getAnimation,
    getAnimationCSS,
    isUnderSizeLimit,
    clearError,
    clearHistory,

    // Utilities
    supportedTypes: simpleAnimationService.constructor.getSupportedTypes(),
    getDefaultConfig: simpleAnimationService.constructor.getDefaultConfig,
    formatFileSize: simpleAnimationService.constructor.formatFileSize,

    // Computed
    hasHistory: state.history.length > 0,
    lastAnimation: state.history[0] || null
  };
};

export default useSimpleAnimation;