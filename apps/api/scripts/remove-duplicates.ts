/**
 * @file remove-duplicates.ts
 * @description One-off data-repair script that deletes duplicate resources keyed by owner, project, and title.
 * @architecture Connects to MongoDB, bypasses the tenant plugin, sorts by creation time, and keeps the first occurrence of each duplicate key.
 */

import "dotenv/config";
import { connectDB } from "../src/db.js";
import { ResourceModel } from "../src/models/Resource.js";

/**
 * @desc    Delete duplicate resources, keeping the earliest-created entry per owner/project/title
 * @returns {Promise<void>} Resolves when duplicates are removed
 */
async function run() {
  await connectDB(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  // Bypass tenant plugin for script
  const resources = await ResourceModel.find({}).setOptions({
    skipTenant: true,
  });
  console.log(`Found ${resources.length} total resources.`);

  const seen = new Set<string>();
  let duplicateCount = 0;

  // We should sort by createdAt so we keep the first one
  resources.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const resource of resources) {
    const key = `${resource.ownerId}:${resource.projectId}:${resource.title}`;
    if (seen.has(key)) {
      console.log(`Deleting duplicate: ${resource.title} (${resource._id})`);
      await ResourceModel.deleteOne({ _id: resource._id }).setOptions({
        skipTenant: true,
      });
      duplicateCount++;
    } else {
      seen.add(key);
    }
  }

  console.log(`Deleted ${duplicateCount} duplicate resources.`);
  process.exit(0);
}

run().catch(console.error);
