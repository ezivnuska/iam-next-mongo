import type { Document } from 'mongoose';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  isRetryable?: (error: any) => boolean;
}

export function isVersionConflictError(error: any): boolean {
  return (
    error.message?.includes('No matching document found') ||
    error.message?.includes('version') ||
    error.name === 'VersionError'
  );
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 10, isRetryable = isVersionConflictError } = options;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error('Operation failed after retries');
}

const MONGOOSE_MAX_RETRIES = 5;
const MONGOOSE_INITIAL_DELAY_MS = 10;

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
      if (error.name !== 'VersionError') throw error;
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, MONGOOSE_INITIAL_DELAY_MS * Math.pow(2, attempt)));
    }
  }
  throw lastError || new Error('Save failed after retries');
}

export async function executeWithRetry<T>(
  loadFn: () => Promise<T | null>,
  modifyFn: (doc: T) => void | Promise<void>,
  maxRetries: number = MONGOOSE_MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const doc = await loadFn();
      if (!doc) throw new Error('Document not found');
      await modifyFn(doc);
      if (typeof (doc as any).save === 'function') await (doc as any).save();
      return doc;
    } catch (error: any) {
      lastError = error;
      if (error.name !== 'VersionError') throw error;
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, MONGOOSE_INITIAL_DELAY_MS * Math.pow(2, attempt)));
    }
  }
  throw lastError || new Error('Operation failed after retries');
}
