/**
 * Promote synced notes.mentorsdaily.com chapters into Knowledge Base (KbDocument)
 * + DocumentChunks + Intelligence embeddings (knowledge_intelligence).
 */

import crypto from "crypto";
import SourceUrl from "../../models/SourceUrl.js";
import ContentChunk from "../../models/ContentChunk.js";
import ContentTopic from "../../models/ContentTopic.js";
import KbDocument from "../../knowledge/models/KbDocument.js";
import KbSubject from "../../knowledge/models/KbSubject.js";
import KbChapter from "../../knowledge/models/KbChapter.js";
import KbCategory from "../../knowledge/models/KbCategory.js";
import { slugify, uniqueSlug } from "../../knowledge/utils/slugify.js";
import { ensureKnowledgeTaxonomySeeded } from "../../knowledge/seed/seedTaxonomy.js";
import ProcessedDocument from "../../processing/models/ProcessedDocument.js";
import DocumentChunk from "../../processing/models/DocumentChunk.js";
import { indexProcessedDocument } from "../../intelligence/services/embeddingIndex.service.js";
import { sourceRepo } from "../../knowledge/repositories/index.js";

const SUBJECT_ALIASES = {
  "science & tech": "Science",
  "science and technology": "Science",
  "art & culture": "Art & Culture",
  society: "Society",
  "indian society": "Society",
  governance: "Governance",
  "internal security": "Internal Security",
  "disaster management": "Disaster Management",
};

function hashText(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

async function ensureSubject(name, gsPaper = "") {
  const normalized = SUBJECT_ALIASES[String(name || "").trim().toLowerCase()] || String(name || "").trim();
  if (!normalized) return null;
  const slug = slugify(normalized);
  let subject = await KbSubject.findOne({ slug, isDeleted: { $ne: true } });
  if (!subject) {
    subject = await KbSubject.create({
      name: normalized,
      slug,
      gsPaper: gsPaper || "",
      isActive: true,
    });
  }
  return subject;
}

async function ensureChapter(subjectId, title) {
  const name = String(title || "").trim();
  if (!subjectId || !name) return null;
  const slug = slugify(name);
  let chapter = await KbChapter.findOne({ subjectId, slug, isDeleted: { $ne: true } });
  if (!chapter) {
    chapter = await KbChapter.create({
      subjectId,
      name,
      slug,
      isActive: true,
    });
  }
  return chapter;
}

async function ensureWebsiteCategory() {
  const name = "MentorsDaily Notes";
  const slug = slugify(name);
  let cat = await KbCategory.findOne({ slug });
  if (!cat) {
    cat = await KbCategory.create({
      name,
      slug,
      isSystem: true,
      isActive: true,
    });
  }
  return cat;
}

/**
 * Create/update KbDocument + DocumentChunks from a synced SourceUrl chapter,
 * then embed into knowledge_intelligence.
 */
export async function promoteWebsiteChapterToKb(sourceUrlId, { userId = null } = {}) {
  await ensureKnowledgeTaxonomySeeded();

  const chapter = await SourceUrl.findById(sourceUrlId);
  if (!chapter) throw new Error("SourceUrl chapter not found");

  const subject = await ensureSubject(chapter.subject);
  const kbChapter = await ensureChapter(subject?._id, chapter.title);
  const category = await ensureWebsiteCategory();
  const source = await sourceRepo.findOrCreateByName("notes.mentorsdaily.com", userId);

  const checksum = chapter.contentHash || hashText(`${chapter.url}:${chapter.chunkCount}`);
  const title = `${chapter.title} (Website Notes)`;

  let doc = await KbDocument.findOne({
    isDeleted: false,
    $or: [
      { storageUrl: chapter.url },
      { checksum, sourceLabel: "notes.mentorsdaily.com" },
    ],
  });

  if (!doc) {
    const slug = await uniqueSlug(KbDocument, title);
    doc = await KbDocument.create({
      title,
      slug,
      description: `Synced from ${chapter.url}`,
      subjectId: subject?._id || null,
      chapterId: kbChapter?._id || null,
      categoryId: category?._id || null,
      sourceId: source?._id || null,
      language: "English",
      publication: "MentorsDaily Notes",
      sourceLabel: "notes.mentorsdaily.com",
      difficulty: "Moderate",
      contentType: "Static",
      priority: "High",
      status: "active",
      processingStatus: "Completed",
      processingCompletedAt: new Date(),
      embeddingStatus: "pending",
      storageUrl: chapter.url,
      storageKey: `website:${chapter._id}`,
      originalFileName: chapter.url,
      mimeType: "text/html",
      extension: "html",
      checksum,
      uploadedBy: userId,
      processingLogs: [
        {
          level: "info",
          message: `Imported website chapter ${chapter.title} (${chapter.topicCount || 0} topics)`,
        },
      ],
    });
  } else {
    doc.title = title;
    doc.subjectId = subject?._id || doc.subjectId;
    doc.chapterId = kbChapter?._id || doc.chapterId;
    doc.categoryId = category?._id || doc.categoryId;
    doc.sourceId = source?._id || doc.sourceId;
    doc.storageUrl = chapter.url;
    doc.checksum = checksum;
    doc.processingStatus = "Completed";
    doc.processingCompletedAt = new Date();
    await doc.save();
  }

  const contentChunks = await ContentChunk.find({ sourceUrlId: chapter._id })
    .sort({ topicId: 1, order: 1 })
    .lean();

  const topics = await ContentTopic.find({ sourceUrlId: chapter._id }).select("_id name").lean();
  const topicNameById = new Map(topics.map((t) => [String(t._id), t.name]));

  let processed = await ProcessedDocument.findOne({ documentId: doc._id });
  if (!processed) {
    processed = await ProcessedDocument.create({
      documentId: doc._id,
      title: doc.title,
      checksum,
      mimeType: "text/html",
      extension: "html",
      storageUrl: chapter.url,
      stage: "Completed",
      progress: 100,
      status: "completed",
      documentKind: "notes",
      chunkCount: contentChunks.length,
      detectedSubject: chapter.subject || "",
      detectedChapter: chapter.title || "",
      subjectId: subject?._id || null,
      chapterId: kbChapter?._id || null,
      categoryId: category?._id || null,
      embeddingStatus: "queued",
      qdrantSyncStatus: "queued",
    });
  } else {
    processed.chunkCount = contentChunks.length;
    processed.status = "completed";
    processed.stage = "Completed";
    processed.progress = 100;
    processed.embeddingStatus = "queued";
    await processed.save();
  }

  // Replace intelligence chunks for this document
  await DocumentChunk.deleteMany({ documentId: doc._id });

  const docsToInsert = contentChunks.map((c, idx) => {
    const text = String(c.text || "").trim();
    return {
      processedDocumentId: processed._id,
      documentId: doc._id,
      chunkText: text,
      chunkHash: hashText(text),
      page: c.page ?? idx + 1,
      subject: chapter.subject || "",
      chapter: chapter.title || "",
      topic: topicNameById.get(String(c.topicId)) || c.heading || "",
      chunkOrder: idx,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      sectionType: "paragraph",
      embeddingStatus: "idle",
    };
  }).filter((row) => row.chunkText.length >= 40);

  if (docsToInsert.length) {
    await DocumentChunk.insertMany(docsToInsert, { ordered: false });
  }

  let intel = { indexed: 0, failed: 0 };
  try {
    intel = await indexProcessedDocument(processed._id);
    await KbDocument.findByIdAndUpdate(doc._id, {
      $set: {
        embeddingStatus: intel?.ok ? "completed" : "failed",
        processingStatus: "Completed",
      },
      $push: {
        processingLogs: {
          level: intel?.ok ? "info" : "warn",
          message: `Intelligence indexed ${intel?.indexed || 0} chunks (failed ${intel?.failed || 0}) from website notes`,
        },
      },
    });
    await ProcessedDocument.findByIdAndUpdate(processed._id, {
      $set: {
        embeddingStatus: intel?.ok ? "completed" : "failed",
        qdrantSyncStatus: intel?.ok ? "completed" : "failed",
        chunkCount: docsToInsert.length,
      },
    });
  } catch (err) {
    await KbDocument.findByIdAndUpdate(doc._id, {
      $set: { embeddingStatus: "failed" },
      $push: {
        processingLogs: {
          level: "error",
          message: `KB promote embed failed: ${err?.message || err}`,
        },
      },
    });
    throw err;
  }

  return {
    documentId: doc._id,
    processedDocumentId: processed._id,
    title: doc.title,
    chunks: docsToInsert.length,
    indexed: intel?.indexed || 0,
    failed: intel?.failed || 0,
    url: chapter.url,
  };
}

/**
 * Promote every synced website SourceUrl into Knowledge Base.
 */
export async function promoteAllSyncedWebsiteNotesToKb({ userId = null } = {}) {
  const list = await SourceUrl.find({
    sourceType: "url",
    status: "synced",
    url: { $regex: /notes\.mentorsdaily\.com/i },
  })
    .select("_id title subject url chunkCount")
    .lean();

  const results = [];
  for (const ch of list) {
    try {
      const r = await promoteWebsiteChapterToKb(ch._id, { userId });
      results.push({ ok: true, ...r });
      console.log(`[kbPromote] OK ${ch.subject}/${ch.title}: ${r.chunks} chunks`);
    } catch (err) {
      results.push({
        ok: false,
        title: ch.title,
        subject: ch.subject,
        url: ch.url,
        error: err?.message || String(err),
      });
      console.warn(`[kbPromote] FAIL ${ch.title}:`, err?.message || err);
    }
  }

  return {
    total: list.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

export default {
  promoteWebsiteChapterToKb,
  promoteAllSyncedWebsiteNotesToKb,
};
