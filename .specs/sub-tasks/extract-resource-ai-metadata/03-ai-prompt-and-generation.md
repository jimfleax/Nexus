## Goal

Configure Gemini prompts and implement the AI metadata generation logic enforcing the defined JSON schema.

## Required Changes

- Create `apps/api/src/config/ai-prompts.ts` to store the system prompt (e.g., `RESOURCE_METADATA_PROMPT`) instructing the AI to extract specific metadata.
- In `apps/api/src/services/ai-extraction.service.ts`, implement a `generateMetadata(normalizedText)` method.
- Use the `@google/genai` SDK to call the Gemini Flash-Lite model.
- Configure the request to enforce structured output by passing `ResourceAiSchema` (using Zod's JSON Schema representation).

## Verification Steps

- Write unit tests for `generateMetadata`, mocking the `@google/genai` client to prevent actual API calls during tests.
- Ensure the prompt and configuration correctly map to the expected fields in `ResourceAiSchema`.
