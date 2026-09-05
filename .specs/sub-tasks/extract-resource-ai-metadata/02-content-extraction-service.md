## Goal

Implement a service to extract raw text from various resource types and normalize it for AI processing.

## Required Changes

- Create `apps/api/src/services/ai-extraction.service.ts`.
- Implement a method `extractPdfText(buffer)` utilizing `pdf-parse` to get plain text.
- Implement a method `extractUrlText(url)` utilizing `cheerio` to fetch HTML and extract readable text while stripping scripts, styles, and excessive HTML tags.
- Implement a method `normalizeContent(text)` to clean excess whitespace and truncate the text to a sensible token limit to avoid exceeding Gemini's context window.

## Verification Steps

- Write unit tests mocking `pdf-parse` and `cheerio` (or using dummy buffers/HTML strings) to verify text extraction logic works correctly.
- Write unit tests for `normalizeContent` to ensure it properly cleans and truncates text boundaries.
