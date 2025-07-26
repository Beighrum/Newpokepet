import { videoGenerationService } from '../videoGenerationService';
import { Card } from '@/models/Card';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock environment variable
const originalEnv = process.env;

const mockCard: Card = {
  id: 'test-card-1',
  userId: 'user-1',
  petName: 'Fluffy',
  petType: 'cat',
  rarity: 'rare',
  image: {
    originalUrl: 'https://example.com/original.jpg',
    processedUrl: 'https://example.com/processed.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    width: 512,
    height: 512,
    format: 'jpeg',
    fileSize: 1024000
  },
  stats: {
    attack: 75,
    defense: 60,
    speed: 85,
    health: 70,
    totalPower: 290
  },
  tags: ['cute', 'fluffy'],
  isFavorite: false,
  shareCount: 5,
  downloadCount: 12,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

describe('VideoGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, RUNWAYML_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateVideo', () => {
    it('should create a video generation job', async () => {
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1');
      
      expect(job).toBeDefined();
      expect(job.cardId).toBe(mockCard.id);
      expect(job.userId).toBe('user-1');
      expect(job.status).toBe('queued');
      expect(job.progress).toBe(0);
      expect(job.request.resolution).toBe('720p'); // default
      expect(job.request.quality).toBe('standard'); // default
      expect(job.request.duration).toBe(3); // default
    });

    it('should accept custom options', async () => {
      const options = {
        resolution: '1080p' as const,
        quality: 'high' as const,
        duration: 5,
        style: 'cinematic' as const
      };
      
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1', options);
      
      expect(job.request.resolution).toBe('1080p');
      expect(job.request.quality).toBe('high');
      expect(job.request.duration).toBe(5);
      expect(job.request.style).toBe('cinematic');
    });

    it('should build appropriate prompts for different styles', async () => {
      const naturalJob = await videoGenerationService.generateVideo(mockCard, 'user-1', { style: 'natural' });
      const cinematicJob = await videoGenerationService.generateVideo(mockCard, 'user-1', { style: 'cinematic' });
      
      expect(naturalJob.request.prompt).toContain('natural lighting');
      expect(cinematicJob.request.prompt).toContain('cinematic lighting');
    });

    it('should include rarity-specific enhancements in prompt', async () => {
      const rareCard = { ...mockCard, rarity: 'rare' as const };
      const legendaryCard = { ...mockCard, rarity: 'legendary' as const };
      
      const rareJob = await videoGenerationService.generateVideo(rareCard, 'user-1');
      const legendaryJob = await videoGenerationService.generateVideo(legendaryCard, 'user-1');
      
      expect(rareJob.request.prompt).toContain('magical sparkles');
      expect(legendaryJob.request.prompt).toContain('divine radiance');
    });
  });

  describe('getJob', () => {
    it('should return job by ID', async () => {
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1');
      const retrievedJob = videoGenerationService.getJob(job.id);
      
      expect(retrievedJob).toEqual(job);
    });

    it('should return null for non-existent job', () => {
      const job = videoGenerationService.getJob('non-existent-id');
      
      expect(job).toBeNull();
    });
  });

  describe('getUserJobs', () => {
    it('should return jobs for specific user', async () => {
      const job1 = await videoGenerationService.generateVideo(mockCard, 'user-1');
      const job2 = await videoGenerationService.generateVideo(mockCard, 'user-1');
      await videoGenerationService.generateVideo(mockCard, 'user-2');
      
      const userJobs = videoGenerationService.getUserJobs('user-1');
      
      expect(userJobs).toHaveLength(2);
      expect(userJobs.map(j => j.id)).toContain(job1.id);
      expect(userJobs.map(j => j.id)).toContain(job2.id);
    });

    it('should return jobs sorted by creation date (newest first)', async () => {
      const job1 = await videoGenerationService.generateVideo(mockCard, 'user-1');
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const job2 = await videoGenerationService.generateVideo(mockCard, 'user-1');
      
      const userJobs = videoGenerationService.getUserJobs('user-1');
      
      expect(userJobs[0].id).toBe(job2.id); // newer job first
      expect(userJobs[1].id).toBe(job1.id);
    });

    it('should return empty array for user with no jobs', () => {
      const userJobs = videoGenerationService.getUserJobs('non-existent-user');
      
      expect(userJobs).toEqual([]);
    });
  });

  describe('cancelJob', () => {
    it('should cancel queued job', async () => {
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1');
      
      const cancelled = videoGenerationService.cancelJob(job.id);
      const updatedJob = videoGenerationService.getJob(job.id);
      
      expect(cancelled).toBe(true);
      expect(updatedJob?.status).toBe('failed');
      expect(updatedJob?.error).toBe('Cancelled by user');
    });

    it('should not cancel completed job', async () => {
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1');
      
      // Manually set job to completed
      job.status = 'completed';
      
      const cancelled = videoGenerationService.cancelJob(job.id);
      
      expect(cancelled).toBe(false);
      expect(job.status).toBe('completed'); // unchanged
    });

    it('should not cancel failed job', async () => {
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1');
      
      // Manually set job to failed
      job.status = 'failed';
      
      const cancelled = videoGenerationService.cancelJob(job.id);
      
      expect(cancelled).toBe(false);
    });

    it('should return false for non-existent job', () => {
      const cancelled = videoGenerationService.cancelJob('non-existent-id');
      
      expect(cancelled).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('should return current queue status', async () => {
      await videoGenerationService.generateVideo(mockCard, 'user-1');
      await videoGenerationService.generateVideo(mockCard, 'user-1');
      
      const status = videoGenerationService.getQueueStatus();
      
      expect(status.totalJobs).toBe(2);
      expect(status.maxConcurrent).toBe(3);
      expect(typeof status.queueLength).toBe('number');
      expect(typeof status.processing).toBe('number');
    });
  });

  describe('getVideoPricing', () => {
    it('should return pricing structure', () => {
      const pricing = videoGenerationService.getVideoPricing();
      
      expect(pricing).toHaveProperty('480p');
      expect(pricing).toHaveProperty('720p');
      expect(pricing).toHaveProperty('1080p');
      expect(pricing).toHaveProperty('4K');
      
      expect(pricing['720p']).toHaveProperty('draft');
      expect(pricing['720p']).toHaveProperty('standard');
      expect(pricing['720p']).toHaveProperty('high');
      expect(pricing['720p']).toHaveProperty('premium');
      
      expect(typeof pricing['720p'].standard).toBe('number');
    });

    it('should have higher prices for higher resolutions', () => {
      const pricing = videoGenerationService.getVideoPricing();
      
      expect(pricing['1080p'].standard).toBeGreaterThan(pricing['720p'].standard);
      expect(pricing['4K'].standard).toBeGreaterThan(pricing['1080p'].standard);
    });

    it('should have higher prices for higher quality', () => {
      const pricing = videoGenerationService.getVideoPricing();
      
      expect(pricing['720p'].high).toBeGreaterThan(pricing['720p'].standard);
      expect(pricing['720p'].premium).toBeGreaterThan(pricing['720p'].high);
    });
  });

  describe('estimateGenerationTime', () => {
    it('should return estimated time in seconds', () => {
      const time = videoGenerationService.estimateGenerationTime('720p', 'standard');
      
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThan(0);
    });

    it('should estimate longer times for higher resolutions', () => {
      const time720p = videoGenerationService.estimateGenerationTime('720p', 'standard');
      const time1080p = videoGenerationService.estimateGenerationTime('1080p', 'standard');
      const time4K = videoGenerationService.estimateGenerationTime('4K', 'standard');
      
      expect(time1080p).toBeGreaterThan(time720p);
      expect(time4K).toBeGreaterThan(time1080p);
    });

    it('should estimate longer times for higher quality', () => {
      const timeDraft = videoGenerationService.estimateGenerationTime('720p', 'draft');
      const timeStandard = videoGenerationService.estimateGenerationTime('720p', 'standard');
      const timePremium = videoGenerationService.estimateGenerationTime('720p', 'premium');
      
      expect(timeStandard).toBeGreaterThan(timeDraft);
      expect(timePremium).toBeGreaterThan(timeStandard);
    });
  });

  describe('API integration', () => {
    beforeEach(() => {
      // Mock successful RunwayML API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'runway-job-123', status: 'PENDING' })
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            id: 'runway-job-123',
            status: 'SUCCEEDED',
            output: {
              video_url: 'https://example.com/video.mp4',
              thumbnail_url: 'https://example.com/thumb.jpg'
            }
          })
        } as Response);
    });

    it('should handle missing API key gracefully', async () => {
      process.env.RUNWAYML_API_KEY = '';
      
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1');
      
      // Job should be created but will fail during processing
      expect(job.status).toBe('queued');
    });

    it('should build correct API request', async () => {
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1', {
        resolution: '1080p',
        quality: 'high',
        duration: 5
      });
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.runwayml.com/v1/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('gen-2')
        })
      );
    });
  });

  describe('fallback GIF generation', () => {
    beforeEach(() => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('API Error'));
    });

    it('should generate fallback GIF when video generation fails', async () => {
      const job = await videoGenerationService.generateVideo(mockCard, 'user-1');
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const updatedJob = videoGenerationService.getJob(job.id);
      
      expect(updatedJob?.status).toBe('completed');
      expect(updatedJob?.result?.videoUrl).toContain('enhanced=true');
    });
  });
});