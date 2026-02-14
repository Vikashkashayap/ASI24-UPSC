/**
 * PDF Processing Service
 * Node.js v22 + ESM Compatible
 * Uses CommonJS bridge for pdf-parse compatibility
 * Enhanced with OCR support for scanned PDFs
 */

import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";
import { createWorker } from "tesseract.js";

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

  // Check PDF header
  const pdfHeader = buffer.slice(0, 4).toString();
  if (pdfHeader !== '%PDF') {
    throw new Error("Invalid PDF file: File does not appear to be a valid PDF (missing PDF header)");
  }

  try {
    // Additional PDF validation - check for PDF structure markers
    const pdfString = buffer.toString('binary', 0, Math.min(1024, buffer.length));
    if (!pdfString.includes('%PDF') && !pdfString.includes('xref') && !pdfString.includes('trailer')) {
      throw new Error("Invalid PDF file: File does not appear to be a valid PDF structure");
    }

    // Use official pdf-parse function directly with error handling
    let data;
    try {
      data = await pdfParse(buffer, {
        max: 0, // No page limit
        version: 'v1.10.100'
      });
    } catch (parseError) {
      // Catch pdf-parse specific errors
      console.error("PDF parse error:", parseError.message);
      
      // Handle bad XRef entry specifically
      if (parseError.message && (
        parseError.message.includes("bad XRef entry") || 
        parseError.message.includes("XRef") ||
        parseError.message.includes("FormatError") ||
        parseError.details?.includes("bad XRef entry")
      )) {
        throw new Error("PDF_CORRUPTED: The PDF file appears to be corrupted or has an invalid structure. Please try re-saving the PDF in a PDF editor or use a different PDF file.");
      }
      
      // Re-throw with better context
      throw parseError;
    }
    
    const extractedText = data.text || "";

    if (!extractedText || extractedText.trim().length === 0) {
      console.log("No text extracted - attempting OCR for image-only PDF...");
      const ocrResult = await extractTextWithOCR(buffer);
      if (ocrResult.success && ocrResult.text?.trim()) {
        return ocrResult.text.trim();
      }
      throw new Error(
        ocrResult.error || "PDF parsing succeeded but no text was extracted. The PDF may be image-only or corrupted."
      );
    }

    // Return clean text, trimmed of excess whitespace
    return extractedText.trim();

  } catch (error) {
    // Log error for debugging but throw clean error message
    console.error("PDF processing error:", error.message);
    if (error.details) {
      console.error("Error details:", error.details);
    }

    // Handle specific pdf-parse errors
    if (error.message.includes("bad XRef entry") || 
        error.message.includes("XRef") ||
        error.details?.includes("bad XRef entry") ||
        error.details?.includes("FormatError")) {
      throw new Error("PDF_CORRUPTED: PDF file appears to be corrupted or has invalid structure. Please try re-saving the PDF or use a different PDF file.");
    }

    if (error.message.includes("FormatError") || error.details?.includes("FormatError")) {
      throw new Error("PDF_FORMAT_ERROR: The file may be corrupted, encrypted, or in an unsupported format. Please ensure the PDF is not password-protected.");
    }

    if (error.message.includes("PDF_CORRUPTED") || error.message.includes("PDF_FORMAT_ERROR")) {
      throw error; // Re-throw our custom errors
    }

    if (error.message.includes("verbosity")) {
      throw new Error("PDF parsing failed: Invalid PDF structure");
    }

    if (error.message.includes("Class constructors")) {
      throw new Error("PDF parsing failed: Compatibility issue");
    }

    if (error.message.includes("Uint8Array")) {
      throw new Error("PDF parsing failed: Invalid buffer format");
    }

    if (error.message.includes("password") || error.message.includes("encrypted")) {
      throw new Error("PDF is password-protected or encrypted. Please remove the password and try again.");
    }

    // Generic error for other cases
    throw new Error(`PDF processing failed: ${error.message || 'Unknown error'}`);
  }
}

/* ===============================
   PDF TEXT EXTRACTION WITH METADATA
================================ */
export const extractTextFromPDFWithMetadata = async (buffer) => {
  try {
    // Validate buffer first
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return {
        success: false,
        error: "Invalid PDF buffer: Buffer is empty or not a valid Buffer object"
      };
    }

    // Check if buffer starts with PDF magic bytes
    const pdfHeader = buffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      return {
        success: false,
        error: "Invalid PDF file: File does not appear to be a valid PDF (missing PDF header)"
      };
    }

    // Use official pdf-parse function directly with better error handling
    let data;
    try {
      data = await pdfParse(buffer, {
        // Add options to handle corrupted PDFs better
        max: 0, // No page limit
        version: 'v1.10.100' // Use specific version
      });
    } catch (parseError) {
      // Catch pdf-parse specific errors early
      console.error("PDF parse error details:", {
        message: parseError.message,
        details: parseError.details,
        stack: parseError.stack?.substring(0, 200)
      });
      
      // Handle bad XRef entry specifically
      if (parseError.message && (
        parseError.message.includes("bad XRef entry") || 
        parseError.message.includes("XRef") ||
        parseError.message.includes("FormatError") ||
        parseError.details?.includes("bad XRef entry") ||
        parseError.details?.includes("FormatError")
      )) {
        return {
          success: false,
          error: "PDF file appears to be corrupted or has invalid structure (bad XRef entry). Please try re-saving the PDF in a PDF editor (like Adobe Acrobat) or use a different PDF file.",
          originalError: parseError.message || "bad XRef entry"
        };
      }
      
      // Re-throw to be caught by outer catch
      throw parseError;
    }

    // Validate extracted data
    if (!data || typeof data.text === 'undefined') {
      return {
        success: false,
        error: "PDF parsing succeeded but no text was extracted. The PDF may be corrupted or image-only."
      };
    }

    return {
      success: true,
      text: data.text || "",
      numPages: data.numpages || 1,
      info: data.info || {},
      metadata: data.metadata || {}
    };
  } catch (error) {
    console.error("PDF parse error:", error);
    console.error("Error details:", error.details);
    
    // Provide specific error messages for common issues
    let errorMessage = "PDF parsing failed";
    
    if (error.message) {
      if (error.message.includes('bad XRef entry') || 
          error.message.includes('XRef') ||
          error.details?.includes('bad XRef entry')) {
        errorMessage = "PDF file appears to be corrupted or has invalid structure (bad XRef entry). Please try re-saving the PDF in a PDF editor (like Adobe Acrobat) or use a different PDF file.";
      } else if (error.message.includes('FormatError') || error.details?.includes('FormatError')) {
        errorMessage = "PDF format error: The file may be corrupted, encrypted, or in an unsupported format. Please ensure the PDF is not password-protected and try again.";
      } else if (error.message.includes('Invalid PDF')) {
        errorMessage = "Invalid PDF file: The file does not appear to be a valid PDF document.";
      } else if (error.message.includes('password') || error.message.includes('encrypted')) {
        errorMessage = "PDF is password-protected or encrypted. Please remove the password and try again.";
      } else {
        errorMessage = `PDF parsing failed: ${error.message}`;
      }
    } else if (error.details) {
      if (error.details.includes('bad XRef entry') || error.details.includes('FormatError')) {
        errorMessage = "PDF file appears to be corrupted or has invalid structure. Please try re-saving the PDF or use a different PDF file.";
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      originalError: error.message || error.details || "Unknown error"
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
   OCR PREPROCESSING (300 DPI + GRAYSCALE)
================================ */
/** Target DPI for OCR: 72 * scale ≈ 300 => scale ≈ 4.17 */
const OCR_SCALE = 4.17;

/**
 * Preprocess image for better OCR: grayscale + optional sharpening.
 * Uses sharp if available; otherwise returns buffer as-is.
 */
async function preprocessImageForOCR(imgBuffer) {
  try {
    const sharp = (await import("sharp")).default;
    const processed = await sharp(imgBuffer)
      .grayscale()
      .normalize()
      .toBuffer();
    return processed;
  } catch (err) {
    console.warn("Sharp preprocessing unavailable, using raw image:", err.message);
    return imgBuffer;
  }
}

/* ===============================
   OCR TEXT EXTRACTION
================================ */
/**
 * Extracts text from scanned/image-only PDF using OCR (pdf-to-img + Tesseract).
 * Preprocessing: ~300 DPI (scale 4.17), grayscale via sharp for better accuracy.
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{success: boolean, text: string, confidence: number, error?: string}>}
 */
export async function extractTextWithOCR(pdfBuffer) {
  let worker = null;
  let tempPath = null;
  try {
    console.log("🔍 Starting OCR processing for image-only PDF (300 DPI, grayscale)...");

    const { pdf } = await import("pdf-to-img");
    tempPath = path.join(os.tmpdir(), `prelims-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    fs.writeFileSync(tempPath, pdfBuffer);

    /** ~300 DPI: 72 * 4.17 ≈ 300 */
    const doc = await pdf(tempPath, { scale: OCR_SCALE });

    if (!doc || doc.length < 1) {
      return {
        success: false,
        text: "",
        confidence: 0,
        error: "PDF has no pages or could not be converted to images.",
      };
    }

    const langList = ["eng", "hin+eng"];
    for (const lang of langList) {
      try {
        worker = await createWorker(lang, 1, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        break;
      } catch (workerErr) {
        console.warn(`OCR worker ${lang} failed:`, workerErr.message);
        if (worker) try { await worker.terminate(); } catch (_) {}
        worker = null;
      }
    }
    if (!worker) {
      return {
        success: false,
        text: "",
        confidence: 0,
        error: "OCR worker could not be created (hin+eng or eng).",
      };
    }

    const pageTexts = [];
    let totalConfidence = 0;

    for (let pageNum = 1; pageNum <= doc.length; pageNum++) {
      let imgBuffer = await doc.getPage(pageNum);
      if (!imgBuffer || (Buffer.isBuffer(imgBuffer) && imgBuffer.length === 0)) {
        console.warn(`OCR: page ${pageNum} returned empty image`);
        pageTexts.push("");
        continue;
      }
      imgBuffer = await preprocessImageForOCR(imgBuffer);
      const {
        data: { text, confidence },
      } = await worker.recognize(imgBuffer);
      pageTexts.push(text || "");
      totalConfidence += confidence || 0;
      console.log(`OCR page ${pageNum}/${doc.length} done`);
    }

    await worker.terminate();
    worker = null;
    const fullText = pageTexts.join("\n\n").trim();
    const avgConfidence = doc.length > 0 ? totalConfidence / doc.length : 0;

    return {
      success: fullText.length > 0,
      text: fullText,
      confidence: avgConfidence / 100,
      error: fullText.length === 0 ? "OCR produced no text." : undefined,
    };
  } catch (error) {
    console.error("OCR Error:", error);
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {}
    }
    return {
      success: false,
      text: "",
      confidence: 0,
      error: error.message || "OCR processing failed",
    };
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
    }
  }
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
   FULL PDF PIPELINE WITH OCR SUPPORT
================================ */
export async function processPDFForEvaluation(pdfBuffer, metadata = {}) {
  try {
    console.log("📄 Processing PDF for evaluation...");

    // Step 1: Try standard text extraction first
    const extractResult = await extractTextFromPDFWithMetadata(pdfBuffer);
    if (!extractResult.success) {
      return extractResult;
    }

    const { text, numPages } = extractResult;

    // Step 2: Check if PDF is scanned (low text content)
    const scanned = isScannedPDF(text, numPages);
    let finalText = text;
    let confidenceScore = 0.95; // High confidence for text-based PDFs
    let usedOCR = false;

    // Step 3: If scanned, attempt OCR (if implemented)
    if (scanned && text.length < 50) {
      console.log("⚠️ Scanned/low-text PDF detected. Attempting OCR...");
      const ocrResult = await extractTextWithOCR(pdfBuffer);
      
      if (ocrResult.success && ocrResult.confidence >= 0.7) {
        finalText = ocrResult.text;
        confidenceScore = ocrResult.confidence;
        usedOCR = true;
        console.log(`✅ OCR successful. Confidence: ${(confidenceScore * 100).toFixed(1)}%`);
      } else {
        // OCR failed or low confidence
        console.warn("⚠️ OCR failed or low confidence. Using extracted text.");
        if (ocrResult.error) {
          console.warn(`OCR Error: ${ocrResult.error}`);
        }
        // Continue with low-confidence text extraction
        confidenceScore = 0.3; // Low confidence for scanned PDFs without OCR
      }
    }

    // Step 4: Validate confidence score
    if (confidenceScore < 0.7 && !usedOCR) {
      return {
        success: false,
        error: `Low text extraction confidence (${(confidenceScore * 100).toFixed(1)}%). The PDF appears to be scanned. Please ensure the PDF contains selectable text, or re-upload a text-based PDF.`,
        confidence_score: confidenceScore,
        requires_ocr: true
      };
    }

    // Step 5: Split into pages and extract answers
    const pages = splitTextIntoPages(finalText, numPages);
    const answers = extractAnswers(pages);

    // Step 6: Enhanced question detection
    const enhancedAnswers = await enhanceQuestionDetection(answers, finalText);

    console.log(`✅ Extracted ${enhancedAnswers.length} answers`);
    console.log(`📊 Confidence Score: ${(confidenceScore * 100).toFixed(1)}%`);

    return {
      success: true,
      extractedAnswers: enhancedAnswers,
      raw_text: finalText, // Store raw text for user preview
      confidence_score: confidenceScore,
      metadata: {
        ...metadata,
        totalPages: numPages,
        totalAnswers: enhancedAnswers.length,
        isScanned: scanned,
        usedOCR: usedOCR,
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
   ENHANCED QUESTION DETECTION
================================ */
/**
 * Improves question detection and mapping
 */
async function enhanceQuestionDetection(answers, fullText) {
  const enhancedAnswers = [];
  
  // Common UPSC question patterns
  const questionPatterns = [
    // Pattern 1: Q.1, Q1, Question 1
    /(?:Q\.?\s*|Question\s+)(\d+)[.:\s]+(.+?)(?=(?:Q\.?\s*|Question\s+)\d+|$)/gis,
    // Pattern 2: Just numbers followed by text
    /^(\d+)[.)\s]+(.+?)(?=^\d+[.)]|$)/gims,
    // Pattern 3: Section markers (Q1(a), Q2(b))
    /(?:Q|Question)\s*(\d+)(?:\([a-z]\))?[.:\s]+(.+?)(?=(?:Q|Question)\s*\d+|$)/gis,
  ];

  // Try to detect questions in full text
  const detectedQuestions = [];
  for (const pattern of questionPatterns) {
    const matches = [...fullText.matchAll(pattern)];
    if (matches.length > 0) {
      for (const match of matches) {
        detectedQuestions.push({
          questionNumber: match[1] || 'Unknown',
          questionText: (match[2] || '').trim().substring(0, 300),
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
      break; // Use first matching pattern
    }
  }

  // Map answers to detected questions
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    
    // Try to find matching question
    const matchingQuestion = detectedQuestions.find(q => 
      q.questionNumber === answer.questionNumber.replace('P', '') ||
      q.questionNumber === String(i + 1)
    );

    enhancedAnswers.push({
      ...answer,
      questionText: matchingQuestion?.questionText || answer.questionText || `Question ${answer.questionNumber}`,
      questionNumber: matchingQuestion?.questionNumber || answer.questionNumber,
      // Flag if question is missing
      questionDetected: !!matchingQuestion
    });
  }

  return enhancedAnswers;
}
