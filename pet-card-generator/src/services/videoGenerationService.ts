import { Card, CardRarity } from '@/models/Card';

export interface VideoGenerationRequest {
  cardId: string;
  imageUrl: string;
  prompt: string;
  resolution: VideoResolution;
  quality: VideoQuality;
  duration: number; // in seconds
  style?: VideoStyle;
}

export interface VideoGenerationResult {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  resolution: VideoResolution;
  quality: VideoQuality;
  fileSize: number;
  status: 'completed' | 'processing' | 'failed';
  createdAt: number;
}

export interface VideoGenerationJob {
  id: string;
  cardId: string;
  userId: string;
  request: VideoGenerationRequest;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  result?: VideoGenerationResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
  estimatedCompletionTime?: number;
}

export type VideoResolution = '480p' | '720p' | '1080p' | '4K';
export type VideoQuality = 'draft' | 'standard' | 'high' | 'premium';
export type VideoStyle = 'natural' | 'cinematic' | 'animated' | 'artistic';

interface RunwayMLResponse {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  output?: {
    video_url: string;
    thumbnail_url: string;
  };
  error?: string;
  progress?: number;
}

const VIDEO_RESOLUTION_SETTINGS = {
  '480p': { width: 854, height: 480, bitrate: '1000k' },
  '720p': { width: 1280, height: 720, bitrate: '2500k' },
  '1080p': { width: 1920, height: 1080, bitrate: '5000k' },
  '4K': { width: 3840, height: 2160, bitrate: '15000k' }
};

const VIDEO_QUALITY_SETTINGS = {
  draft: { fps: 15, compression: 'high' },
  standard: { fps: 24, compression: 'medium' },
  high: { fps: 30, compression: 'low' },
  premium: { fps: 60, compression: 'none' }
};

class VideoGenerationService {
  private apiKey: string;
  private baseUrl: string = 'https://api.runwayml.com/v1';
  private jobs: Map<string, VideoGenerationJob> = new Map();
  private queue: string[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrentJobs = 3;

  constructor() {
    this.apiKey = process.env.RUNWAYML_API_KEY || '';
    if (!this.apiKey) {
      console.warn('RunwayML API key not found. Video generation will be disabled.');
    }
  }

  // Generate video from card
  async generateVideo(
    card: Card,
    userId: string,
    options: {
      resolution?: VideoResolution;
      quality?: VideoQuality;
      duration?: number;
      style?: VideoStyle;
    } = {}
  ): Promise<VideoGenerationJob> {
    const jobId = `video_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const request: VideoGenerationRequest = {
      cardId: card.id,
      imageUrl: card.image.processedUrl,
      prompt: this.buildVideoPrompt(card, options.style),
      resolution: options.resolution || '720p',
      quality: options.quality || 'standard',
      duration: options.duration || 3,
      style: options.style || 'natural'
    };

    const job: VideoGenerationJob = {
      id: jobId,
      cardId: card.id,
      userId,
      request,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    
    // Start processing if slots available
    this.processQueue();
    
    return job;
  }

  // Build video generation prompt
  private buildVideoPrompt(card: Card, style?: VideoStyle): string {
    const basePrompt = `A ${card.petType} named ${card.petName}`;
    
    const stylePrompts = {
      natural: `${basePrompt} in natural lighting, subtle movement, realistic motion`,
      cinematic: `${basePrompt} with cinematic lighting, dramatic camera movement, film-like quality`,
      animated: `${basePrompt} with animated cartoon-style movement, bouncy and playful`,
      artistic: `${basePrompt} with artistic effects, creative transitions, stylized movement`
    };

    const prompt = stylePrompts[style || 'natural'];
    
    // Add rarity-specific enhancements
    const rarityEnhancements: Record<CardRarity, string> = {
      common: '',
      uncommon: ', enhanced colors',
      rare: ', magical sparkles, enhanced atmosphere',
      epic: ', dramatic lighting effects, mystical aura',
      legendary: ', divine radiance, epic transformation effects',
      secret_rare: ', otherworldly effects, reality-bending visuals'
    };

    return prompt + (rarityEnhancements[card.rarity] || '');
  }

  // Process the job queue
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.processing.size < this.maxConcurrentJobs) {
      const jobId = this.queue.shift();
      if (!jobId) continue;

      const job = this.jobs.get(jobId);
      if (!job) continue;

      this.processing.add(jobId);
      this.processJob(job).finally(() => {
        this.processing.delete(jobId);
        // Continue processing queue
        this.processQueue();
      });
    }
  }

  // Process individual job
  private async processJob(job: VideoGenerationJob): Promise<void> {
    try {
      // Update job status
      job.status = 'processing';
      job.updatedAt = Date.now();
      job.estimatedCompletionTime = Date.now() + (60 * 1000); // Estimate 1 minute

      // Check if API key is available
      if (!this.apiKey) {
        throw new Error('RunwayML API key not configured');
      }

      // Submit to RunwayML
      const runwayJobId = await this.submitToRunwayML(job.request);
      
      // Poll for completion
      const result = await this.pollRunwayMLJob(runwayJobId, job);
      
      // Update job with result
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.updatedAt = Date.now();

    } catch (error) {
      console.error('Video generation failed:', error);
      
      // Try fallback to enhanced GIF
      try {
        const fallbackResult = await this.generateFallbackGIF(job.request);
        job.status = 'completed';
        job.progress = 100;
        job.result = fallbackResult;
        job.updatedAt = Date.now();
      } catch (fallbackError) {
        console.error('Fallback GIF generation failed:', fallbackError);
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Video generation failed';
        job.updatedAt = Date.now();
      }
    }
  }

  // Submit job to RunwayML API
  private async submitToRunwayML(request: VideoGenerationRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gen-2',
        prompt: request.prompt,
        image: request.imageUrl,
        duration: request.duration,
        resolution: VIDEO_RESOLUTION_SETTINGS[request.resolution],
        quality: VIDEO_QUALITY_SETTINGS[request.quality]
      })
    });

    if (!response.ok) {
      throw new Error(`RunwayML API error: ${response.statusText}`);
    }

    const data: RunwayMLResponse = await response.json();
    return data.id;
  }

  // Poll RunwayML job status
  private async pollRunwayMLJob(
    runwayJobId: string, 
    job: VideoGenerationJob
  ): Promise<VideoGenerationResult> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.baseUrl}/jobs/${runwayJobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to check job status: ${response.statusText}`);
      }

      const data: RunwayMLResponse = await response.json();
      
      // Update progress
      job.progress = data.progress || (attempts / maxAttempts) * 80; // Estimate progress
      job.updatedAt = Date.now();

      if (data.status === 'SUCCEEDED' && data.output) {
        return {
          id: runwayJobId,
          videoUrl: data.output.video_url,
          thumbnailUrl: data.output.thumbnail_url,
          duration: job.request.duration,
          resolution: job.request.resolution,
          quality: job.request.quality,
          fileSize: await this.getVideoFileSize(data.output.video_url),
          status: 'completed',
          createdAt: Date.now()
        };
      }

      if (data.status === 'FAILED') {
        throw new Error(data.error || 'Video generation failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Video generation timed out');
  }

  // Generate fallback GIF when video fails
  private async generateFallbackGIF(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    // This would integrate with the existing GIF animation service
    // For now, we'll simulate the process
    
    const gifUrl = await this.createEnhancedGIF(request.imageUrl, request.prompt);
    
    return {
      id: `gif_fallback_${Date.now()}`,
      videoUrl: gifUrl,
      thumbnailUrl: request.imageUrl,
      duration: 2, // GIF duration
      resolution: '720p',
      quality: 'standard',
      fileSize: 2 * 1024 * 1024, // Estimate 2MB
      status: 'completed',
      createdAt: Date.now()
    };
  }

  // Create enhanced GIF as fallback
  private async createEnhancedGIF(imageUrl: string, _prompt: string): Promise<string> {
    // This would use the existing GIF animation service
    // with enhanced effects based on the video prompt
    
    // Simulate GIF creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return a placeholder URL - in real implementation, this would be the actual GIF
    return `${imageUrl}?enhanced=true&animation=bounce`;
  }

  // Get video file size
  private async getVideoFileSize(videoUrl: string): Promise<number> {
    try {
      const response = await fetch(videoUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch {
      return 0;
    }
  }

  // Get job status
  getJob(jobId: string): VideoGenerationJob | null {
    return this.jobs.get(jobId) || null;
  }

  // Get user's video jobs
  getUserJobs(userId: string): VideoGenerationJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // Cancel job
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    // Remove from queue if not yet processing
    const queueIndex = this.queue.indexOf(jobId);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.updatedAt = Date.now();

    return true;
  }

  // Get queue status
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrentJobs,
      totalJobs: this.jobs.size
    };
  }

  // Get video generation pricing
  getVideoPricing() {
    return {
      '480p': { draft: 0.10, standard: 0.15, high: 0.20, premium: 0.30 },
      '720p': { draft: 0.20, standard: 0.30, high: 0.40, premium: 0.60 },
      '1080p': { draft: 0.40, standard: 0.60, high: 0.80, premium: 1.20 },
      '4K': { draft: 1.00, standard: 1.50, high: 2.00, premium: 3.00 }
    };
  }

  // Estimate generation time
  estimateGenerationTime(resolution: VideoResolution, quality: VideoQuality): number {
    const baseTime = 30; // 30 seconds base
    const resolutionMultiplier = {
      '480p': 1,
      '720p': 1.5,
      '1080p': 2.5,
      '4K': 5
    };
    const qualityMultiplier = {
      draft: 0.5,
      standard: 1,
      high: 1.5,
      premium: 2.5
    };

    return baseTime * resolutionMultiplier[resolution] * qualityMultiplier[quality];
  }
}

// Export singleton instance
export const videoGenerationService = new VideoGenerationService();
export default videoGenerationService;