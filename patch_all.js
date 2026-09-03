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

// 2. Replace POST /api/resources
const startPostStr = `    async (request, reply) => {
      let body: any;
      let fileStream: any;
      let mimeType = "";`;

const endPostStr = `        return reply
          .status(500)
          .send({ error: "Failed to upload file to storage" } as any);
      }
    },`;

const replacementPostStr = `    async (request, reply) => {
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

const startPostIndex = code.indexOf(startPostStr);
const endPostIndex = code.indexOf(endPostStr) + endPostStr.length;

if (startPostIndex !== -1 && code.indexOf(endPostStr) !== -1) {
  code =
    code.substring(0, startPostIndex) +
    replacementPostStr +
    code.substring(endPostIndex);
} else {
  console.log("Failed to find POST /api/resources block.");
  process.exit(1);
}

// 3. Replace GET /api/resources/:id/file
const startGetStr = `    async (request, reply) => {
      const { id } = request.params;
      const ownerId = request.ownerId;

      const resource = await findResourceById(id);
      if (!resource || !resource.driveFileId) {
        return notFoundReply(reply, "Resource or file not found");
      }

      const user = await UserModel.findOne({ ownerId });`;

const endGetStr = `      // Stream the response body safely by converting Web Stream to Node Stream
      return reply.send(Readable.fromWeb(driveRes.body as any) as any);
    },`;

const replacementGetStr = `    async (request, reply) => {
      const { id } = request.params;
      const ownerId = request.ownerId;

      const resource = await findResourceById(id);
      if (!resource || !resource.driveFileId) {
        return notFoundReply(reply, "Resource or file not found");
      }

      try {
        const stream = await server.storage.getFileStream(ownerId, resource.driveFileId, request.headers.range);
        
        reply.header("Content-Type", resource.mimeType || "application/octet-stream");
        if (resource.size) {
            reply.header("Content-Length", resource.size.toString());
        }

        return reply.send(stream);
      } catch (err: any) {
        request.log.error(err, "Failed to stream file");
        if (err.name === "StorageError") {
            return reply.status(400).send({ error: err.message });
        }
        return reply.status(500).send({ error: "Failed to fetch file" });
      }
    },`;

const startGetIndex = code.indexOf(startGetStr);
const endGetIndex = code.indexOf(endGetStr) + endGetStr.length;

if (startGetIndex !== -1 && code.indexOf(endGetStr) !== -1) {
  code =
    code.substring(0, startGetIndex) +
    replacementGetStr +
    code.substring(endGetIndex);
} else {
  console.log("Failed to find GET /api/resources/:id/file block.");
  process.exit(1);
}

fs.writeFileSync(file, code);
console.log("Successfully replaced both routes.");
