## Goal

Integrate the background AI worker into the main resource creation API flow without blocking the request.

## Required Changes

- Modify `createResource` and `createResourceWithUpload` in `apps/api/src/services/resource.service.ts`.
- Ensure new resources are created with a default status of `pending`.
- After successfully saving the resource to the database (and after successful file upload to storage if applicable), enqueue a job to the `ai-metadata.worker.ts` queue passing the `resourceId` and `ownerId`.

## Verification Steps

- Write integration tests for resource creation controllers/services to ensure the job is added to the queue upon creation.
- Verify that the API response returns immediately with the `pending` resource and does not block waiting for the AI metadata extraction to complete.
