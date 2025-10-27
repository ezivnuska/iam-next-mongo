// app/lib/utils/retry.ts

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number; // Base delay in milliseconds
  isRetryable?: (error: any) => boolean;
}

/**
 * Default retry predicate for MongoDB version conflicts
 */
export function isVersionConflictError(error: any): boolean {
  return (
    error.message?.includes('No matching document found') ||
    error.message?.includes('version') ||
    error.name === 'VersionError'
  );
}

/**
 * Execute an async operation with exponential backoff retry logic
 *
 * @param operation - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await someOperation(),
 *   { maxRetries: 3, isRetryable: isVersionConflictError }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 10,
    isRetryable = isVersionConflictError,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable and we have attempts left
      if (!isRetryable(error) || attempt === maxRetries - 1) {
        throw error;
      }

      // Log retry attempt
      console.log(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying...`,
        error.message
      );

      // Exponential backoff with random jitter: baseDelay * 2^attempt + random(0-50ms)
      // Jitter helps prevent thundering herd when multiple concurrent operations retry
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 50; // 0-50ms random jitter
      const delay = exponentialDelay + jitter;

      console.log(`[Retry] Waiting ${Math.round(delay)}ms before retry ${attempt + 2}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Operation failed after retries');
}
