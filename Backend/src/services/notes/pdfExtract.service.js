/**
 * PDF text extraction for Topic Practice notes (Step 2).
 * Prefers pdfjs-dist for per-page text; falls back to pdf-parse.
 */

import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const SCANNED_PDF_MESSAGE =
  "No text could be extracted from this PDF. It may be scanned (image-only). Use a text-selectable PDF or OCR first.";

/** pdfjs standard fonts dir — avoids `standardFontDataUrl` console spam on Node. */
function getPdfJsStandardFontDataUrl() {
  try {
    const pkg = path.dirname(require.resolve("pdfjs-dist/package.json"));
    return `${pathToFileURL(path.join(pkg, "standard_fonts")).href}/`;
  } catch {
    return undefined;
  }
}

/**
 * Normalize extracted page / document text.
 * @param {string} text
 */
export function cleanExtractedText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ pages: { pageNumber: number, text: string }[], fullText: string, numPages: number }>}
 */
async function extractWithPdfJs(buffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const standardFontDataUrl = getPdfJsStandardFontDataUrl();
  const loadingTask = pdfjsLib.getDocument({
    data,
    ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
    // Text extract only — skip font face loading / noisy TrueType warnings
    disableFontFace: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages = [];

  for (let i = 1; i <= numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const raw = (content.items || [])
      .map((item) => (item && typeof item.str === "string" ? item.str : ""))
      .join(" ");
    const text = cleanExtractedText(raw);
    pages.push({ pageNumber: i, text });
  }

  const fullText = pages
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n\n");

  return { pages, fullText: cleanExtractedText(fullText), numPages };
}

/**
 * pdf-parse returns one blob; approximate page splits via form-feed when present.
 * @param {Buffer} buffer
 */
async function extractWithPdfParse(buffer) {
  const data = await pdfParse(buffer, { max: 0 });
  const raw = cleanExtractedText(data.text || "");
  const numPages = data.numpages || 1;

  let pages;
  if (raw.includes("\f")) {
    const parts = raw.split(/\f/);
    pages = parts.map((part, idx) => ({
      pageNumber: idx + 1,
      text: cleanExtractedText(part),
    }));
  } else if (numPages <= 1) {
    pages = [{ pageNumber: 1, text: raw }];
  } else {
    // Soft split by paragraphs across pages — better than one giant page unknown.
    const paras = raw.split(/\n{2,}/).filter(Boolean);
    const perPage = Math.max(1, Math.ceil(paras.length / numPages));
    pages = [];
    for (let i = 0; i < numPages; i += 1) {
      const slice = paras.slice(i * perPage, (i + 1) * perPage);
      pages.push({
        pageNumber: i + 1,
        text: cleanExtractedText(slice.join("\n\n")),
      });
    }
  }

  const fullText = pages
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n\n");

  return { pages, fullText: cleanExtractedText(fullText), numPages: pages.length || numPages };
}

/**
 * Extract text with page metadata from a PDF buffer.
 * @param {Buffer} buffer
 * @returns {Promise<{ pages: { pageNumber: number, text: string }[], fullText: string, numPages: number }>}
 */
export async function extractPdfDocument(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid PDF buffer");
  }

  const header = buffer.slice(0, 4).toString();
  if (header !== "%PDF") {
    throw new Error("Invalid PDF file (missing PDF header)");
  }

  let result = null;

  try {
    result = await extractWithPdfJs(buffer);
  } catch (err) {
    console.warn("[notesPdfExtract] pdfjs failed:", err?.message || err);
  }

  if (!result?.fullText) {
    try {
      result = await extractWithPdfParse(buffer);
    } catch (err) {
      console.warn("[notesPdfExtract] pdf-parse failed:", err?.message || err);
    }
  }

  if (!result?.fullText) {
    throw new Error(SCANNED_PDF_MESSAGE);
  }

  return result;
}

export const notesPdfExtractService = {
  extractPdfDocument,
  cleanExtractedText,
};
