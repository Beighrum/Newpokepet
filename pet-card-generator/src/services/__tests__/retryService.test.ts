import { RetryService, retryUtils } from '../retryService';

describe('RetryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return result on first success', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await RetryService.execute(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const result = await RetryService.execute(mockFn, { maxAttempts: 3 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      await expect(
        RetryService.execute(mockFn, { maxAttempts: 2 })
      ).rejects.toThrow('Persistent failure');
      
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should respect retry condition', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Client error'));
      const retryCondition = jest.fn().mockReturnValue(false);
      
      await expect(
        RetryService.execute(mockFn, { retryCondition })
      ).rejects.toThrow('Client error');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should call onRetry callback', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      
      await RetryService.execute(mockFn, { onRetry });
      
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        expect.any(Number)
      );
    });

    it('should respect abort signal', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));
      const abortController = new AbortController();
      
      // Abort immediately
      abortController.abort();
      
      await expect(
        RetryService.execute(mockFn, { abortSignal: abortController.signal })
      ).rejects.toThrow('Operation aborted');
    });

    it('should use exponential backoff with jitter', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      const startTime = Date.now();
      
      await RetryService.execute(mockFn, {
        baseDelay: 100,
        backoffFactor: 2,
        jitter: false,
        onRetry
      });
      
      const endTime = Date.now();
      
      // Should have waited at least 100ms + 200ms = 300ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
      
      // Check delay values
      expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(Error), 1, 100);
      expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 2, 200);
    });
  });

  describe('executeWithResult', () => {
    it('should return detailed result on success', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await RetryService.executeWithResult(mockFn);
      
      expect(result).toEqual({
        success: true,
        data: 'success',
        attempts: 1,
        totalTime: expect.any(Number)
      });
    });

    it('should return detailed result on failure', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));
      
      const result = await RetryService.executeWithResult(mockFn, { maxAttempts: 2 });
      
      expect(result).toEqual({
        success: false,
        error: expect.any(Error),
        attempts: 2,
        totalTime: expect.any(Number)
      });
    });
  });

  describe('retryFetch', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should retry on server errors', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
        .mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK'
        } as Response);
      
      const result = await RetryService.retryFetch('https://api.example.com/data');
      
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors (except 429)', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);
      
      await expect(
        RetryService.retryFetch('https://api.example.com/data')
      ).rejects.toThrow('HTTP 404: Not Found');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limiting (429)', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        } as Response)
        .mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK'
        } as Response);
      
      const result = await RetryService.retryFetch('https://api.example.com/data');
      
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('createCircuitBreaker', () => {
    it('should allow calls when circuit is closed', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const circuitBreaker = RetryService.createCircuitBreaker(mockFn);
      
      const result = await circuitBreaker();
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failure'));
      const circuitBreaker = RetryService.createCircuitBreaker(mockFn, {
        failureThreshold: 2,
        maxAttempts: 1
      });
      
      // First failure
      await expect(circuitBreaker()).rejects.toThrow('Failure');
      
      // Second failure - should open circuit
      await expect(circuitBreaker()).rejects.toThrow('Failure');
      
      // Third call - should fail fast
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is open');
      
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should reset circuit after timeout', async () => {
      jest.useFakeTimers();
      
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');
      
      const circuitBreaker = RetryService.createCircuitBreaker(mockFn, {
        failureThreshold: 2,
        resetTimeout: 1000,
        maxAttempts: 1
      });
      
      // Open circuit
      await expect(circuitBreaker()).rejects.toThrow('Failure');
      await expect(circuitBreaker()).rejects.toThrow('Failure');
      
      // Should be open
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is open');
      
      // Fast forward time
      jest.advanceTimersByTime(1000);
      
      // Should be half-open and succeed
      const result = await circuitBreaker();
      expect(result).toBe('success');
      
      jest.useRealTimers();
    });
  });

  describe('retryBatch', () => {
    it('should process operations in batches', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3'),
        jest.fn().mockResolvedValue('result4')
      ];
      
      const results = await RetryService.retryBatch(operations, {
        concurrency: 2
      });
      
      expect(results).toHaveLength(4);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.map(r => r.data)).toEqual(['result1', 'result2', 'result3', 'result4']);
    });

    it('should fail fast when enabled', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockRejectedValue(new Error('Failure')),
        jest.fn().mockResolvedValue('result3')
      ];
      
      await expect(
        RetryService.retryBatch(operations, { failFast: true })
      ).rejects.toThrow('Failure');
    });

    it('should continue on failure when fail fast is disabled', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockRejectedValue(new Error('Failure')),
        jest.fn().mockResolvedValue('result3')
      ];
      
      const results = await RetryService.retryBatch(operations, { failFast: false });
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});

describe('retryUtils', () => {
  describe('apiCall', () => {
    it('should retry on network errors', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('NetworkError: fetch failed'))
        .mockResolvedValue('success');
      
      const result = await retryUtils.apiCall(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-network errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Validation error'));
      
      await expect(retryUtils.apiCall(mockFn)).rejects.toThrow('Validation error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('fileOperation', () => {
    it('should retry on file system errors', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValue('success');
      
      const result = await retryUtils.fileOperation(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on permission errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Permission denied'));
      
      await expect(retryUtils.fileOperation(mockFn)).rejects.toThrow('Permission denied');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('rateLimited', () => {
    it('should retry on rate limit errors', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('429: Too many requests'))
        .mockResolvedValue('success');
      
      const result = await retryUtils.rateLimited(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});