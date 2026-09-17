import mongoose, { Schema } from "mongoose";
import type { PdfProgress } from "@nexus/shared";
import { tenantIsolationPlugin } from "../db.js";

const pdfProgressSchema = new Schema<PdfProgress>(
  {
    userId: { type: String, required: true, index: true },
    documentUrl: { type: String, required: true },
    currentPage: { type: Number, required: true },
    maxPageReached: { type: Number, required: true },
    lastReadAt: { type: String, required: true },
  },
  { timestamps: true },
);

pdfProgressSchema.index({ userId: 1, documentUrl: 1 }, { unique: true });
pdfProgressSchema.plugin(tenantIsolationPlugin);

export const PdfProgressModel = mongoose.model<PdfProgress>(
  "PdfProgress",
  pdfProgressSchema,
);
