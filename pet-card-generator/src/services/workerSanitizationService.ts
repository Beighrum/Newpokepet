/**
 * Web Worker-based sanitization service for heavy processing tasks
 * Manages worker lifecycle and provides async sanitization interface
 */

import { SanitizeOptions, SanitizedResult, ContentType } from '../types/sanitization';

// Worker message types
interface SanitizationMessage {
  id: string;
  type: 'sanitize' | 'batch_sanitize' | 'stream_chunk';
  payload: any;
}

interface SanitizationResponse {
  id: string;
  type: 'result' | 'error' | 'progress';
  payload: any;
}

// Pending request tracking
interface PendingRequest {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: any) => void;
  timestamp: Date;
}

class WorkerSanitizationService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializeWorker();
  }

  /**
   * Initialize the web worker
   */
  private async initializeWorker(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        // Check if we're in a browser environment
        if (typeof Worker === 'undefined') {
          reject(new Error('Web Workers not supported in this environment'));
          return;
        }

        // Create worker from the TypeScript file
        // In production, this would be compiled to JavaScript
        this.worker = new Worker(
          new URL('../workers/sanitizationWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = this.handleWorkerError.bind(this);

        this.isInitialized = true;
        resolve();

      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to initialize worker'));
      }
    });

    return this.initializationPromise;
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent<SanitizationResponse>): void {
    const { id, type, payload } = event.data;
    const request = this.pendingRequests.get(id);

    if (!request) {
      console.warn(`Received response for unknown request: ${id}`);
      return;
    }

    switch (type) {
      case 'result':
        this.pendingRequests.delete(id);
        request.resolve(payload);
        break;

      case 'error':
        this.pendingRequests.delete(id);
        request.reject(new Error(payload.message));
        break;

      case 'progress':
        if (request.onProgress) {
          request.onProgress(payload);
        }
        break;

      default:
        console.warn(`Unknown response type: ${type}`);
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    // Reject all pending requests
    this.pendingRequests.forEach((request, id) => {
      request.reject(new Error(`Worker error: ${error.message}`));
    });
    this.pendingRequests.clear();

    // Try to reinitialize worker
    this.reinitializeWorker();
  }

  /**
   * Reinitialize worker after error
   */
  private async reinitializeWorker(): Promise<void> {
    this.isInitialized = false;
    this.initializationPromise = null;
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Wait a bit before reinitializing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      await this.initializeWorker();
      console.log('Worker reinitialized successfully');
    } catch (error) {
      console.error('Failed to reinitialize worker:', error);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  /**
   * Send message to worker with timeout
   */
  private async sendWorkerMessage<T>(
    message: SanitizationMessage,
    onProgress?: (progress: any) => void,
    timeoutMs: number = 30000
  ): Promise<T> {
    await this.initializeWorker();

    if (!this.worker) {
      throw new Error('Worker not available');
    }

    return new Promise<T>((resolve, reject) => {
      const request: PendingRequest = {
        resolve,
        reject,
        onProgress,
        timestamp: new Date()
      };

      this.pendingRequests.set(message.id, request);

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Worker request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Override resolve to clear timeout
      const originalResolve = request.resolve;
      request.resolve = (result: any) => {
        clearTimeout(timeout);
        originalResolve(result);
      };

      // Override reject to clear timeout
      const originalReject = request.reject;
      request.reject = (error: Error) => {
        clearTimeout(timeout);
        originalReject(error);
      };

      this.worker!.postMessage(message);
    });
  }

  /**
   * Sanitize content using web worker
   */
  async sanitizeWithWorker(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType
  ): Promise<SanitizedResult> {
    const message: SanitizationMessage = {
      id: this.generateRequestId(),
      type: 'sanitize',
      payload: {
        content,
        options,
        contentType: contentType || ContentType.GENERAL
      }
    };

    return this.sendWorkerMessage<SanitizedResult>(message);
  }

  /**
   * Batch sanitize multiple items using web worker
   */
  async batchSanitizeWithWorker(
    items: Array<{
      content: string;
      options?: SanitizeOptions;
      contentType?: ContentType;
    }>,
    onProgress?: (progress: { completed: number; total: number; progress: number }) => void
  ): Promise<SanitizedResult[]> {
    const message: SanitizationMessage = {
      id: this.generateRequestId(),
      type: 'batch_sanitize',
      payload: {
        content: items.map(item => ({
          content: item.content,
          options: item.options,
          contentType: item.contentType || ContentType.GENERAL
        }))
      }
    };

    return this.sendWorkerMessage<SanitizedResult[]>(message, onProgress, 60000); // 1 minute timeout for batch
  }

  /**
   * Stream sanitize large content using web worker
   */
  async streamSanitizeWithWorker(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType,
    chunkSize: number = 1000,
    onProgress?: (progress: number, chunk: SanitizedResult) => void
  ): Promise<SanitizedResult> {
    // Split content into chunks
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    const chunkResults: SanitizedResult[] = [];
    const allViolations: any[] = [];
    const allRemovedElements: string[] = [];
    let totalProcessingTime = 0;

    // Process chunks in parallel with limited concurrency
    const concurrency = 3;
    for (let i = 0; i < chunks.length; i += concurrency) {
      const chunkBatch = chunks.slice(i, i + concurrency);
      const chunkPromises = chunkBatch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        const message: SanitizationMessage = {
          id: this.generateRequestId(),
          type: 'stream_chunk',
          payload: {
            content: chunk,
            options,
            contentType: contentType || ContentType.GENERAL,
            chunkIndex,
            totalChunks: chunks.length
          }
        };

        return this.sendWorkerMessage<SanitizedResult & { chunkIndex: number }>(message);
      });

      const batchResults = await Promise.all(chunkPromises);
      
      batchResults.forEach((result) => {
        chunkResults[result.chunkIndex] = result;
        allViolations.push(...result.securityViolations);
        allRemovedElements.push(...result.removedElements);
        totalProcessingTime += result.processingTime;

        if (onProgress) {
          const progress = ((result.chunkIndex + 1) / chunks.length) * 100;
          onProgress(progress, result);
        }
      });
    }

    // Combine results
    const sanitizedContent = chunkResults.map(r => r.sanitizedContent).join('');
    
    const finalResult: SanitizedResult = {
      sanitizedContent,
      originalContent: content,
      removedElements: [...new Set(allRemovedElements)],
      securityViolations: allViolations,
      processingTime: totalProcessingTime,
      isValid: allViolations.length === 0
    };

    return finalResult;
  }

  /**
   * Check if worker is available
   */
  isWorkerAvailable(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Get worker statistics
   */
  getWorkerStats(): {
    isInitialized: boolean;
    pendingRequests: number;
    oldestPendingAge: number;
  } {
    let oldestPendingAge = 0;
    
    if (this.pendingRequests.size > 0) {
      const now = Date.now();
      const oldestRequest = Array.from(this.pendingRequests.values())
        .reduce((oldest, request) => 
          request.timestamp < oldest.timestamp ? request : oldest
        );
      oldestPendingAge = now - oldestRequest.timestamp.getTime();
    }

    return {
      isInitialized: this.isInitialized,
      pendingRequests: this.pendingRequests.size,
      oldestPendingAge
    };
  }

  /**
   * Terminate worker and cleanup
   */
  destroy(): void {
    // Reject all pending requests
    this.pendingRequests.forEach((request, id) => {
      request.reject(new Error('Service destroyed'));
    });
    this.pendingRequests.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

// Export singleton instance
export const workerSanitizationService = new WorkerSanitizationService();
export default workerSanitizationService;