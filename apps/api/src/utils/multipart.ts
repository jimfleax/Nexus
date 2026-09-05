import { FastifyRequest } from "fastify";
import { Readable } from "stream";
import crypto from "crypto";

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
