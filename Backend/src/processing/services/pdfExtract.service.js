/**
 * Local PDF text extraction + scanned detection.
 * Uses pdfjs-dist / pdf-parse already in the project.
 */

import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
import { normalizeWhitespace, wordCount } from "../utils/helpers.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const MIN_CHARS_PER_PAGE = Number(process.env.PROCESSING_MIN_CHARS_PER_PAGE || 40);

function getPdfJsStandardFontDataUrl() {
  try {
    const pkg = path.dirname(require.resolve("pdfjs-dist/package.json"));
    return `${pathToFileURL(path.join(pkg, "standard_fonts")).href}/`;
  } catch {
    return undefined;
  }
}

async function extractWithPdfJs(buffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const standardFontDataUrl = getPdfJsStandardFontDataUrl();
  const loadingTask = pdfjsLib.getDocument({
    data,
    ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
    disableFontFace: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const raw = (content.items || [])
      .map((item) => (item && typeof item.str === "string" ? item.str : ""))
      .join(" ");
    const text = normalizeWhitespace(raw);
    pages.push({
      pageNumber: i,
      text,
      headings: [],
      tables: [],
      footnotes: [],
      references: [],
      imagesMetadata: [],
      hasImages: false,
      imageCount: 0,
    });
  }

  return {
    provider: "pdfjs",
    pages,
    fullText: normalizeWhitespace(pages.map((p) => p.text).join("\n\n")),
    numPages: pdf.numPages,
  };
}

async function extractWithPdfParse(buffer) {
  const data = await pdfParse(buffer, { max: 0 });
  const raw = normalizeWhitespace(data.text || "");
  const numPages = data.numpages || 1;
  let pages;
  if (raw.includes("\f")) {
    pages = raw.split(/\f/).map((part, idx) => ({
      pageNumber: idx + 1,
      text: normalizeWhitespace(part),
      headings: [],
      tables: [],
      footnotes: [],
      references: [],
      imagesMetadata: [],
    }));
  } else {
    pages = [{ pageNumber: 1, text: raw, headings: [], tables: [], footnotes: [], references: [], imagesMetadata: [] }];
  }
  return { provider: "pdf-parse", pages, fullText: raw, numPages };
}

export async function extractLocalPdf(buffer) {
  try {
    return await extractWithPdfJs(buffer);
  } catch (err) {
    console.warn("[processing] pdfjs failed, falling back to pdf-parse:", err?.message);
    return extractWithPdfParse(buffer);
  }
}

/**
 * Heuristic: scanned if average extractable text is very low.
 */
export function detectScannedPdf(extraction) {
  const pages = extraction?.pages || [];
  if (!pages.length) return true;
  const totalChars = pages.reduce((s, p) => s + String(p.text || "").length, 0);
  const avg = totalChars / pages.length;
  const emptyRatio =
    pages.filter((p) => String(p.text || "").length < MIN_CHARS_PER_PAGE).length /
    pages.length;
  return avg < MIN_CHARS_PER_PAGE || emptyRatio >= 0.6;
}

export async function extractPlainText(buffer, extension) {
  const text = normalizeWhitespace(buffer.toString("utf8"));
  return {
    provider: "plaintext",
    pages: [{ pageNumber: 1, text, headings: [], tables: [], footnotes: [], references: [], imagesMetadata: [] }],
    fullText: text,
    numPages: 1,
    extension,
    wordCount: wordCount(text),
  };
}
