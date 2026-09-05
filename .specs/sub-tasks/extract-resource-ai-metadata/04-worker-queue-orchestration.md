## Goal

Implement the background worker and queue mechanism to manage concurrent AI metadata extraction jobs and handle resource status transitions.

## Required Changes

- Create `apps/api/src/workers/ai-metadata.worker.ts` (or `queue.ts`).
- Initialize a `p-queue` instance with a strict concurrency limit (e.g., `{ concurrency: 4 }`).
- Implement the main job function `processResource(resourceId: string, ownerId: string)`.
- The job flow should:
  1. Retrieve the resource and fetch its file content (using existing storage adapter) or URL.
  2. Extract and normalize the content via `ai-extraction.service.ts`.
  3. Generate metadata via the Gemini generation method.
  4. Validate the AI response against `ResourceAiSchema`.
  5. Update the resource in the database: save the metadata in the `ai` field and update status to `ready`.
  6. Implement graceful error handling: Catch extraction failures, API timeouts, or validation errors, log them, and update the resource status to `error` without crashing the queue.

## Verification Steps

- Write unit and integration tests for `processResource`, mocking the database, storage adapter, and AI service.
- Verify status transitions from `pending` to `ready` on success, and `pending` to `error` on failure.
- Ensure the queue successfully processes a dummy job and respects concurrency.
