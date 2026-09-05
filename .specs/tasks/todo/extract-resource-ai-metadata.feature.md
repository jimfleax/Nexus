---
title: Implement AI metadata extraction for new resources
---

## Initial User Prompt

Whenever a resource enters Nexus, automatically understand it, extract useful metadata, and save that metadata so the rest of Nexus can use it.

Your current Resource model already supports heterogeneous resources such as PDFs, images, ebooks, text, URLs, markdown, notes, and chats.

The complete flow
Imagine a user uploads: Understanding Transformer Architectures.pdf
The flow should be:
User Uploads resource -> Nexus Resource -> Detect resource type -> Extract content (Text-like or File/web) -> Normalize content -> AI processing job -> Gemini Flash-Lite -> Structured JSON response -> Validate with Zod -> Save AI metadata -> Create embedding -> Resource is ready.

The critical idea is that the AI doesn't directly modify the resource arbitrarily. It receives the content and returns a predefined structure.
Step 1: Resource is created (e.g. "title": "Understanding Transformer Architectures", "type": "pdf", "status": "pending")
Step 2: Extract the actual content (PDF -> text, URL -> fetched html -> text)
Step 3: Normalize the content
Step 4: Send it to the AI (Gemini Flash-Lite) with a strict instruction.
Step 5: Force a structured response (using Zod `AIResourceMetadataSchema`).
Step 6: Store the AI metadata inside the resource.

## Technical Decisions (from Design Interview)

1. **AI Pipeline Execution Strategy:** Asynchronous execution using an in-memory queue (`p-queue`) to control concurrency. The worker will run inside the `apps/api` process.
2. **Schema Alignment:** Update the existing `ResourceAiSchema` in `@nexus/shared/src/schemas/resource.ts` to strictly match the requested `AIResourceMetadataSchema` (using `topics` instead of `tags`, `category` instead of `contentType`, adding `keywords`, `entities`, `keyPoints`, etc.).
3. **Dependencies:** Install the following dependencies in `apps/api`:
   - `@google/genai`
   - `pdf-parse`
   - `cheerio`
   - `p-queue`
4. **Prompt Configuration:** Store the system prompt configurations in a new file (e.g., `apps/api/src/config/ai-prompts.ts`).

## Description

// Will be filled in future stages by business analyst
