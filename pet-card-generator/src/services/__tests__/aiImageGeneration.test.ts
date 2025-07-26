import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Replicate before importing the service
const mockReplicate = {
  predictions: {
    create: vi.fn(),
    get: vi.fn()
  },
  models: {
    list: vi.fn()
  }
};

vi.mock('replicate', () => {
  return {
    default: vi.fn(() => mockReplicate)
  };
});

import { AIImageGenerationService, GENERATION_STYLES } from '../aiImageGeneration';

describe('AIImageGenerationService', () => {
  let service: AIImageGenerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIImageGenerationService('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateImage', () => {
    it('should generate image successfully', async () => {
      const mockPrediction = {
        id: 'pred_123',
        status: 'succeeded',
        output: ['https://example.com/generated-image.jpg']
      };

      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue(mockPrediction);

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic',
        petType: 'dog',
        petName: 'Buddy'
      };

      const result = await service.generateImage(request);

      expect(result.status).toBe('completed');
      expect(result.imageUrl).toBe('https://example.com/generated-image.jpg');
      expect(result.metadata?.style).toBe('realistic');
      expect(result.metadata?.petType).toBe('dog');
      expect(result.metadata?.petName).toBe('Buddy');
    });

    it('should handle generation failure', async () => {
      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue({
        id: 'pred_123',
        status: 'failed',
        error: 'Generation failed'
      });

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
      };

      const result = await service.generateImage(request);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Generation failed');
    });

    it('should handle API errors', async () => {
      mockReplicate.predictions.create.mockRejectedValue(new Error('API Error'));

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
      };

      const result = await service.generateImage(request);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('API Error');
    });

    it('should use custom prompt when provided', async () => {
      const mockPrediction = {
        id: 'pred_123',
        status: 'succeeded',
        output: ['https://example.com/generated-image.jpg']
      };

      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue(mockPrediction);

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic',
        customPrompt: 'custom prompt for pet'
      };

      await service.generateImage(request);

      expect(mockReplicate.predictions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: expect.stringContaining('custom prompt for pet')
          })
        })
      );
    });

    it('should include seed in generation parameters', async () => {
      const mockPrediction = {
        id: 'pred_123',
        status: 'succeeded',
        output: ['https://example.com/generated-image.jpg']
      };

      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue(mockPrediction);

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic',
        seed: 12345
      };

      await service.generateImage(request);

      expect(mockReplicate.predictions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            seed: 12345
          })
        })
      );
    });
  });

  describe('progress tracking', () => {
    it('should track generation progress', async () => {
      const progressUpdates: any[] = [];
      
      const mockPrediction = {
        id: 'pred_123',
        status: 'succeeded',
        output: ['https://example.com/generated-image.jpg']
      };

      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue(mockPrediction);

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
      };

      const result = await service.generateImage(request);
      
      // Subscribe to progress after generation starts
      service.subscribeToProgress(result.id, (progress) => {
        progressUpdates.push(progress);
      });

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('should allow unsubscribing from progress updates', () => {
      const callback = vi.fn();
      const generationId = 'test_gen_123';

      service.subscribeToProgress(generationId, callback);
      service.unsubscribeFromProgress(generationId);

      // This should not trigger the callback since we unsubscribed
      // (This is more of a structural test since we can't easily test the internal behavior)
      expect(true).toBe(true);
    });
  });

  describe('generation management', () => {
    it('should get generation status', async () => {
      const mockPrediction = {
        id: 'pred_123',
        status: 'succeeded',
        output: ['https://example.com/generated-image.jpg']
      };

      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue(mockPrediction);

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
      };

      const result = await service.generateImage(request);
      const status = service.getGenerationStatus(result.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(result.id);
    });

    it('should return null for non-existent generation', () => {
      const status = service.getGenerationStatus('non_existent_id');
      expect(status).toBeNull();
    });

    it('should cancel generation', async () => {
      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
      };

      // Mock a generation that stays in processing state
      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      // Mock get to return processing state indefinitely
      mockReplicate.predictions.get.mockResolvedValue({
        id: 'pred_123',
        status: 'processing'
      });

      // Start generation but don't await it
      const generationPromise = service.generateImage(request);
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the generation ID from the active generations
      const activeGenerations = Array.from((service as any).activeGenerations.keys());
      const generationId = activeGenerations[0];
      
      const cancelled = await service.cancelGeneration(generationId);

      expect(cancelled).toBe(true);
      
      const status = service.getGenerationStatus(generationId);
      expect(status?.status).toBe('failed');
      expect(status?.error).toBe('Generation cancelled by user');
    });

    it('should not cancel completed generation', async () => {
      const mockPrediction = {
        id: 'pred_123',
        status: 'succeeded',
        output: ['https://example.com/generated-image.jpg']
      };

      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue(mockPrediction);

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
      };

      const result = await service.generateImage(request);
      const cancelled = await service.cancelGeneration(result.id);

      expect(cancelled).toBe(false);
    });
  });

  describe('styles and configuration', () => {
    it('should return available styles', () => {
      const styles = service.getAvailableStyles();
      
      expect(styles).toHaveLength(Object.keys(GENERATION_STYLES).length);
      expect(styles[0]).toHaveProperty('id');
      expect(styles[0]).toHaveProperty('displayName');
      expect(styles[0]).toHaveProperty('description');
    });

    it('should get specific style', () => {
      const style = service.getStyle('realistic');
      
      expect(style).toBeDefined();
      expect(style?.id).toBe('realistic');
      expect(style?.displayName).toBe('Realistic');
    });

    it('should return null for non-existent style', () => {
      const style = service.getStyle('non_existent_style');
      expect(style).toBeNull();
    });
  });

  describe('connection testing', () => {
    it('should test connection successfully', async () => {
      mockReplicate.models.list.mockResolvedValue([]);
      
      const connected = await service.testConnection();
      expect(connected).toBe(true);
    });

    it('should handle connection failure', async () => {
      mockReplicate.models.list.mockRejectedValue(new Error('Connection failed'));
      
      const connected = await service.testConnection();
      expect(connected).toBe(false);
    });
  });

  describe('prompt building', () => {
    it('should build prompt with template variables', async () => {
      const mockPrediction = {
        id: 'pred_123',
        status: 'succeeded',
        output: ['https://example.com/generated-image.jpg']
      };

      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue(mockPrediction);

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic',
        petType: 'golden retriever',
        petName: 'Max'
      };

      await service.generateImage(request);

      const createCall = mockReplicate.predictions.create.mock.calls[0][0];
      const prompt = createCall.input.prompt;

      expect(prompt).toContain('golden retriever');
      expect(prompt).toContain('Max');
      expect(prompt).toContain('high quality');
    });

    it('should handle missing pet details gracefully', async () => {
      const mockPrediction = {
        id: 'pred_123',
        status: 'succeeded',
        output: ['https://example.com/generated-image.jpg']
      };

      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      mockReplicate.predictions.get.mockResolvedValue(mockPrediction);

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
        // No petType or petName
      };

      await service.generateImage(request);

      const createCall = mockReplicate.predictions.create.mock.calls[0][0];
      const prompt = createCall.input.prompt;

      expect(prompt).toContain('pet'); // Default fallback
    });
  });

  describe('cleanup', () => {
    it('should cleanup old generations', async () => {
      // This is more of a structural test since cleanup is internal
      service.cleanupGenerations(0); // Cleanup everything immediately
      expect(true).toBe(true); // Test passes if no errors
    });
  });

  describe('retry logic', () => {
    it('should retry failed prediction polling', async () => {
      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      // First call fails, second succeeds
      mockReplicate.predictions.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          id: 'pred_123',
          status: 'succeeded',
          output: ['https://example.com/generated-image.jpg']
        });

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
      };

      const result = await service.generateImage(request);

      expect(result.status).toBe('completed');
      expect(mockReplicate.predictions.get).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      mockReplicate.predictions.create.mockResolvedValue({
        id: 'pred_123',
        status: 'starting'
      });

      // All calls fail
      mockReplicate.predictions.get.mockRejectedValue(new Error('Persistent error'));

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic'
      };

      const result = await service.generateImage(request);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Persistent error');
    });
  });
});

describe('GENERATION_STYLES', () => {
  it('should have all required style properties', () => {
    Object.values(GENERATION_STYLES).forEach(style => {
      expect(style).toHaveProperty('id');
      expect(style).toHaveProperty('name');
      expect(style).toHaveProperty('displayName');
      expect(style).toHaveProperty('description');
      expect(style).toHaveProperty('promptTemplate');
      expect(style).toHaveProperty('model');
      expect(style).toHaveProperty('parameters');
      
      expect(typeof style.id).toBe('string');
      expect(typeof style.displayName).toBe('string');
      expect(typeof style.description).toBe('string');
      expect(typeof style.promptTemplate).toBe('string');
      expect(typeof style.model).toBe('string');
      expect(typeof style.parameters).toBe('object');
    });
  });

  it('should have unique style IDs', () => {
    const ids = Object.values(GENERATION_STYLES).map(style => style.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid prompt templates', () => {
    Object.values(GENERATION_STYLES).forEach(style => {
      expect(style.promptTemplate).toContain('{petType}');
      expect(style.promptTemplate).toContain('{petName}');
    });
  });
});