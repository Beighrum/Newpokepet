export interface N8nWorkflowRequest {
  workflowId: string;
  data: Record<string, any>;
  webhookUrl?: string;
}

export interface N8nWorkflowResponse {
  executionId: string;
  status: 'running' | 'success' | 'error';
  data?: any;
  error?: string;
}

export interface N8nImageGenerationRequest {
  imageUrl: string;
  style: string;
  petType: string;
  petName: string;
  prompt: string;
  parameters: Record<string, any>;
}

/**
 * N8N Workflow Integration Service
 * Handles triggering n8n workflows for image generation and other automation tasks
 */
export class N8nWorkflowService {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.N8N_BASE_URL || 'https://your-n8n-instance.com';
    this.apiKey = apiKey || process.env.N8N_API_KEY;
  }

  /**
   * Trigger an n8n workflow via webhook
   */
  async triggerWorkflow(request: N8nWorkflowRequest): Promise<N8nWorkflowResponse> {
    try {
      const url = request.webhookUrl || `${this.baseUrl}/webhook/${request.workflowId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify(request.data)
      });

      if (!response.ok) {
        throw new Error(`N8N workflow failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        executionId: result.executionId || `exec_${Date.now()}`,
        status: 'success',
        data: result
      };

    } catch (error) {
      return {
        executionId: `error_${Date.now()}`,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Trigger image generation workflow
   */
  async triggerImageGeneration(request: N8nImageGenerationRequest): Promise<N8nWorkflowResponse> {
    const workflowRequest: N8nWorkflowRequest = {
      workflowId: 'pet-card-generation',
      data: {
        imageUrl: request.imageUrl,
        style: request.style,
        petType: request.petType,
        petName: request.petName,
        prompt: request.prompt,
        parameters: request.parameters,
        timestamp: new Date().toISOString()
      }
    };

    return this.triggerWorkflow(workflowRequest);
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string): Promise<N8nWorkflowResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/executions/${executionId}`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get execution status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        executionId,
        status: result.finished ? (result.success ? 'success' : 'error') : 'running',
        data: result.data,
        error: result.error
      };

    } catch (error) {
      return {
        executionId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test n8n connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      return response.ok;
    } catch (error) {
      console.error('N8N connection test failed:', error);
      return false;
    }
  }

  /**
   * List available workflows
   */
  async listWorkflows(): Promise<Array<{ id: string; name: string; active: boolean }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list workflows: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];

    } catch (error) {
      console.error('Failed to list workflows:', error);
      return [];
    }
  }

  /**
   * Create a webhook URL for a workflow
   */
  createWebhookUrl(workflowId: string): string {
    return `${this.baseUrl}/webhook/${workflowId}`;
  }

  /**
   * Validate workflow configuration
   */
  async validateWorkflow(workflowId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Workflow validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const n8nWorkflow = new N8nWorkflowService();

// Export types
export type { N8nWorkflowRequest, N8nWorkflowResponse, N8nImageGenerationRequest };