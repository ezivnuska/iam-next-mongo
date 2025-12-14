// app/lib/utils/retry.ts

import type { Document } from 'mongoose';

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

// ============================================================================
// Mongoose-Specific Retry Utilities
// ============================================================================

const MONGOOSE_MAX_RETRIES = 5;
const MONGOOSE_INITIAL_DELAY_MS = 10;

/**
 * Retry wrapper for Mongoose save operations
 * Handles VersionError conflicts by retrying with exponential backoff
 *
 * @param doc - Mongoose document to save
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns The saved document
 * @throws Error if max retries reached or non-VersionError occurs
 *
 * @example
 * ```typescript
 * const game = await PokerGame.findById(gameId);
 * game.stage = 1;
 * await saveWithRetry(game);
 * ```
 */
export async function saveWithRetry<T extends Document>(
  doc: T,
  maxRetries: number = MONGOOSE_MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await doc.save();
    } catch (error: any) {
      lastError = error;

      // Only retry on version errors
      if (error.name !== 'VersionError') {
        throw error;
      }

      // On last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.error(`[MongooseRetry] Max retries (${maxRetries}) reached for document ${doc._id}`);
        throw error;
      }

      // Exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms
      const delayMs = MONGOOSE_INITIAL_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[MongooseRetry] VersionError on attempt ${attempt + 1}/${maxRetries} for document ${doc._id}. ` +
        `Retrying in ${delayMs}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Save failed after retries');
}

/**
 * Execute a function that modifies and saves a document with retry logic
 * Reloads the document on each retry to get the latest version
 *
 * @param loadFn - Function to load the document
 * @param modifyFn - Function to modify the document
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns The modified and saved document
 * @throws Error if document not found, max retries reached, or non-VersionError occurs
 *
 * @example
 * ```typescript
 * const game = await executeWithRetry(
 *   () => PokerGame.findById(gameId),
 *   async (game) => {
 *     game.stage = 1;
 *     game.markModified('stage');
 *   }
 * );
 * ```
 */
export async function executeWithRetry<T>(
  loadFn: () => Promise<T | null>,
  modifyFn: (doc: T) => void | Promise<void>,
  maxRetries: number = MONGOOSE_MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Load fresh copy
      const doc = await loadFn();
      if (!doc) {
        throw new Error('Document not found');
      }

      // Apply modifications
      await modifyFn(doc);

      // Save (will be a Document if from Mongoose)
      if (typeof (doc as any).save === 'function') {
        await (doc as any).save();
      }

      return doc;
    } catch (error: any) {
      lastError = error;

      // Only retry on version errors
      if (error.name !== 'VersionError') {
        throw error;
      }

      // On last attempt, throw the error
      if (attempt === maxRetries - 1) {
        console.error(`[MongooseRetry] Max retries (${maxRetries}) reached`);
        throw error;
      }

      // Exponential backoff
      const delayMs = MONGOOSE_INITIAL_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[MongooseRetry] VersionError on attempt ${attempt + 1}/${maxRetries}. ` +
        `Retrying in ${delayMs}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
