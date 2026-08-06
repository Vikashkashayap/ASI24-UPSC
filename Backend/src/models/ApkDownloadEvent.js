import mongoose from "mongoose";

const apkDownloadEventSchema = new mongoose.Schema(
  {
    ip: { type: String, default: "" },
    version: { type: String, required: true },
    device: { type: String, default: "unknown" },
    userAgent: { type: String, default: "" },
    source: { type: String, default: "download_page" },
  },
  { timestamps: true }
);

apkDownloadEventSchema.index({ createdAt: -1 });
apkDownloadEventSchema.index({ version: 1, createdAt: -1 });

export const ApkDownloadEvent = mongoose.model(
  "ApkDownloadEvent",
  apkDownloadEventSchema
);
