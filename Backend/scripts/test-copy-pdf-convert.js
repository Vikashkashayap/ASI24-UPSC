/**
 * Quick test: PDF buffer → images (pdf-to-img)
 * Run: node scripts/test-copy-pdf-convert.js
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { pdfBufferToImages, imageBufferToPages } from "../src/services/copyFileService.js";

async function createSamplePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 300]);
  page.drawText("UPSC Test Answer Copy", { x: 50, y: 250, size: 18, font, color: rgb(0, 0, 0) });
  page.drawText("Sample handwritten-style evaluation test page.", {
    x: 50,
    y: 200,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  return Buffer.from(await doc.save());
}

async function main() {
  console.log("Creating sample PDF...");
  const pdfBuffer = await createSamplePdf();

  console.log("Converting PDF to images...");
  const result = await pdfBufferToImages(pdfBuffer, { scale: 2 });
  console.log("✅ PDF conversion OK:", {
    totalPages: result.totalPages,
    processedPages: result.processedPages,
    firstPageBase64Length: result.pages[0]?.base64?.length,
    mimeType: result.pages[0]?.mimeType,
  });

  console.log("Testing image buffer path...");
  const fakePng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const imgPages = imageBufferToPages(fakePng, "image/png", "test.png");
  console.log("✅ Image path OK:", imgPages.length, "page(s)");

  console.log("\nAll tests passed.");
}

main().catch((err) => {
  console.error("❌ Test failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
