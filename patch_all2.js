const fs = require("fs");

const file = "apps/api/src/routes/resources.ts";
let code = fs.readFileSync(file, "utf8");

// Replace GET /api/resources/:id/file schema to include 500
code = code.replace(
  `        response: {
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
          // 200 is omitted because it streams binary data
        },`,
  `        response: {
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
          // 200 is omitted because it streams binary data
        },`,
);

const startGetStr = `      try {
        const stream = await server.storage.getFileStream(ownerId, resource.driveFileId, request.headers.range);`;

const endGetStr = `      } catch (err: any) {
        request.log.error(err, "Failed to stream file");
        if (err.name === "StorageError") {
            return reply.status(400).send({ error: err.message });
        }
        return reply.status(500).send({ error: "Failed to fetch file" });
      }`;

const replacementGetStr = `      try {
        const { stream, headers, status } = await server.storage.getFileStream(ownerId, resource.driveFileId, request.headers.range);
        
        reply.header("Content-Type", resource.mimeType || "application/octet-stream");
        if (resource.size) {
            reply.header("Content-Length", resource.size.toString());
        }
        for (const [key, value] of Object.entries(headers)) {
            reply.header(key, value);
        }
        reply.status(status);

        return reply.send(stream);
      } catch (err: any) {
        request.log.error(err, "Failed to stream file");
        if (err.name === "StorageError") {
            return reply.status(400).send({ error: err.message } as any);
        }
        return reply.status(500).send({ error: "Failed to fetch file" } as any);
      }`;

if (code.includes(startGetStr)) {
  code = code.replace(
    startGetStr +
      code.substring(
        code.indexOf(startGetStr) + startGetStr.length,
        code.indexOf(endGetStr),
      ) +
      endGetStr,
    replacementGetStr,
  );
}

fs.writeFileSync(file, code);
