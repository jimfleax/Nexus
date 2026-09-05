/**
 * @file multipart.ts
 * @description Parses multipart/form-data requests in Fastify.
 * @architecture Provides a standardized way to handle file uploads and complex form data in HTTP routes.
 */
import { FastifyRequest } from "fastify";
import { Readable } from "stream";
import crypto from "crypto";

/**
 * @desc Parses a multipart/form-data request extracting the file and form fields.
 * @param {FastifyRequest} request - The Fastify request object containing multipart data.
 * @returns {Promise<{body: Record<string, any>, fileStream?: Readable, mimeType: string, checksum?: string}>} The parsed form fields, file stream, mimetype, and sha256 checksum.
 */
export async function parseMultipartResourceRequest(request: FastifyRequest) {
  const body: Record<string, any> = {};
  let fileStream: Readable | undefined;
  let mimeType = "";
  let checksum: string | undefined;

  let fileBuffer: Buffer | null = null;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      mimeType = part.mimetype;
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk as Buffer);
      }
      fileBuffer = Buffer.concat(chunks);
    } else {
      if (body[part.fieldname] !== undefined) {
        // Handle multiple fields with the same name by converting to an array
        if (Array.isArray(body[part.fieldname])) {
          body[part.fieldname].push(part.value);
        } else {
          body[part.fieldname] = [body[part.fieldname], part.value];
        }
      } else {
        body[part.fieldname] = part.value;
      }
    }
  }

  if (body.isFavorite !== undefined) {
    body.isFavorite = body.isFavorite === "true";
  }

  if (fileBuffer) {
    fileStream = Readable.from(fileBuffer);
    checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  return { body, fileStream, mimeType, checksum };
}
