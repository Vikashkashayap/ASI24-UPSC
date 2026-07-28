import ProcessedDocument from "../models/ProcessedDocument.js";
import KbDocument from "../../knowledge/models/KbDocument.js";

/**
 * Document-level duplicate detection via checksum + title.
 */
export async function detectDocumentDuplicate({ checksum, title, excludeProcessedId }) {
  if (checksum) {
    const byChecksum = await ProcessedDocument.findOne({
      checksum,
      isDeleted: false,
      status: "completed",
      ...(excludeProcessedId ? { _id: { $ne: excludeProcessedId } } : {}),
    }).lean();
    if (byChecksum) {
      return { isDuplicate: true, duplicateOf: byChecksum._id, reason: "checksum" };
    }
  }

  if (title) {
    const byTitle = await ProcessedDocument.findOne({
      title: new RegExp(`^${String(title).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      isDeleted: false,
      status: "completed",
      ...(excludeProcessedId ? { _id: { $ne: excludeProcessedId } } : {}),
    }).lean();
    if (byTitle && byTitle.checksum && checksum && byTitle.checksum === checksum) {
      return { isDuplicate: true, duplicateOf: byTitle._id, reason: "title+checksum" };
    }
  }

  // Also check original KB docs with same checksum
  if (checksum) {
    const kbDup = await KbDocument.findOne({
      checksum,
      isDeleted: false,
      processingStatus: "Completed",
    }).lean();
    if (kbDup) {
      const proc = await ProcessedDocument.findOne({ documentId: kbDup._id, isDeleted: false }).lean();
      if (proc && String(proc._id) !== String(excludeProcessedId || "")) {
        return { isDuplicate: true, duplicateOf: proc._id, reason: "kb-checksum" };
      }
    }
  }

  return { isDuplicate: false, duplicateOf: null, reason: null };
}
