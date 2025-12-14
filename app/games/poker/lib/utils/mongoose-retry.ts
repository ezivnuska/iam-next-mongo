// app/games/poker/lib/utils/mongoose-retry.ts

/**
 * Retry wrapper for Mongoose save operations
 * Handles VersionError conflicts by retrying with exponential backoff
 */

import { Document } from 'mongoose';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 10;

export async function saveWithRetry<T extends Document>(
  doc: T,
  maxRetries: number = MAX_RETRIES
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
      const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
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
 */
export async function executeWithRetry<T>(
  loadFn: () => Promise<T | null>,
  modifyFn: (doc: T) => void | Promise<void>,
  maxRetries: number = MAX_RETRIES
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
      const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[MongooseRetry] VersionError on attempt ${attempt + 1}/${maxRetries}. ` +
        `Retrying in ${delayMs}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
