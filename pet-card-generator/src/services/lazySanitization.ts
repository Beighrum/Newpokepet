/**
 * Lazy sanitization service for performance optimization
 * Implements lazy loading, batch processing, and streaming for sanitization
 */

import { SanitizeOptions, SanitizedResult, ContentType } from '../types/sanitization';
import { sanitizationService } from './sanitization';
import { sanitizationCache } from './sanitizationCache';

// Lazy sanitization entry
interface LazySanitizationEntry {
  content: string;
  options?: SanitizeOptions;
  contentType?: ContentType;
  priority: number;
  timestamp: Date;
  resolve: (result: SanitizedResult) => void;
  reject: (error: Error) => void;
}

// Batch processing configuration
interface BatchConfig {
  maxBatchSize: number;
  batchTimeoutMs: number;
  maxConcurrentBatches: number;
  priorityThreshold: number;
}

// Streaming configuration
interface StreamingConfig {
  chunkSize: number;
  maxChunks: number;
  streamTimeoutMs: number;
}

class LazySanitizationService {
  private pendingQueue: LazySanitizationEntry[] = [];
  private processingBatches = new Set<Promise<void>>();
  private batchConfig: BatchConfig;
  private streamingConfig: StreamingConfig;
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {
    this.batchConfig = {
      maxBatchSize: 10,
      batchTimeoutMs: 100,
      maxConcurrentBatches: 3,
      priorityThreshold: 5
    };

    this.streamingConfig = {
      chunkSize: 1000, // characters
      maxChunks: 100,
      streamTimeoutMs: 5000
    };
  }

  /**
   * Lazy sanitize content - queues for batch processing
   */
  async lazySanitize(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType,
    priority: number = 1
  ): Promise<SanitizedResult> {
    // Check cache first
    const cachedResult = sanitizationCache.get(content, options, contentType);
    if (cachedResult) {
      return cachedResult;
    }

    // For high priority content, process immediately
    if (priority >= this.batchConfig.priorityThreshold) {
      return this.processImmediately(content, options, contentType);
    }

    // Queue for batch processing
    return new Promise<SanitizedResult>((resolve, reject) => {
      const entry: LazySanitizationEntry = {
        content,
        options,
        contentType,
        priority,
        timestamp: new Date(),
        resolve,
        reject
      };

      this.pendingQueue.push(entry);
      this.scheduleProcessing();
    });
  }

  /**
   * Process content immediately for high priority items
   */
  private async processImmediately(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType
  ): Promise<SanitizedResult> {
    try {
      const result = sanitizationService.sanitizeSync(content, options, {
        contentType: contentType || ContentType.GENERAL,
        ipAddress: 'lazy-service',
        userAgent: 'lazy-sanitization',
        endpoint: 'lazy-immediate'
      });
      
      // Cache the result
      sanitizationCache.set(content, result, options, contentType);
      
      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Immediate sanitization failed');
    }
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcessing(): void {
    if (this.batchTimer) {
      return; // Already scheduled
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch();
      this.batchTimer = null;
    }, this.batchConfig.batchTimeoutMs);
  }

  /**
   * Process a batch of sanitization requests
   */
  private async processBatch(): Promise<void> {
    if (this.pendingQueue.length === 0 || this.processingBatches.size >= this.batchConfig.maxConcurrentBatches) {
      return;
    }

    // Sort by priority (higher first) and timestamp (older first)
    this.pendingQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // Take a batch
    const batchSize = Math.min(this.batchConfig.maxBatchSize, this.pendingQueue.length);
    const batch = this.pendingQueue.splice(0, batchSize);

    if (batch.length === 0) {
      return;
    }

    // Process batch
    const batchPromise = this.processBatchEntries(batch);
    this.processingBatches.add(batchPromise);

    try {
      await batchPromise;
    } finally {
      this.processingBatches.delete(batchPromise);
      
      // Schedule next batch if there are more items
      if (this.pendingQueue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }

  /**
   * Process batch entries
   */
  private async processBatchEntries(batch: LazySanitizationEntry[]): Promise<void> {
    const promises = batch.map(async (entry) => {
      try {
        // Check cache again in case it was cached while waiting
        const cachedResult = sanitizationCache.get(entry.content, entry.options, entry.contentType);
        if (cachedResult) {
          entry.resolve(cachedResult);
          return;
        }

        const result = sanitizationService.sanitizeSync(entry.content, entry.options, {
          contentType: entry.contentType || ContentType.GENERAL,
          ipAddress: 'lazy-service',
          userAgent: 'lazy-sanitization',
          endpoint: 'lazy-batch'
        });

        // Cache the result
        sanitizationCache.set(entry.content, result, entry.options, entry.contentType);
        
        entry.resolve(result);
      } catch (error) {
        entry.reject(error instanceof Error ? error : new Error('Batch sanitization failed'));
      }
    });

    await Promise.all(promises);
  }

  /**
   * Stream sanitize large content by processing in chunks
   */
  async streamSanitize(
    content: string,
    options?: SanitizeOptions,
    contentType?: ContentType,
    onProgress?: (progress: number, chunk: string) => void
  ): Promise<SanitizedResult> {
    if (content.length <= this.streamingConfig.chunkSize) {
      // Content is small enough to process normally
      return this.processImmediately(content, options, contentType);
    }

    const chunks = this.splitIntoChunks(content);
    const sanitizedChunks: string[] = [];
    const allViolations: any[] = [];
    const allRemovedElements: string[] = [];
    let totalProcessingTime = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const result = await this.processImmediately(chunk, options, contentType);
        
        sanitizedChunks.push(result.sanitizedContent);
        allViolations.push(...result.securityViolations);
        allRemovedElements.push(...result.removedElements);
        totalProcessingTime += result.processingTime;

        // Report progress
        if (onProgress) {
          const progress = ((i + 1) / chunks.length) * 100;
          onProgress(progress, result.sanitizedContent);
        }

        // Add small delay to prevent blocking
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }

      } catch (error) {
        throw new Error(`Streaming sanitization failed at chunk ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const finalResult: SanitizedResult = {
      sanitizedContent: sanitizedChunks.join(''),
      originalContent: content,
      removedElements: [...new Set(allRemovedElements)],
      securityViolations: allViolations,
      processingTime: totalProcessingTime,
      isValid: allViolations.length === 0
    };

    // Cache the final result
    sanitizationCache.set(content, finalResult, options, contentType);

    return finalResult;
  }

  /**
   * Split content into chunks for streaming
   */
  private splitIntoChunks(content: string): string[] {
    const chunks: string[] = [];
    const chunkSize = this.streamingConfig.chunkSize;
    
    for (let i = 0; i < content.length; i += chunkSize) {
      let chunk = content.slice(i, i + chunkSize);
      
      // Try to break at word boundaries to avoid splitting HTML tags
      if (i + chunkSize < content.length) {
        const lastSpaceIndex = chunk.lastIndexOf(' ');
        const lastTagIndex = chunk.lastIndexOf('>');
        
        if (lastSpaceIndex > lastTagIndex && lastSpaceIndex > chunkSize * 0.8) {
          // Break at word boundary
          chunk = content.slice(i, i + lastSpaceIndex);
          i = i + lastSpaceIndex - chunkSize; // Adjust index for next iteration
        }
      }
      
      chunks.push(chunk);
      
      // Limit number of chunks to prevent memory issues
      if (chunks.length >= this.streamingConfig.maxChunks) {
        // Add remaining content as final chunk
        if (i + chunkSize < content.length) {
          chunks.push(content.slice(i + chunkSize));
        }
        break;
      }
    }
    
    return chunks;
  }

  /**
   * Batch sanitize multiple content items
   */
  async batchSanitize(
    items: Array<{
      content: string;
      options?: SanitizeOptions;
      contentType?: ContentType;
      priority?: number;
    }>
  ): Promise<SanitizedResult[]> {
    const promises = items.map(item => 
      this.lazySanitize(item.content, item.options, item.contentType, item.priority || 1)
    );

    return Promise.all(promises);
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pendingCount: number;
    processingBatches: number;
    averagePriority: number;
    oldestPendingAge: number;
  } {
    const pendingCount = this.pendingQueue.length;
    const processingBatches = this.processingBatches.size;
    
    let averagePriority = 0;
    let oldestPendingAge = 0;
    
    if (pendingCount > 0) {
      const totalPriority = this.pendingQueue.reduce((sum, entry) => sum + entry.priority, 0);
      averagePriority = totalPriority / pendingCount;
      
      const oldestEntry = this.pendingQueue.reduce((oldest, entry) => 
        entry.timestamp < oldest.timestamp ? entry : oldest
      );
      oldestPendingAge = Date.now() - oldestEntry.timestamp.getTime();
    }

    return {
      pendingCount,
      processingBatches,
      averagePriority,
      oldestPendingAge
    };
  }

  /**
   * Update batch configuration
   */
  updateBatchConfig(config: Partial<BatchConfig>): void {
    this.batchConfig = { ...this.batchConfig, ...config };
  }

  /**
   * Update streaming configuration
   */
  updateStreamingConfig(config: Partial<StreamingConfig>): void {
    this.streamingConfig = { ...this.streamingConfig, ...config };
  }

  /**
   * Clear pending queue
   */
  clearQueue(): void {
    // Reject all pending entries
    this.pendingQueue.forEach(entry => {
      entry.reject(new Error('Queue cleared'));
    });
    
    this.pendingQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.clearQueue();
    
    // Wait for processing batches to complete
    Promise.all(Array.from(this.processingBatches)).then(() => {
      console.log('Lazy sanitization service destroyed');
    });
  }
}

// Export singleton instance
export const lazySanitizationService = new LazySanitizationService();
export default lazySanitizationService;