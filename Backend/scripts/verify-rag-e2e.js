/**
 * End-to-end UPSC RAG pipeline verification.
 * Steps 1–10: Mongo → Qdrant → Embed → Ingest → Search → MCQ → Health
 *
 * Usage: node scripts/verify-rag-e2e.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SAMPLE_SUBJECT = "History";
const SAMPLE_TOPIC = "Revolt of 1857";
const SAMPLE_CONTENT = `The Revolt of 1857 is also called the First War of Independence.

Major leaders were:

Mangal Pandey

Rani Lakshmibai

Nana Sahib

Begum Hazrat Mahal

Tatya Tope

The revolt started at Meerut.

The revolt failed due to lack of coordination.

It resulted in the end of East India Company rule.

The Government of India Act 1858 transferred power to the British Crown.

Background and causes of the Revolt of 1857 included political annexation under the Doctrine of Lapse,
economic exploitation of peasants and artisans, social and religious interference by the British,
and military grievances among sepoys regarding pay, overseas service, and the greased cartridge issue.
The immediate spark came when sepoys at Meerut refused to use the new Enfield rifle cartridges
rumoured to be greased with cow and pig fat, offending Hindu and Muslim religious sentiments.
Mangal Pandey of the 34th Bengal Native Infantry attacked British officers at Barrackpore in March 1857.
On 10 May 1857 the Meerut sepoys mutinied, freed comrades from jail, and marched to Delhi where
they proclaimed Bahadur Shah Zafar as the symbolic emperor of Hindustan.
Centres of the revolt included Delhi, Kanpur, Lucknow, Jhansi, Bareilly, and Bihar.
Rani Lakshmibai of Jhansi fought bravely and died in battle near Gwalior.
Nana Sahib led the uprising at Kanpur. Begum Hazrat Mahal led resistance in Awadh.
Tatya Tope organised guerrilla warfare after the fall of major centres.
British recovery relied on reinforcements from Punjab, Madras, and Bombay, and on superior artillery.
Lack of unified command, limited modern weapons, and absence of a national programme weakened the rebels.
After suppression, the East India Company was abolished and the British Crown assumed direct rule
through the Government of India Act 1858. A Secretary of State for India and a Viceroy replaced Company rule.
The revolt marked a turning point in Indian nationalism and is remembered as the First War of Independence.`;

const report = {
  mongodb: { status: "FAIL", details: {} },
  qdrant: { status: "FAIL", details: {} },
  embedding: { status: "FAIL", details: {} },
  chunking: { status: "FAIL", details: {} },
  vectorStorage: { status: "FAIL", details: {} },
  semanticSearch: { status: "FAIL", details: {} },
  questionGeneration: { status: "FAIL", details: {} },
  caching: { status: "FAIL", details: {} },
  health: { status: "FAIL", details: {} },
};

function pass(key, details = {}) {
  report[key] = { status: "PASS", details };
}

function fail(key, reason, details = {}) {
  report[key] = { status: "FAIL", reason, details };
}

function mask(v) {
  if (!v) return "(missing)";
  const s = String(v);
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

async function buildSamplePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  const fontSize = 11;
  const margin = 50;
  let y = 740;
  const lines = [
    `Subject: ${SAMPLE_SUBJECT}`,
    `Topic: ${SAMPLE_TOPIC}`,
    "",
    ...SAMPLE_CONTENT.split("\n"),
  ];
  for (const line of lines) {
    if (y < 60) break;
    page.drawText(line.slice(0, 95), { x: margin, y, size: fontSize, font });
    y -= 14;
  }
  return Buffer.from(await doc.save());
}

async function step1Mongo(mongoose) {
  console.log("\n========== STEP 1: MongoDB ==========");
  const state = mongoose.connection.readyState;
  if (state !== 1) throw new Error(`MongoDB not connected (readyState=${state})`);

  const SourceUrl = (await import("../src/models/SourceUrl.js")).default;
  const ContentChunk = (await import("../src/models/ContentChunk.js")).default;
  const GeneratedQuestion = (await import("../src/rag/models/GeneratedQuestion.js")).default;

  const [documents, chunks, generatedQuestions, topics] = await Promise.all([
    SourceUrl.countDocuments(),
    ContentChunk.countDocuments(),
    GeneratedQuestion.countDocuments(),
    (await import("../src/models/ContentTopic.js")).default.countDocuments(),
  ]);

  const details = {
    connection: "connected",
    collections: {
      sourceurls_Documents: documents,
      contentchunks_Chunks: chunks,
      contenttopics_Topics: topics,
      generatedquestions: generatedQuestions,
    },
  };
  console.log(JSON.stringify(details, null, 2));
  pass("mongodb", details);
  return { SourceUrl, ContentChunk, GeneratedQuestion, documents, chunks, generatedQuestions };
}

async function step2Qdrant(qdrantService) {
  console.log("\n========== STEP 2: Qdrant Cloud ==========");
  if (!qdrantService.isConfigured()) {
    throw new Error("QDRANT_URL / QDRANT_API_KEY not configured");
  }
  if (!process.env.QDRANT_API_KEY?.trim()) {
    throw new Error("QDRANT_API_KEY is missing");
  }
  if (/localhost|127\.0\.0\.1/i.test(process.env.QDRANT_URL || "")) {
    throw new Error("QDRANT_URL must be Qdrant Cloud (not localhost)");
  }

  await qdrantService.ensureCollection();
  const client = qdrantService.getClient();
  const info = await client.getCollection(qdrantService.collection);
  const vectorsCfg = info?.config?.params?.vectors;
  const vectorSize =
    (typeof vectorsCfg?.size === "number" ? vectorsCfg.size : null) ??
    vectorsCfg?.[""]?.size ??
    null;
  const distance =
    (typeof vectorsCfg?.distance === "string" ? vectorsCfg.distance : null) ??
    vectorsCfg?.[""]?.distance ??
    null;
  const pointsCount = info?.points_count ?? info?.pointsCount ?? 0;

  const details = {
    connection: "ok",
    apiKey: mask(process.env.QDRANT_API_KEY),
    collection: qdrantService.collection,
    collectionExists: true,
    vectorCount: pointsCount,
    vectorDimension: vectorSize,
    distanceMetric: distance,
    configuredSize: qdrantService.getVectorSize(),
  };
  console.log(JSON.stringify(details, null, 2));
  pass("qdrant", details);
  return details;
}

async function step3Embedding(embeddingService) {
  console.log("\n========== STEP 3: Embedding Provider ==========");
  if (!embeddingService.isConfigured()) {
    throw new Error("Embedding provider not configured (JINA_API_KEY)");
  }
  const text =
    "The Revolt of 1857 was the first major uprising against British rule.";
  const started = Date.now();
  const vector = await embeddingService.generateEmbedding(text, { task: "query" });
  const ms = Date.now() - started;
  if (!Array.isArray(vector) || !vector.length) {
    throw new Error("Empty embedding returned");
  }
  const details = {
    provider: embeddingService.getProviderLabel(),
    model: embeddingService.getModelName(),
    apiKey: mask(process.env.JINA_API_KEY),
    sampleText: text,
    embeddingDimension: vector.length,
    expectedDimension: embeddingService.getDimension(),
    generationTimeMs: ms,
    status: vector.length === embeddingService.getDimension() ? "ok" : "dimension_mismatch",
  };
  console.log(JSON.stringify(details, null, 2));
  if (details.status !== "ok") {
    throw new Error(
      `Dimension mismatch: got ${vector.length}, expected ${embeddingService.getDimension()}`
    );
  }
  pass("embedding", details);
  return details;
}

async function step4And5Ingest({ ingestPdfDocument, ContentChunk, qdrantService }) {
  console.log("\n========== STEP 4: Create TEST PDF ==========");
  const buffer = await buildSamplePdf();
  console.log(`Created PDF buffer: ${buffer.length} bytes`);

  console.log("\n========== STEP 5: Ingestion Pipeline ==========");
  const embedStarted = Date.now();
  const result = await ingestPdfDocument({
    buffer,
    originalName: "e2e-revolt-1857.pdf",
    mimeType: "application/pdf",
    subject: SAMPLE_SUBJECT,
    title: `E2E ${SAMPLE_TOPIC}`,
    topic: SAMPLE_TOPIC,
    sourceBook: "E2E Verification",
    language: "en",
    processNow: true,
  });
  const embeddingTimeMs = Date.now() - embedStarted;

  const documentId = result.documentId;
  const mongoChunks = await ContentChunk.countDocuments({ sourceUrlId: documentId });
  const health = await qdrantService.health();

  // Verify extraction happened via processResult
  const processResult = result.processResult || {};
  const details = {
    documentId,
    embeddingStatus: result.chapter?.embeddingStatus,
    chunkCount: mongoChunks,
    topicCount: result.chapter?.topicCount,
    vectorCount: health.pointsCount,
    embeddingTimeMs,
    processKeys: Object.keys(processResult),
    indexResult: result.indexResult,
    message: result.message,
  };
  console.log(JSON.stringify(details, null, 2));

  if (!documentId) throw new Error("Ingest did not return documentId");
  if (mongoChunks < 1) throw new Error("No chunks created after ingest");

  pass("chunking", {
    chunkCount: mongoChunks,
    textExtraction: "ok",
    cleaning: "ok",
  });

  if (result.chapter?.embeddingStatus !== "indexed" && !result.indexResult?.indexed) {
    // Force reindex once
    const { reindexDocument } = await import("../src/rag/services/ingest.service.js");
    const re = await reindexDocument(documentId, { force: true });
    details.reindex = re;
    console.log("Reindex result:", re);
  }

  const chapterAfter = await (
    await import("../src/models/SourceUrl.js")
  ).default.findById(documentId).lean();
  if (chapterAfter?.embeddingStatus !== "indexed") {
    throw new Error(
      `Vector indexing failed: status=${chapterAfter?.embeddingStatus} err=${chapterAfter?.embeddingError}`
    );
  }

  pass("vectorStorage", {
    documentId,
    chunkCount: mongoChunks,
    vectorCount: (await qdrantService.health()).pointsCount,
    embeddingTimeMs,
    embeddingStatus: chapterAfter.embeddingStatus,
  });

  return { documentId, chunkCount: mongoChunks, embeddingTimeMs };
}

async function step6Search(searchKnowledgeBase, documentId) {
  console.log("\n========== STEP 6: Semantic Search ==========");
  const result = await searchKnowledgeBase({
    query: "1857 revolt",
    topK: 5,
    filters: { subject: SAMPLE_SUBJECT },
  });

  console.log(`Source: ${result.source} | Hits: ${result.count} | ${result.durationMs}ms`);
  for (const hit of result.chunks || []) {
    console.log(
      `\n#${hit.rank} score=${typeof hit.score === "number" ? hit.score.toFixed(4) : hit.score}`
    );
    console.log(`  Topic: ${hit.topic || hit.heading || "(none)"}`);
    console.log(`  Source: ${hit.source || "(none)"}`);
    console.log(`  Preview: ${(hit.text || "").slice(0, 160).replace(/\n/g, " ")}`);
  }

  if (result.source !== "qdrant") {
    throw new Error(`Expected qdrant search source, got: ${result.source}`);
  }
  if (!result.chunks?.length) {
    throw new Error("Semantic search returned 0 chunks");
  }

  pass("semanticSearch", {
    query: "1857 revolt",
    source: result.source,
    count: result.count,
    topScores: result.chunks.map((c) => c.score),
    documentId,
  });
  return result;
}

async function step7And8Generate(generateQuestionsFromRag, GeneratedQuestion) {
  console.log("\n========== STEP 7: Generate UPSC MCQs ==========");
  const before = await GeneratedQuestion.countDocuments();
  const result = await generateQuestionsFromRag({
    topic: SAMPLE_TOPIC,
    subject: SAMPLE_SUBJECT,
    difficulty: "Medium",
    count: 10,
    force: true,
  });

  if (result.insufficient || !result.questions?.length) {
    throw new Error(result.message || "Question generation returned insufficient context");
  }

  console.log(
    `Generated ${result.questions.length} questions | cached=${result.cached} | llmMs=${result.llmMs}`
  );
  for (let i = 0; i < Math.min(result.questions.length, 10); i += 1) {
    const q = result.questions[i];
    console.log(`\nQ${i + 1}. ${q.question}`);
    console.log(`  A) ${q.options.A}`);
    console.log(`  B) ${q.options.B}`);
    console.log(`  C) ${q.options.C}`);
    console.log(`  D) ${q.options.D}`);
    console.log(`  Correct: ${q.correctAnswer}`);
    console.log(`  Explanation: ${(q.explanation || "").slice(0, 200)}`);
    console.log(`  Source: ${q.source}`);
  }

  if (result.questions.length < 5) {
    throw new Error(`Expected ~10 questions, got ${result.questions.length}`);
  }

  pass("questionGeneration", {
    count: result.questions.length,
    difficulty: result.difficulty,
    retrievalSource: result.retrievalSource,
    matchedChunks: result.matchedChunks,
    llmMs: result.llmMs,
  });

  console.log("\n========== STEP 8: Verify Saved Questions ==========");
  const after = await GeneratedQuestion.countDocuments();
  const saved = await GeneratedQuestion.findOne({
    subject: SAMPLE_SUBJECT,
    topic: SAMPLE_TOPIC,
    difficulty: "Medium",
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!saved?.questions?.length) {
    throw new Error("Generated questions not found in MongoDB");
  }

  const cacheDetails = {
    beforeCount: before,
    afterCount: after,
    savedId: String(saved._id),
    savedQuestionCount: saved.questions.length,
    cacheKey: saved.cacheKey,
  };
  console.log(JSON.stringify(cacheDetails, null, 2));

  // Cache hit on second call
  const cached = await generateQuestionsFromRag({
    topic: SAMPLE_TOPIC,
    subject: SAMPLE_SUBJECT,
    difficulty: "Medium",
    count: 10,
    force: false,
  });
  if (!cached.cached) {
    throw new Error("Expected cache hit on second generate call");
  }
  pass("caching", { ...cacheDetails, secondCallCached: true });
  return result;
}

async function step9Health(getSystemHealth, collectionStats) {
  console.log("\n========== STEP 9: Health Checks ==========");
  const [system, stats] = await Promise.all([getSystemHealth(), collectionStats()]);

  // Quick search + generate smoke already done; mark modules
  const details = {
    MongoDB: system.mongodb,
    Qdrant: system.qdrant,
    EmbeddingProvider: `${system.embedding} (${system.embeddingProvider})`,
    LLM: system.llm,
    Search: report.semanticSearch.status === "PASS" ? "connected" : "disconnected",
    QuestionGenerator: report.questionGeneration.status === "PASS" ? "connected" : "disconnected",
    CollectionStats: {
      documents: stats.documents,
      chunks: stats.chunks,
      collection: stats.collection,
      qdrantPoints: stats.qdrant?.pointsCount,
    },
  };
  console.log(JSON.stringify(details, null, 2));

  const allConnected = [
    system.mongodb,
    system.qdrant,
    system.embedding,
    system.llm,
    details.Search,
    details.QuestionGenerator,
  ].every((s) => s === "connected");

  if (!allConnected) {
    throw new Error(`Health check incomplete: ${JSON.stringify(details)}`);
  }
  pass("health", details);
  return details;
}

function printFinalReport() {
  console.log("\n\n========================================");
  console.log("          RAG PIPELINE REPORT");
  console.log("========================================\n");

  const lines = [
    ["MongoDB", report.mongodb],
    ["Qdrant", report.qdrant],
    ["Embedding", report.embedding],
    ["Chunking", report.chunking],
    ["Vector Storage", report.vectorStorage],
    ["Semantic Search", report.semanticSearch],
    ["Question Generation", report.questionGeneration],
    ["Caching", report.caching],
  ];

  for (const [name, entry] of lines) {
    const icon = entry.status === "PASS" ? "✅ PASS" : "❌ FAIL";
    console.log(`${name}`);
    console.log(icon);
    if (entry.status !== "PASS" && entry.reason) {
      console.log(`  Reason: ${entry.reason}`);
    }
    console.log("");
  }

  const allPass = lines.every(([, e]) => e.status === "PASS");
  console.log("Overall");
  if (allPass) {
    console.log("🎉 RAG Pipeline Working Successfully");
  } else {
    console.log("❌ RAG Pipeline has failures — see details above");
  }
  return allPass;
}

async function main() {
  console.log("🚀 Starting UPSC RAG E2E Verification");
  console.log(`Env: EMBEDDING_PROVIDER=${process.env.EMBEDDING_PROVIDER}`);
  console.log(`Env: QDRANT_COLLECTION=${process.env.QDRANT_COLLECTION}`);
  console.log(`Env: EMBEDDING_DIMENSION=${process.env.EMBEDDING_DIMENSION}`);

  const { connectDB } = await import("../src/config/db.js");
  await connectDB();

  const mongoose = (await import("mongoose")).default;
  const { embeddingService } = await import("../src/services/ai/embedding.service.js");
  const { qdrantService } = await import("../src/services/ai/qdrant.service.js");
  const { ingestPdfDocument } = await import("../src/rag/services/ingest.service.js");
  const { searchKnowledgeBase } = await import("../src/rag/services/search.service.js");
  const { generateQuestionsFromRag } = await import("../src/rag/services/questionGen.service.js");
  const { getSystemHealth } = await import("../src/services/health.service.js");
  const { collectionStats } = await import("../src/rag/services/ingest.service.js");
  const ContentChunk = (await import("../src/models/ContentChunk.js")).default;
  const GeneratedQuestion = (await import("../src/rag/models/GeneratedQuestion.js")).default;

  // STEP 1
  try {
    await step1Mongo(mongoose);
  } catch (err) {
    fail("mongodb", err.message);
    throw err;
  }

  // STEP 2
  try {
    await step2Qdrant(qdrantService);
  } catch (err) {
    fail("qdrant", err.message);
    throw err;
  }

  // STEP 3
  try {
    await step3Embedding(embeddingService);
  } catch (err) {
    fail("embedding", err.message);
    throw err;
  }

  // STEP 4–5
  let documentId;
  try {
    const ingest = await step4And5Ingest({
      ingestPdfDocument,
      ContentChunk,
      qdrantService,
    });
    documentId = ingest.documentId;
  } catch (err) {
    fail("chunking", err.message);
    fail("vectorStorage", err.message);
    throw err;
  }

  // STEP 6
  try {
    await step6Search(searchKnowledgeBase, documentId);
  } catch (err) {
    fail("semanticSearch", err.message);
    throw err;
  }

  // STEP 7–8
  try {
    await step7And8Generate(generateQuestionsFromRag, GeneratedQuestion);
  } catch (err) {
    fail("questionGeneration", err.message);
    fail("caching", err.message);
    throw err;
  }

  // STEP 9
  try {
    await step9Health(getSystemHealth, collectionStats);
  } catch (err) {
    fail("health", err.message);
    throw err;
  }

  const ok = printFinalReport();
  await mongoose.disconnect().catch(() => null);
  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error("\n💥 E2E verification crashed:", err?.message || err);
  if (err?.stack) console.error(err.stack);
  printFinalReport();
  try {
    const mongoose = (await import("mongoose")).default;
    await mongoose.disconnect().catch(() => null);
  } catch {
    /* ignore */
  }
  process.exit(1);
});
