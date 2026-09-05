/**
 * @file transactions.ts
 * @description Provides a wrapper for executing MongoDB transactions safely.
 * @architecture Enforces atomic operations for multi-document updates, automatically handling commits, rollbacks, and session cleanup.
 */
import mongoose from "mongoose";

/**
 * @desc Run `fn` inside a fresh MongoDB transaction session. Commits on success, aborts on throw, and always ends the session.
 * @param {(session: mongoose.ClientSession) => Promise<T>} fn - The function to execute within the transaction.
 * @returns {Promise<T>} The result of the executed function.
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
