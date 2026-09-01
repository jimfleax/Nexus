/**
 * @file setup-db.ts
 * @description Database setup script that builds the models' indexes and ensures the resource $text index.
 * @architecture Connects to MongoDB, syncs schema indexes, and explicitly creates the weighted text index used by search.
 */

import mongoose from "mongoose";
import { ProjectModel } from "../src/models/Project";
import { KnowledgeListModel } from "../src/models/KnowledgeList";
import { ResourceModel } from "../src/models/Resource";

/**
 * @desc    Sync model indexes and create the resource $text index
 * @returns {Promise<void>} Resolves once indexes are built
 */
async function setupDb() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  console.log("Building indexes...");
  await ProjectModel.syncIndexes();
  await KnowledgeListModel.syncIndexes();
  await ResourceModel.syncIndexes();

  // Ensure $text index exists on Resource
  await mongoose.connection.collection("resources").createIndex({
    title: "text",
    description: "text",
    tags: "text",
    content: "text",
  });

  console.log("Indexes built successfully.");
  process.exit(0);
}

setupDb().catch(console.error);
