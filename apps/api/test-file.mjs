import mongoose from 'mongoose';
import { SignJWT } from 'jose';
import fs from 'fs';
import 'dotenv/config';

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus';
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const resource = await db.collection('resources').findOne({ driveFileId: { $exists: true, $ne: null } });
  if (!resource) {
    console.log("No resource with driveFileId found!");
    process.exit(1);
  }

  const ownerId = resource.ownerId;
  const resourceId = resource._id.toString();
  console.log(`Testing resourceId: ${resourceId} for owner: ${ownerId}`);

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback_secret");
  const token = await new SignJWT({ sub: ownerId.toString() })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);

  console.log("Token:", token);

  const res = await fetch(`http://localhost:8080/api/resources/${resourceId}/file`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("STATUS:", res.status);
  console.log("HEADERS:", Array.from(res.headers.entries()));
  
  if (!res.ok) {
    const text = await res.text();
    console.log("ERROR TEXT:", text);
    process.exit(1);
  }
  
  const arrayBuffer = await res.arrayBuffer();
  console.log("Successfully fetched bytes:", arrayBuffer.byteLength);
  process.exit(0);
}

run().catch(console.error);
