import fs from "fs";
import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";
import { createWorker } from "tesseract.js";

/**
 * PDF Processing Service
 * Handles PDF parsing, OCR, and text extraction
 */

/**
 * Extract text from PDF using pdf-parse
 */
export const extractTextFromPDF = async (filePathOrBuffer) => {
  try {
    const buffer = Buffer.isBuffer(filePathOrBuffer) 
      ? filePathOrBuffer 
      : fs.readFileSync(filePathOrBuffer);
    const pdfParser = new PDFParse({ data: buffer });
    const textResult = await pdfParser.getText();
    const infoResult = await pdfParser.getInfo();
    await pdfParser.destroy();
    
    return {
      success: true,
      text: textResult.text,
      numPages: textResult.total || 1,
      info: infoResult.info,
      metadata: infoResult.metadata
    };
  } catch (error) {
    console.error("PDF parse error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Split PDF text into pages
 * This is a heuristic approach since pdf-parse doesn't provide page boundaries directly
 */
export function splitTextIntoPages(text, numPages) {
  // Try to split by form feed character (page break)
  let pages = text.split('\f');
  
  // If that doesn't work well, split by estimated length
  if (pages.length !== numPages && pages.length < numPages) {
    const avgLength = Math.ceil(text.length / numPages);
    pages = [];
    
    for (let i = 0; i < numPages; i++) {
      const start = i * avgLength;
      const end = start + avgLength;
      pages.push(text.substring(start, end));
    }
  }

  return pages.map((pageText, index) => ({
    pageNumber: index + 1,
    text: pageText.trim(),
    wordCount: pageText.trim().split(/\s+/).length
  }));
}

/**
 * Perform OCR on image buffer (for scanned PDFs)
 */
export async function performOCR(imageBuffer) {
  const worker = await createWorker();
  
  try {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    const { data: { text, confidence } } = await worker.recognize(imageBuffer);
    
    await worker.terminate();
    
    return {
      success: true,
      text,
      confidence
    };
  } catch (error) {
    console.error("Error performing OCR:", error);
    await worker.terminate();
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Detect if PDF is handwritten/scanned (low text content)
 */
export function isScannedPDF(extractedText, numPages) {
  const textLength = extractedText.trim().length;
  const avgTextPerPage = textLength / numPages;
  
  // If less than 100 characters per page on average, likely scanned
  return avgTextPerPage < 100;
}

/**
 * Extract answers with question detection
 */
export function extractAnswers(pages) {
  const answers = [];
  let questionCounter = 1;

  for (const page of pages) {
    const { pageNumber, text } = page;

    // Patterns to detect questions
    const questionPatterns = [
      /Q\.?\s*(\d+)[.:\s)]+(.*?)(?=Q\.?\s*\d+|$)/gis,
      /(\d+)[.)\s]+(.*?)(?=\d+[.)]|$)/gis,
      /Question\s+(\d+)[.:\s)]+(.*?)(?=Question\s+\d+|$)/gis,
    ];

    let detectedAnswers = [];
    let patternFound = false;

    // Try each pattern
    for (const pattern of questionPatterns) {
      const matches = [...text.matchAll(pattern)];
      
      if (matches.length > 0) {
        detectedAnswers = matches.map(match => {
          const questionNum = match[1] || questionCounter++;
          const answerText = match[2] ? match[2].trim() : match[0].trim();
          
          return {
            questionNumber: questionNum,
            answerText,
            pageNumber,
            wordCount: answerText.split(/\s+/).length,
            wordLimit: estimateWordLimit(answerText.length),
            hashedDiagram: detectDiagram(answerText)
          };
        });
        
        patternFound = true;
        break;
      }
    }

    // If no pattern found, treat whole page as one answer
    if (!patternFound && text.trim().length > 50) {
      detectedAnswers.push({
        questionNumber: `P${pageNumber}`,
        answerText: text.trim(),
        pageNumber,
        wordCount: text.trim().split(/\s+/).length,
        wordLimit: estimateWordLimit(text.length),
        hashedDiagram: detectDiagram(text)
      });
    }

    answers.push(...detectedAnswers);
  }

  return answers;
}

/**
 * Estimate word limit based on answer length
 */
function estimateWordLimit(textLength) {
  const wordCount = textLength / 5; // Rough estimate: 5 chars per word
  
  if (wordCount > 200) return 250;
  if (wordCount > 130) return 150;
  return 100;
}

/**
 * Detect if answer contains diagrams/flowcharts
 * Simple heuristic based on keywords
 */
function detectDiagram(text) {
  const diagramKeywords = [
    'diagram', 'flowchart', 'chart', 'graph', 'map',
    'figure', 'illustration', '→', '←', '↑', '↓',
    '|', '─', '┌', '└', '├', '│', '══', '║'
  ];

  const lowerText = text.toLowerCase();
  return diagramKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Process entire PDF for evaluation
 */
export async function processPDFForEvaluation(pdfBuffer, metadata = {}) {
  console.log("📄 Processing PDF for evaluation...");

  // Step 1: Extract text from PDF
  const extractResult = await extractTextFromPDF(pdfBuffer);
  
  if (!extractResult.success) {
    return {
      success: false,
      error: "Failed to extract text from PDF"
    };
  }

  const { text, numPages } = extractResult;
  console.log(`📊 Extracted ${numPages} pages`);

  // Step 2: Check if scanned (might need OCR)
  const isScanned = isScannedPDF(text, numPages);
  
  if (isScanned) {
    console.log("🔍 Detected scanned/handwritten PDF - OCR might be needed");
    // Note: Full OCR implementation would require converting PDF pages to images
    // For now, we'll work with whatever text was extracted
  }

  // Step 3: Split into pages
  const pages = splitTextIntoPages(text, numPages);
  console.log(`📑 Split into ${pages.length} pages`);

  // Step 4: Extract answers with question detection
  const extractedAnswers = extractAnswers(pages);
  console.log(`✅ Detected ${extractedAnswers.length} answers`);

  // Step 5: Add question text (would be better with actual question paper)
  const answersWithQuestions = extractedAnswers.map(answer => ({
    ...answer,
    questionText: `Question ${answer.questionNumber}`, // Placeholder
    subject: metadata.subject || "General Studies",
    paper: metadata.paper || "Unknown",
    year: metadata.year || new Date().getFullYear()
  }));

  return {
    success: true,
    extractedAnswers: answersWithQuestions,
    metadata: {
      ...metadata,
      totalPages: numPages,
      totalAnswers: extractedAnswers.length,
      isScanned,
      processedAt: new Date().toISOString()
    }
  };
}

export default {
  extractTextFromPDF,
  splitTextIntoPages,
  performOCR,
  isScannedPDF,
  extractAnswers,
  processPDFForEvaluation
};
