export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Exponential backoff with jitter retry utility
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 100,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true,
    retryCondition = () => true,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if we should retry this error
      if (!retryCondition(lastError, attempt + 1)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      // Call retry callback
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new RetryError(
    `Operation failed after ${maxRetries + 1} attempts: ${lastError!.message}`,
    maxRetries + 1,
    lastError!
  );
}

/**
 * Retry specifically for file operations with appropriate error handling
 */
export async function retryFileOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    baseDelay: 50,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error) => {
      // Retry on common file operation errors
      const retryableErrors = [
        'EBUSY',    // Resource busy
        'ENOENT',   // File not found (might appear during operation)
        'EMFILE',   // Too many open files
        'ENFILE',   // File table overflow
        'EAGAIN',   // Resource temporarily unavailable
        'EACCES',   // Permission denied (might be temporary)
        'EPERM'     // Operation not permitted (might be temporary)
      ];
      
      return retryableErrors.includes((error as any).code);
    },
    onRetry: (error, attempt) => {
      console.warn(`${operationName} failed (attempt ${attempt}):`, error.message);
    },
    ...options
  });
}

/**
 * Batch retry utility for processing multiple items with retry logic
 */
export async function retryBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    maxConcurrency?: number;
    retryOptions?: RetryOptions;
    onProgress?: (completed: number, total: number, failed: number) => void;
  } = {}
): Promise<Array<{ item: T; result?: R; error?: Error; success: boolean }>> {
  const {
    batchSize = 5,
    maxConcurrency = 3,
    retryOptions = {},
    onProgress
  } = options;

  const results: Array<{ item: T; result?: R; error?: Error; success: boolean }> = [];
  let completed = 0;
  let failed = 0;

  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Limit concurrency within each batch
    const semaphore = new Array(Math.min(maxConcurrency, batch.length)).fill(null);
    
    const batchPromises = batch.map(async (item, index) => {
      // Wait for available slot
      await semaphore[index % semaphore.length];
      
      try {
        const result = await retryWithBackoff(
          () => processor(item),
          retryOptions
        );
        
        completed++;
        if (onProgress) onProgress(completed, items.length, failed);
        
        return { item, result, success: true };
      } catch (error) {
        failed++;
        if (onProgress) onProgress(completed, items.length, failed);
        
        return { item, error: error as Error, success: false };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // This shouldn't happen with our error handling, but just in case
        results.push({
          item: batch[results.length % batch.length],
          error: new Error(result.reason?.message || 'Unknown error'),
          success: false
        });
      }
    });
  }

  return results;
}

/**
 * Circuit breaker pattern for preventing cascade failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private onStateChange?: (state: string) => void
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      this.onStateChange?.('HALF_OPEN');
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.onStateChange?.('OPEN');
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.onStateChange?.('CLOSED');
  }

  getState() {
    return this.state;
  }

  getFailures() {
    return this.failures;
  }
}
