import Replicate from 'replicate';

export interface GenerationStyle {
  id: string;
  name: string;
  displayName: string;
  description: string;
  promptTemplate: string;
  model: string;
  version?: string;
  parameters: Record<string, any>;
}

export interface GenerationRequest {
  imageUrl: string;
  style: string;
  petType?: string;
  petName?: string;
  customPrompt?: string;
  seed?: number;
}

export interface GenerationResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  progress?: number;
  metadata?: {
    style: string;
    petType?: string;
    petName?: string;
    generationTime?: number;
    model: string;
    prompt: string;
  };
}

export interface GenerationProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
}

// Available generation styles
export const GENERATION_STYLES: Record<string, GenerationStyle> = {
  realistic: {
    id: 'realistic',
    name: 'realistic',
    displayName: 'Realistic',
    description: 'High-quality realistic pet portrait',
    promptTemplate: 'professional pet portrait of a {petType} named {petName}, high quality, detailed, studio lighting, sharp focus',
    model: 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478',
    parameters: {
      width: 512,
      height: 512,
      num_inference_steps: 50,
      guidance_scale: 7.5,
      scheduler: 'K_EULER'
    }
  },
  cartoon: {
    id: 'cartoon',
    name: 'cartoon',
    displayName: 'Cartoon',
    description: 'Fun cartoon-style pet illustration',
    promptTemplate: 'cartoon illustration of a cute {petType} named {petName}, colorful, friendly, animated style, digital art',
    model: 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478',
    parameters: {
      width: 512,
      height: 512,
      num_inference_steps: 30,
      guidance_scale: 8.0,
      scheduler: 'K_EULER'
    }
  },
  fantasy: {
    id: 'fantasy',
    name: 'fantasy',
    displayName: 'Fantasy',
    description: 'Magical fantasy-themed pet artwork',
    promptTemplate: 'fantasy art of a magical {petType} named {petName}, mystical, ethereal, glowing effects, fantasy creature, digital painting',
    model: 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478',
    parameters: {
      width: 512,
      height: 512,
      num_inference_steps: 50,
      guidance_scale: 9.0,
      scheduler: 'K_EULER'
    }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'cyberpunk',
    displayName: 'Cyberpunk',
    description: 'Futuristic cyberpunk pet design',
    promptTemplate: 'cyberpunk {petType} named {petName}, neon lights, futuristic, sci-fi, digital art, glowing eyes, tech aesthetic',
    model: 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478',
    parameters: {
      width: 512,
      height: 512,
      num_inference_steps: 40,
      guidance_scale: 8.5,
      scheduler: 'K_EULER'
    }
  },
  vintage: {
    id: 'vintage',
    name: 'vintage',
    displayName: 'Vintage',
    description: 'Classic vintage-style pet portrait',
    promptTemplate: 'vintage portrait of a {petType} named {petName}, sepia tones, classic photography style, antique, nostalgic',
    model: 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478',
    parameters: {
      width: 512,
      height: 512,
      num_inference_steps: 45,
      guidance_scale: 7.0,
      scheduler: 'K_EULER'
    }
  }
};

/**
 * AI Image Generation Service using Replicate API
 */
export class AIImageGenerationService {
  private replicate: Replicate;
  private activeGenerations: Map<string, GenerationResult> = new Map();
  private progressCallbacks: Map<string, (progress: GenerationProgress) => void> = new Map();

  constructor(apiToken?: string) {
    this.replicate = new Replicate({
      auth: apiToken || process.env.REPLICATE_API_TOKEN || '',
    });
  }

  /**
   * Generate a pet card image using AI
   */
  async generateImage(request: GenerationRequest): Promise<GenerationResult> {
    const generationId = this.generateId();
    const style = GENERATION_STYLES[request.style] || GENERATION_STYLES.realistic;
    
    const result: GenerationResult = {
      id: generationId,
      status: 'pending',
      progress: 0,
      metadata: {
        style: request.style,
        petType: request.petType,
        petName: request.petName,
        model: style.model,
        prompt: this.buildPrompt(style, request)
      }
    };

    this.activeGenerations.set(generationId, result);
    this.updateProgress(generationId, 'pending', 0, 'Initializing generation...');

    try {
      // Build the prompt
      const prompt = this.buildPrompt(style, request);
      
      // Prepare input parameters
      const input = {
        prompt,
        image: request.imageUrl, // Reference image
        ...style.parameters,
        seed: request.seed
      };

      this.updateProgress(generationId, 'processing', 10, 'Sending request to AI service...');

      // Start the prediction
      const prediction = await this.replicate.predictions.create({
        version: style.version || style.model,
        input
      });

      this.updateProgress(generationId, 'processing', 30, 'AI is processing your image...');

      // Poll for completion with retry logic
      const finalPrediction = await this.pollPredictionWithRetry(prediction.id, generationId);

      if (finalPrediction.status === 'succeeded' && finalPrediction.output) {
        result.status = 'completed';
        result.imageUrl = Array.isArray(finalPrediction.output) 
          ? finalPrediction.output[0] 
          : finalPrediction.output;
        result.progress = 100;
        
        if (result.metadata) {
          result.metadata.generationTime = Date.now();
        }

        this.updateProgress(generationId, 'completed', 100, 'Generation completed successfully!');
      } else {
        throw new Error(finalPrediction.error || 'Generation failed');
      }

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
      this.updateProgress(generationId, 'failed', 0, `Generation failed: ${result.error}`);
    }

    this.activeGenerations.set(generationId, result);
    return result;
  }

  /**
   * Get generation status and progress
   */
  getGenerationStatus(generationId: string): GenerationResult | null {
    return this.activeGenerations.get(generationId) || null;
  }

  /**
   * Subscribe to generation progress updates
   */
  subscribeToProgress(generationId: string, callback: (progress: GenerationProgress) => void): void {
    this.progressCallbacks.set(generationId, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  unsubscribeFromProgress(generationId: string): void {
    this.progressCallbacks.delete(generationId);
  }

  /**
   * Cancel an active generation
   */
  async cancelGeneration(generationId: string): Promise<boolean> {
    const generation = this.activeGenerations.get(generationId);
    if (!generation || generation.status === 'completed' || generation.status === 'failed') {
      return false;
    }

    try {
      // Note: Replicate doesn't support cancellation, so we just mark as failed locally
      generation.status = 'failed';
      generation.error = 'Generation cancelled by user';
      this.updateProgress(generationId, 'failed', 0, 'Generation cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling generation:', error);
      return false;
    }
  }

  /**
   * Get available generation styles
   */
  getAvailableStyles(): GenerationStyle[] {
    return Object.values(GENERATION_STYLES);
  }

  /**
   * Get a specific style configuration
   */
  getStyle(styleId: string): GenerationStyle | null {
    return GENERATION_STYLES[styleId] || null;
  }

  /**
   * Test API connection and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list models to test authentication
      await this.replicate.models.list();
      return true;
    } catch (error) {
      console.error('Replicate API connection test failed:', error);
      return false;
    }
  }

  /**
   * Build prompt from template and request data
   */
  private buildPrompt(style: GenerationStyle, request: GenerationRequest): string {
    let prompt = request.customPrompt || style.promptTemplate;
    
    // Replace template variables
    prompt = prompt.replace(/{petType}/g, request.petType || 'pet');
    prompt = prompt.replace(/{petName}/g, request.petName || 'pet');
    
    // Add quality modifiers
    prompt += ', high quality, detailed, professional';
    
    return prompt;
  }

  /**
   * Poll prediction status with retry logic
   */
  private async pollPredictionWithRetry(
    predictionId: string, 
    generationId: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<any> {
    let retries = 0;
    let delay = baseDelay;

    while (retries < maxRetries) {
      try {
        let prediction = await this.replicate.predictions.get(predictionId);
        
        // Poll until completion
        while (prediction.status === 'starting' || prediction.status === 'processing') {
          await this.sleep(2000); // Wait 2 seconds between polls
          
          // Update progress based on status
          const progress = prediction.status === 'starting' ? 40 : 70;
          const message = prediction.status === 'starting' 
            ? 'AI is starting up...' 
            : 'Generating your pet card...';
          
          this.updateProgress(generationId, 'processing', progress, message);
          
          prediction = await this.replicate.predictions.get(predictionId);
        }

        return prediction;

      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw error;
        }

        console.warn(`Prediction polling attempt ${retries} failed, retrying in ${delay}ms:`, error);
        await this.sleep(delay);
        delay *= 2; // Exponential backoff
      }
    }

    throw new Error('Max retries exceeded for prediction polling');
  }

  /**
   * Update generation progress and notify subscribers
   */
  private updateProgress(
    generationId: string, 
    status: GenerationProgress['status'], 
    progress: number, 
    message: string,
    estimatedTimeRemaining?: number
  ): void {
    const progressUpdate: GenerationProgress = {
      id: generationId,
      status,
      progress,
      message,
      estimatedTimeRemaining
    };

    const callback = this.progressCallbacks.get(generationId);
    if (callback) {
      callback(progressUpdate);
    }

    // Update the stored generation result
    const generation = this.activeGenerations.get(generationId);
    if (generation) {
      generation.status = status;
      generation.progress = progress;
    }
  }

  /**
   * Generate unique ID for generations
   */
  private generateId(): string {
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up completed or failed generations (call periodically)
   */
  cleanupGenerations(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    
    for (const [id, generation] of this.activeGenerations.entries()) {
      if (generation.metadata?.generationTime) {
        const age = now - generation.metadata.generationTime;
        if (age > maxAge && (generation.status === 'completed' || generation.status === 'failed')) {
          this.activeGenerations.delete(id);
          this.progressCallbacks.delete(id);
        }
      }
    }
  }
}

// Export singleton instance (lazy initialization)
let _aiImageGenerationInstance: AIImageGenerationService | null = null;

export const aiImageGeneration = {
  getInstance(): AIImageGenerationService {
    if (!_aiImageGenerationInstance) {
      _aiImageGenerationInstance = new AIImageGenerationService();
    }
    return _aiImageGenerationInstance;
  },
  
  // Delegate methods for convenience
  generateImage: (request: GenerationRequest) => aiImageGeneration.getInstance().generateImage(request),
  getGenerationStatus: (id: string) => aiImageGeneration.getInstance().getGenerationStatus(id),
  subscribeToProgress: (id: string, callback: (progress: GenerationProgress) => void) => 
    aiImageGeneration.getInstance().subscribeToProgress(id, callback),
  unsubscribeFromProgress: (id: string) => aiImageGeneration.getInstance().unsubscribeFromProgress(id),
  cancelGeneration: (id: string) => aiImageGeneration.getInstance().cancelGeneration(id),
  getAvailableStyles: () => aiImageGeneration.getInstance().getAvailableStyles(),
  getStyle: (styleId: string) => aiImageGeneration.getInstance().getStyle(styleId),
  testConnection: () => aiImageGeneration.getInstance().testConnection(),
  cleanupGenerations: (maxAge?: number) => aiImageGeneration.getInstance().cleanupGenerations(maxAge)
};

// Export types for external use
export type { GenerationStyle, GenerationRequest, GenerationResult, GenerationProgress };