import { config } from "dotenv";
import { resolve } from "path";
import mongoose from "mongoose";
import { Readable } from "stream";
import { DriveStorageAdapter } from "../src/utils/storage/drive";

// Load environment variables
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local") });

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  // We must query the database directly since ResourceModel has removed content and url
  const db = mongoose.connection.db;
  if (!db) throw new Error("DB connection failed");

  const resourcesCollection = db.collection("resources");

  const resourcesToMigrate = await resourcesCollection
    .find({
      $or: [
        { content: { $exists: true, $ne: null } },
        { url: { $exists: true, $ne: null } },
      ],
    })
    .toArray();

  console.log(`Found ${resourcesToMigrate.length} resources to migrate.`);

  const storage = new DriveStorageAdapter();

  for (const resource of resourcesToMigrate) {
    console.log(`Migrating resource: ${resource._id} (${resource.title})`);

    const hasContent =
      typeof resource.content === "string" && resource.content.length > 0;
    const hasUrl = typeof resource.url === "string" && resource.url.length > 0;

    let fileData = "";
    let mimeType = "text/plain";

    if (hasUrl) {
      fileData = resource.url;
      mimeType = "text/plain";
    } else if (hasContent) {
      fileData = resource.content;
      if (["markdown", "note", "chat", "ebook"].includes(resource.type)) {
        mimeType = "text/markdown";
      } else {
        mimeType = "text/plain";
      }
    }

    if (fileData) {
      try {
        const stream = Readable.from(Buffer.from(fileData, "utf-8"));

        // Pass ownerId to get the user's credentials
        const uploadResult = await storage.uploadFile(
          resource.ownerId,
          {
            title: resource.title,
            mimeType,
            projectId: resource.projectId,
            listId: resource.listId,
          },
          stream,
        );

        await resourcesCollection.updateOne(
          { _id: resource._id },
          {
            $set: {
              driveFileId: uploadResult.driveFileId,
              size: uploadResult.size,
            },
            $unset: { content: "", url: "" },
          },
        );
        console.log(
          `  -> Successfully migrated and uploaded to Drive: ${uploadResult.driveFileId}`,
        );
      } catch (err: any) {
        console.error(
          `  -> Failed to upload to Drive for resource ${resource._id}: ${err.message}`,
        );
        console.log(
          "  -> Stripping content/url anyway (per no-backward-compatibility requirement).",
        );
        await resourcesCollection.updateOne(
          { _id: resource._id },
          { $unset: { content: "", url: "" } },
        );
      }
    } else {
      // It has the field but it's empty
      console.log(`  -> Empty content/url. Stripping fields.`);
      await resourcesCollection.updateOne(
        { _id: resource._id },
        { $unset: { content: "", url: "" } },
      );
    }
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
}

run().catch(console.error);
