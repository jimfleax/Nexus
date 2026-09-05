/**
 * @file retry.ts
 * @description Provides a generic exponential backoff utility for async functions.
 * @architecture Wraps unreliable external network calls (e.g., third-party APIs) with resilience mechanisms.
 */

/**
 * @desc Retries an async function with exponential backoff.
 * @param {() => Promise<T>} fn - The asynchronous function to execute and retry on failure.
 * @param {number} [maxAttempts=3] - The maximum number of attempts before throwing the error.
 * @param {number} [backoffMs=500] - The initial backoff delay in milliseconds.
 * @returns {Promise<T>} The result of the async function if successful.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  backoffMs = 500,
): Promise<T> {
  let lastError: Error;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * 2 ** attempt),
        );
      }
    }
  }
  throw lastError!;
}
