/**
 * PDF Processing Service
 * Node.js v22 + ESM Compatible
 * Uses CommonJS bridge for pdf-parse stability
 */

import { createRequire } from "module";

// Create CommonJS require for pdf-parse compatibility
const require = createRequire(import.meta.url);

// Load pdf-parse once at module level for better performance and reliability
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
    // Convert Buffer to Uint8Array as required by pdf-parse v2.4.5+
    const uint8Array = new Uint8Array(buffer);

    // Create PDF parser instance with options
    const parser = new pdfParse.PDFParse(uint8Array, {
      verbosity: 0, // Disable verbose output
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
    });

    // Load the PDF
    await parser.load();

    // Extract text content
    const result = await parser.getText();

    // Extract and clean the text content
    const extractedText = result.text || "";

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
    // Convert Buffer to Uint8Array as required by pdf-parse v2.4.5+
    const uint8Array = new Uint8Array(buffer);

    // Create PDF parser instance with options
    const parser = new pdfParse.PDFParse(uint8Array, {
      verbosity: 0, // Disable verbose output
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
    });

    // Load the PDF
    await parser.load();

    // Get document info
    const info = await parser.getInfo();

    // Extract text content
    const textResult = await parser.getText();

    return {
      success: true,
      text: textResult.text || "",
      numPages: info.numPages || 1,
      info: info || {},
      metadata: info.metadata || {}
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

    const extractResult = await extractTextFromPDFWithMetadata(pdfBuffer);
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
