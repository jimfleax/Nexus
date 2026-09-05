## Goal

Setup required backend dependencies and update the shared Zod schemas to define the structure of the AI metadata.

## Required Changes

- Install `@google/genai`, `pdf-parse`, `cheerio`, and `p-queue` in `apps/api`.
- Update `ResourceAiSchema` in `packages/shared/src/schemas/resource.ts`.
  - Replace `tags` with `topics` (Array of strings).
  - Replace `contentType` with `category` (String).
  - Add new fields: `keywords` (Array of strings), `entities` (Array of objects with `name` and `type`), `keyPoints` (Array of strings), `summary` (String), `shortSummary` (String), and `language` (String).

## Verification Steps

- Verify that the new dependencies are listed in `apps/api/package.json`.
- Verify the TypeScript compiler passes without errors after modifying the shared schema.
- Write or update unit tests to ensure `ResourceAiSchema` correctly validates objects adhering to the new structure.
