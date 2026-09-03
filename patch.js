const fs = require("fs");

const file = "apps/api/src/routes/resources.ts";
let code = fs.readFileSync(file, "utf8");

// 1. Add imports
code = code.replace(
  `import {
  createResource,
  deleteResourceById,
  findResourceById,
  isDuplicateTitle,
  listResourcesByProject,
  toggleFavoriteResource,
  updateResource,
  validateListMembership,
} from "../services/resource.service.js";`,
  `import {
  createResource,
  deleteResourceById,
  findResourceById,
  isDuplicateTitle,
  listResourcesByProject,
  toggleFavoriteResource,
  updateResource,
  validateListMembership,
  createResourceWithUpload,
} from "../services/resource.service.js";
import { parseMultipartResourceRequest } from "../utils/multipart.js";`,
);

// 2. Replace route handler
const startStr = `    async (request, reply) => {
      let body: any;
      let fileStream: any;
      let mimeType = "";`;

const endStr = `        return reply
          .status(500)
          .send({ error: "Failed to upload file to storage" } as any);
      }
    },`;

const replacementStr = `    async (request, reply) => {
      let body: any;
      let fileStream: any;
      let mimeType = "";

      if (request.isMultipart()) {
        const parsed = await parseMultipartResourceRequest(request);
        body = parsed.body;
        fileStream = parsed.fileStream;
        mimeType = parsed.mimeType;
      } else {
        body = request.body;
      }

      const parsedBody = CreateResourceSchema.safeParse(body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "Invalid payload: " + parsedBody.error.message,
        } as any);
      }

      try {
        const resource = await createResourceWithUpload(
          request.ownerId,
          parsedBody.data,
          server.storage,
          fileStream,
          mimeType
        );
        return reply.status(201).send(resource);
      } catch (err: any) {
        if (err.message.includes("Knowledge List not found")) {
            return reply.status(404).send({ error: err.message } as any);
        }
        if (err.message.includes("already exists") || err.name === "StorageError" || err.message.includes("stream required")) {
            return reply.status(400).send({ error: err.message } as any);
        }
        request.log.error(err, "Resource creation failed");
        return reply.status(500).send({ error: "Internal server error" } as any);
      }
    },`;

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr) + endStr.length;

if (startIndex === -1 || code.indexOf(endStr) === -1) {
  console.log("Failed to find start or end index.");
  process.exit(1);
}

const newCode =
  code.substring(0, startIndex) + replacementStr + code.substring(endIndex);
fs.writeFileSync(file, newCode);
console.log("Successfully replaced block.");
