/**
 * PDF Processing Service
 * Node.js v22 + ESM SAFE
 * pdf-parse loaded via createRequire (CJS compatible)
 */

import fs from "fs";
import { createWorker } from "tesseract.js";

// ESM-compatible import for CJS-only pdf-parse, works everywhere
async function getPdfParse() {
  const mod = await import("pdf-parse");
  return mod.default || mod;
}

/* ===============================
   PDF TEXT EXTRACTION
================================ */
export const extractTextFromPDF = async (filePathOrBuffer) => {
  try {
    const buffer = Buffer.isBuffer(filePathOrBuffer)
      ? filePathOrBuffer
      : fs.readFileSync(filePathOrBuffer);

    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid or empty PDF buffer");
    }

    console.log(`📄 Parsing PDF (${buffer.length} bytes)`);

    const pdfParse = await getPdfParse();
    const data = await pdfParse(buffer);

    return {
      success: true,
      text: data.text || "",
      numPages: data.numpages || 1,
      info: data.info || {},
      metadata: data.metadata || {}
    };
  } catch (error) {
    console.error("❌ PDF parse error:", error);
    return {
      success: false,
      error: error.message || "PDF parsing failed"
    };
  }
};

/* ===============================
   SPLIT TEXT INTO PAGES
================================ */
export function splitTextIntoPages(text, numPages = 1) {
  if (!text) return [];

  let pages = text.split("\f");

  if (pages.length !== numPages) {
    const avg = Math.ceil(text.length / numPages);
    pages = Array.from({ length: numPages }, (_, i) =>
      text.slice(i * avg, (i + 1) * avg)
    );
  }

  return pages.map((pageText, index) => ({
    pageNumber: index + 1,
    text: pageText.trim(),
    wordCount: pageText.trim().split(/\s+/).filter(Boolean).length
  }));
}

/* ===============================
   OCR FOR SCANNED PDF
================================ */
export async function performOCR(imageBuffer) {
  const worker = await createWorker();
  try {
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    const {
      data: { text, confidence }
    } = await worker.recognize(imageBuffer);

    return { success: true, text, confidence };
  } catch (error) {
    console.error("OCR error:", error);
    return { success: false, error: error.message };
  } finally {
    await worker.terminate();
  }
}

/* ===============================
   SCANNED PDF DETECTION
================================ */
export function isScannedPDF(text, numPages) {
  const avgText = text.length / Math.max(numPages, 1);
  return avgText < 100;
}

/* ===============================
   ANSWER EXTRACTION
================================ */
export function extractAnswers(pages) {
  const answers = [];

  for (const page of pages) {
    if (!page.text || page.text.length < 50) continue;

    answers.push({
      questionNumber: `P${page.pageNumber}`,
      answerText: page.text,
      pageNumber: page.pageNumber,
      wordCount: page.wordCount,
      wordLimit: estimateWordLimit(page.wordCount),
      hasDiagram: detectDiagram(page.text)
    });
  }

  return answers;
}

function estimateWordLimit(words) {
  if (words > 200) return 250;
  if (words > 130) return 150;
  return 100;
}

function detectDiagram(text) {
  const keywords = [
    "diagram",
    "flowchart",
    "map",
    "graph",
    "figure",
    "→",
    "←",
    "↑",
    "↓"
  ];
  return keywords.some(k => text.toLowerCase().includes(k));
}

/* ===============================
   FULL PDF PIPELINE
================================ */
export async function processPDFForEvaluation(pdfBuffer, metadata = {}) {
  try {
    console.log("📄 Processing PDF for evaluation...");

    const extractResult = await extractTextFromPDF(pdfBuffer);
    if (!extractResult.success) return extractResult;

    const { text, numPages } = extractResult;

    const scanned = isScannedPDF(text, numPages);
    if (scanned) {
      console.log("⚠️ Scanned/low-text PDF detected");
    }

    const pages = splitTextIntoPages(text, numPages);
    const answers = extractAnswers(pages);

    console.log(`✅ Extracted ${answers.length} answers`);

    return {
      success: true,
      extractedAnswers: answers,
      metadata: {
        ...metadata,
        totalPages: numPages,
        totalAnswers: answers.length,
        scanned,
        processedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("processPDFForEvaluation error:", error);
    return {
      success: false,
      error: error.message || "PDF evaluation failed"
    };
  }
}

/* ===============================
   EXPORT DEFAULT
================================ */
export default {
  extractTextFromPDF,
  splitTextIntoPages,
  performOCR,
  isScannedPDF,
  extractAnswers,
  processPDFForEvaluation
};
