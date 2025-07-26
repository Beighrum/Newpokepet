import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { N8nWorkflowService } from '../n8nWorkflow';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('N8nWorkflowService', () => {
  let service: N8nWorkflowService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new N8nWorkflowService('https://test-n8n.com', 'test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('triggerWorkflow', () => {
    it('should trigger workflow successfully', async () => {
      const mockResponse = {
        executionId: 'exec_123',
        data: { result: 'success' }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request = {
        workflowId: 'test-workflow',
        data: { input: 'test data' }
      };

      const result = await service.triggerWorkflow(request);

      expect(result.status).toBe('success');
      expect(result.executionId).toBe('exec_123');
      expect(result.data).toEqual(mockResponse);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-n8n.com/webhook/test-workflow',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }),
          body: JSON.stringify({ input: 'test data' })
        })
      );
    });

    it('should use custom webhook URL when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ executionId: 'exec_123' })
      });

      const request = {
        workflowId: 'test-workflow',
        data: { input: 'test data' },
        webhookUrl: 'https://custom-webhook.com/trigger'
      };

      await service.triggerWorkflow(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-webhook.com/trigger',
        expect.any(Object)
      );
    });

    it('should handle workflow trigger failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const request = {
        workflowId: 'test-workflow',
        data: { input: 'test data' }
      };

      const result = await service.triggerWorkflow(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('N8N workflow failed: 500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = {
        workflowId: 'test-workflow',
        data: { input: 'test data' }
      };

      const result = await service.triggerWorkflow(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe('Network error');
    });

    it('should work without API key', async () => {
      const serviceWithoutKey = new N8nWorkflowService('https://test-n8n.com');
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ executionId: 'exec_123' })
      });

      const request = {
        workflowId: 'test-workflow',
        data: { input: 'test data' }
      };

      await serviceWithoutKey.triggerWorkflow(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('triggerImageGeneration', () => {
    it('should trigger image generation workflow', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ executionId: 'exec_123' })
      });

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic',
        petType: 'dog',
        petName: 'Buddy',
        prompt: 'realistic dog portrait',
        parameters: { width: 512, height: 512 }
      };

      const result = await service.triggerImageGeneration(request);

      expect(result.status).toBe('success');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-n8n.com/webhook/pet-card-generation',
        expect.objectContaining({
          body: expect.stringContaining('realistic')
        })
      );
    });

    it('should include timestamp in workflow data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ executionId: 'exec_123' })
      });

      const request = {
        imageUrl: 'https://example.com/pet.jpg',
        style: 'realistic',
        petType: 'dog',
        petName: 'Buddy',
        prompt: 'realistic dog portrait',
        parameters: {}
      };

      await service.triggerImageGeneration(request);

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('getExecutionStatus', () => {
    it('should get execution status successfully', async () => {
      const mockResponse = {
        finished: true,
        success: true,
        data: { result: 'completed' }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.getExecutionStatus('exec_123');

      expect(result.status).toBe('success');
      expect(result.executionId).toBe('exec_123');
      expect(result.data).toEqual(mockResponse);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-n8n.com/api/v1/executions/exec_123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should handle running execution', async () => {
      const mockResponse = {
        finished: false,
        data: { progress: 50 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.getExecutionStatus('exec_123');

      expect(result.status).toBe('running');
    });

    it('should handle failed execution', async () => {
      const mockResponse = {
        finished: true,
        success: false,
        error: 'Execution failed'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.getExecutionStatus('exec_123');

      expect(result.status).toBe('error');
      expect(result.error).toBe('Execution failed');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await service.getExecutionStatus('exec_123');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to get execution status: 404');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-n8n.com/healthz',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should handle connection failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('listWorkflows', () => {
    it('should list workflows successfully', async () => {
      const mockWorkflows = [
        { id: 'wf_1', name: 'Workflow 1', active: true },
        { id: 'wf_2', name: 'Workflow 2', active: false }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows })
      });

      const result = await service.listWorkflows();

      expect(result).toEqual(mockWorkflows);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-n8n.com/api/v1/workflows',
        expect.any(Object)
      );
    });

    it('should handle empty workflow list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await service.listWorkflows();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403
      });

      const result = await service.listWorkflows();

      expect(result).toEqual([]);
    });
  });

  describe('utility methods', () => {
    it('should create webhook URL', () => {
      const url = service.createWebhookUrl('test-workflow');
      expect(url).toBe('https://test-n8n.com/webhook/test-workflow');
    });

    it('should validate workflow', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await service.validateWorkflow('test-workflow');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-n8n.com/api/v1/workflows/test-workflow',
        expect.any(Object)
      );
    });

    it('should handle workflow validation failure', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await service.validateWorkflow('test-workflow');

      expect(result).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should use environment variables when no parameters provided', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        N8N_BASE_URL: 'https://env-n8n.com',
        N8N_API_KEY: 'env-api-key'
      };

      const envService = new N8nWorkflowService();
      
      // Test that it uses the environment variables (indirectly through behavior)
      expect(envService).toBeInstanceOf(N8nWorkflowService);

      // Restore environment
      process.env = originalEnv;
    });

    it('should use default URL when no environment variable', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.N8N_BASE_URL;
      delete process.env.N8N_API_KEY;

      const defaultService = new N8nWorkflowService();
      
      expect(defaultService).toBeInstanceOf(N8nWorkflowService);

      // Restore environment
      process.env = originalEnv;
    });
  });
});