/**
 * PDF Processing Service
 * Node.js v22 + ESM Compatible
 * Uses CommonJS bridge for pdf-parse compatibility
 */

import { createRequire } from "module";

// Create CommonJS require for pdf-parse compatibility
const require = createRequire(import.meta.url);

// Compatible with pdf-parse@1.1.1 (CommonJS)
const pdfParse = require("pdf-parse");

/**
 * Extracts text content from PDF buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} Extracted text content
 * @throws {Error} If PDF processing fails or buffer is invalid
 */
export async function extractTextFromPDF(buffer) {
  // Validate input buffer
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer");
  }

  if (buffer.length === 0) {
    throw new Error("PDF buffer is empty");
  }

  try {
    // Use official pdf-parse function directly
    const data = await pdfParse(buffer);
    const extractedText = data.text || "";
    // Return clean text, trimmed of excess whitespace
    return extractedText.trim();

  } catch (error) {
    // Log error for debugging but throw clean error message
    console.error("PDF processing error:", error.message);

    // Handle specific pdf-parse errors
    if (error.message.includes("verbosity")) {
      throw new Error("PDF parsing failed: Invalid PDF structure");
    }

    if (error.message.includes("Class constructors")) {
      throw new Error("PDF parsing failed: Compatibility issue");
    }

    if (error.message.includes("Uint8Array")) {
      throw new Error("PDF parsing failed: Invalid buffer format");
    }

    // Generic error for other cases
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

/* ===============================
   PDF TEXT EXTRACTION WITH METADATA
================================ */
export const extractTextFromPDFWithMetadata = async (buffer) => {
  try {
    // Use official pdf-parse function directly
    const data = await pdfParse(buffer);
    return {
      success: true,
      text: data.text || "",
      numPages: data.numpages || 1,
      info: data.info || {},
      metadata: data.metadata || {}
    };
  } catch (error) {
    console.error("PDF parse error:", error);
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
  const diagramKeywords = [
    // Direct diagram terms
    "diagram", "flowchart", "flow chart", "flow-chart",
    "map", "graph", "chart", "figure", "illustration",
    "structure", "framework", "model", "process",

    // Visual elements
    "→", "←", "↑", "↓", "⇒", "⇐", "⇑", "⇓",
    "----", "====", "••••",

    // Process/flow terms
    "stages", "phases", "steps", "levels", "hierarchy",
    "cycle", "sequence", "progression", "evolution",

    // Organizational terms
    " pyramid", "matrix", "tree", "network", "system",

    // UPSC specific
    "administrative structure", "constitutional framework",
    "policy framework", "governance model", "decision making process"
  ];

  const lowerText = text.toLowerCase();

  // Check for multiple diagram indicators
  let diagramScore = 0;
  diagramKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      diagramScore += 1;
    }
  });

  // Additional checks for diagram-like content
  if (lowerText.includes('below') && lowerText.includes('shown')) diagramScore += 2;
  if (lowerText.includes('as follows') && lowerText.includes(':')) diagramScore += 1;
  if (/\(\d+\)/g.test(text) && diagramScore > 0) diagramScore += 1; // Numbered elements

  return diagramScore >= 2; // Require at least 2 indicators for diagram detection
}

/* ===============================
   FULL PDF PIPELINE
================================ */
export async function processPDFForEvaluation(pdfBuffer, metadata = {}) {
  try {
    console.log("📄 Processing PDF for evaluation...");

    const extractResult = await extractTextFromPDFWithMetadata(pdfBuffer);
    if (!extractResult.success) return extractResult;

    const { text, numPages } = extractResult;

    const scanned = isScannedPDF(text, numPages);
    if (scanned) {
      console.log("⚠️ Scanned/low-text PDF detected");
    }

    const pages = splitTextIntoPages(text, numPages);

    // Extract basic answers (fallback)
    const answers = extractAnswers(pages);

    // Also return raw page texts for question detection
    const pageTexts = pages.map(page => ({
      pageNumber: page.pageNumber,
      text: page.text,
      wordCount: page.wordCount
    }));

    console.log(`✅ Extracted ${answers.length} basic answers from ${pages.length} pages`);

    return {
      success: true,
      extractedAnswers: answers,
      pageTexts: pageTexts, // Raw page texts for question detection
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
