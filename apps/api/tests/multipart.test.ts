import { describe, it, expect } from "vitest";
import { parseMultipartResourceRequest } from "../src/utils/multipart.js";
import { Readable } from "stream";

describe("parseMultipartResourceRequest", () => {
  it("parses fields and buffers the file part into a stream", async () => {
    // Mock FastifyRequest parts() async iterator
    const mockRequest = {
      parts: async function* () {
        yield {
          type: "file",
          fieldname: "file",
          mimetype: "application/pdf",
          file: (async function* () {
            yield Buffer.from("hello");
            yield Buffer.from(" world");
          })(),
        };
        yield {
          type: "field",
          fieldname: "title",
          value: "My PDF",
        };
        yield {
          type: "field",
          fieldname: "isFavorite",
          value: "true",
        };
      },
    } as any;

    const result = await parseMultipartResourceRequest(mockRequest);

    expect(result.body.title).toBe("My PDF");
    expect(result.body.isFavorite).toBe(true);
    expect(result.mimeType).toBe("application/pdf");
    expect(result.fileStream).toBeInstanceOf(Readable);

    // Consume the stream to verify content
    const chunks = [];
    for await (const chunk of result.fileStream!) {
      chunks.push(chunk);
    }
    expect(Buffer.concat(chunks).toString()).toBe("hello world");
  });

  it("handles missing file correctly", async () => {
    const mockRequest = {
      parts: async function* () {
        yield {
          type: "field",
          fieldname: "title",
          value: "No file here",
        };
      },
    } as any;

    const result = await parseMultipartResourceRequest(mockRequest);
    expect(result.body.title).toBe("No file here");
    expect(result.fileStream).toBeUndefined();
    expect(result.mimeType).toBe("");
  });
});
