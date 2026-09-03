const fs = require("fs");

const file = "apps/api/src/routes/resources.ts";
let code = fs.readFileSync(file, "utf8");

const targetStr = `    async (request, reply) => {
      const { id } = request.params;
      const ownerId = request.ownerId;

      const resource = await findResourceById(id);
      if (!resource || !resource.driveFileId) {
        return notFoundReply(reply, "Resource or file not found");
      }

      const user = await UserModel.findOne({ ownerId });
      if (!user || !user.driveRefreshToken) {
        return reply.status(400).send({ error: "Google Drive not configured" });
      }

      const oauth2Client = buildOAuthClient(user.driveRefreshToken);

      const accessTokenRes = await oauth2Client.getAccessToken();
      const accessToken = accessTokenRes.token;

      const headers: Record<string, string> = {
        Authorization: \`Bearer \${accessToken}\`,
      };

      if (request.headers.range) {
        headers["Range"] = request.headers.range;
      }

      const driveRes = await fetch(
        \`https://www.googleapis.com/drive/v3/files/\${resource.driveFileId}?alt=media\`,
        {
          headers,
        },
      );

      if (!driveRes.ok) {
        request.log.error(\`Drive API error: \${driveRes.statusText}\`);
        return reply.status(400).send({ error: "Failed to fetch file from Drive" });
      }

      const contentType =
        driveRes.headers.get("content-type") || "application/octet-stream";
      reply.header("Content-Type", contentType);

      const contentRange = driveRes.headers.get("content-range");
      if (contentRange) {
        reply.header("Content-Range", contentRange);
        reply.status(206);
      }

      const contentLength = driveRes.headers.get("content-length");
      if (contentLength) {
        reply.header("Content-Length", contentLength);
      }

      // Convert Web Stream to Node Readable
      if (!driveRes.body) {
        return reply.status(400).send({ error: "No body in Drive response" });
      }
      const stream = Readable.fromWeb(driveRes.body as any);
      return reply.send(stream);
    },`;

const replacementStr = `    async (request, reply) => {
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

if (code.includes("const user = await UserModel.findOne({ ownerId });")) {
  const startIndex = code.indexOf(
    "    async (request, reply) => {\n      const { id } = request.params;",
  );
  const endIndex = code.indexOf("    },", startIndex) + 6;
  const newCode =
    code.substring(0, startIndex) + replacementStr + code.substring(endIndex);
  fs.writeFileSync(file, newCode);
  console.log("Successfully replaced download block.");
} else {
  console.log("Could not find download block.");
}
