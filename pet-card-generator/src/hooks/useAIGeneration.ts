import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  aiImageGeneration, 
  GenerationRequest, 
  GenerationResult, 
  GenerationProgress, 
  GenerationStyle 
} from '@/services/aiImageGeneration';

interface UseAIGenerationOptions {
  autoCleanup?: boolean;
  cleanupInterval?: number;
}

interface GenerationState {
  isGenerating: boolean;
  currentGeneration: GenerationResult | null;
  progress: GenerationProgress | null;
  error: string | null;
  history: GenerationResult[];
}

export const useAIGeneration = (options: UseAIGenerationOptions = {}) => {
  const { autoCleanup = true, cleanupInterval = 300000 } = options; // 5 minutes default
  
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    currentGeneration: null,
    progress: null,
    error: null,
    history: []
  });

  const cleanupIntervalRef = useRef<NodeJS.Timeout>();
  const currentGenerationIdRef = useRef<string | null>(null);

  // Available styles
  const availableStyles = aiImageGeneration.getInstance().getAvailableStyles();

  // Start image generation
  const generateImage = useCallback(async (request: GenerationRequest): Promise<GenerationResult | null> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      progress: null
    }));

    try {
      // Start generation
      const result = await aiImageGeneration.getInstance().generateImage(request);
      currentGenerationIdRef.current = result.id;

      // Subscribe to progress updates
      aiImageGeneration.getInstance().subscribeToProgress(result.id, (progress) => {
        setState(prev => ({
          ...prev,
          progress
        }));
      });

      // Poll for completion
      const finalResult = await pollForCompletion(result.id);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentGeneration: finalResult,
        history: [finalResult, ...prev.history.slice(0, 9)] // Keep last 10
      }));

      // Cleanup subscription
      aiImageGeneration.getInstance().unsubscribeFromProgress(result.id);
      currentGenerationIdRef.current = null;

      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
        progress: null
      }));

      if (currentGenerationIdRef.current) {
        aiImageGeneration.getInstance().unsubscribeFromProgress(currentGenerationIdRef.current);
        currentGenerationIdRef.current = null;
      }

      return null;
    }
  }, []);

  // Cancel current generation
  const cancelGeneration = useCallback(async (): Promise<boolean> => {
    if (!currentGenerationIdRef.current) {
      return false;
    }

    const success = await aiImageGeneration.getInstance().cancelGeneration(currentGenerationIdRef.current);
    
    if (success) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: 'Generation cancelled',
        progress: null
      }));

      aiImageGeneration.getInstance().unsubscribeFromProgress(currentGenerationIdRef.current);
      currentGenerationIdRef.current = null;
    }

    return success;
  }, []);

  // Get generation by ID
  const getGeneration = useCallback((generationId: string): GenerationResult | null => {
    return aiImageGeneration.getInstance().getGenerationStatus(generationId);
  }, []);

  // Get style configuration
  const getStyle = useCallback((styleId: string): GenerationStyle | null => {
    return aiImageGeneration.getInstance().getStyle(styleId);
  }, []);

  // Test API connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    return aiImageGeneration.getInstance().testConnection();
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

  // Poll for generation completion
  const pollForCompletion = useCallback(async (generationId: string): Promise<GenerationResult> => {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(() => {
        const result = aiImageGeneration.getInstance().getGenerationStatus(generationId);
        
        if (!result) {
          clearInterval(pollInterval);
          reject(new Error('Generation not found'));
          return;
        }

        if (result.status === 'completed') {
          clearInterval(pollInterval);
          resolve(result);
        } else if (result.status === 'failed') {
          clearInterval(pollInterval);
          reject(new Error(result.error || 'Generation failed'));
        }
      }, 1000); // Poll every second

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Generation timeout'));
      }, 300000);
    });
  }, []);

  // Setup cleanup interval
  useEffect(() => {
    if (autoCleanup) {
      cleanupIntervalRef.current = setInterval(() => {
        aiImageGeneration.getInstance().cleanupGenerations();
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
      if (currentGenerationIdRef.current) {
        aiImageGeneration.getInstance().unsubscribeFromProgress(currentGenerationIdRef.current);
      }
    };
  }, []);

  return {
    // State
    isGenerating: state.isGenerating,
    currentGeneration: state.currentGeneration,
    progress: state.progress,
    error: state.error,
    history: state.history,
    availableStyles,

    // Actions
    generateImage,
    cancelGeneration,
    getGeneration,
    getStyle,
    testConnection,
    clearError,
    clearHistory,

    // Computed values
    progressPercentage: state.progress?.progress || 0,
    progressMessage: state.progress?.message || '',
    isConnected: state.error !== 'API connection failed',
    hasHistory: state.history.length > 0,
    lastGeneration: state.history[0] || null
  };
};

export default useAIGeneration;