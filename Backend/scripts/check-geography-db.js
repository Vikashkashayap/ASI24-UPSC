import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { connectDB } from "../src/config/db.js";
import SourceUrl from "../src/models/SourceUrl.js";
import ContentChunk from "../src/models/ContentChunk.js";

await connectDB();

const docs = await SourceUrl.find({
  $or: [
    { title: /volume.*5/i },
    { title: /geography of world/i },
    { originalFileName: /volume.*5/i },
    { originalFileName: /geography.*world/i },
  ],
})
  .sort({ updatedAt: -1 })
  .lean();

console.log("Matching docs:", docs.length);
for (const d of docs) {
  const chunks = await ContentChunk.countDocuments({ sourceUrlId: d._id });
  const embedded = await ContentChunk.countDocuments({
    sourceUrlId: d._id,
    embeddedAt: { $ne: null },
  });
  console.log("---");
  console.log("ID:", d._id);
  console.log("Title:", d.title);
  console.log("Status:", d.status, "| Embedding:", d.embeddingStatus);
  console.log("Chunks:", chunks, "| Embedded:", embedded);
  console.log("Topics:", d.topicCount);
  console.log("File:", d.originalFileName);
  console.log("Error:", d.lastSyncError);
}

const recent = await SourceUrl.find({ sourceType: "pdf" })
  .sort({ updatedAt: -1 })
  .limit(8)
  .lean();
console.log("\nRecent PDF uploads:");
for (const d of recent) {
  console.log(
    String(d._id).slice(0, 16),
    "|",
    (d.title || "").slice(0, 55),
    "|",
    d.status,
    "|",
    d.chunkCount,
    "chunks | embed:",
    d.embeddingStatus
  );
}

process.exit(0);
