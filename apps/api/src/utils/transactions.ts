/**
 * @file transactions.ts
 * @description Provides a wrapper for executing MongoDB transactions safely.
 * @architecture Enforces atomic operations for multi-document updates, automatically handling commits, rollbacks, and session cleanup.
 */
import mongoose from "mongoose";

/**
 * Run `fn` inside a fresh MongoDB transaction session. Commits on success,
 * aborts on throw, and always ends the session.
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
