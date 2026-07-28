/**
 * Sync all notes.mentorsdaily.com chapters → embed → Knowledge Base.
 * Usage: node scripts/sync-website-notes-to-kb.js
 */
import "../src/loadEnv.js";
import {
  syncAllWebsiteNotes,
  getWebsiteNotesSyncStatus,
} from "../src/services/notes/syncAllWebsiteNotes.service.js";
import mongoose from "mongoose";

await mongoose.connect(process.env.DATABASE_URL);
console.log("Starting full website notes → KB sync…");
try {
  const status = await syncAllWebsiteNotes({ force: false });
  console.log(JSON.stringify(status, null, 2));
} catch (err) {
  console.error(err);
  console.log("Current status:", getWebsiteNotesSyncStatus());
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
