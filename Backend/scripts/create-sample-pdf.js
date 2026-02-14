/**
 * Create a sample question PDF for testing
 * Output: sample-questions.pdf
 */
import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Q_TEMPLATES = [
  { q: "Which article of the Indian Constitution abolishes untouchability?", a: "Article 14", b: "Article 15", c: "Article 17", d: "Article 19" },
  { q: "Who was the first President of India?", a: "Jawaharlal Nehru", b: "Dr. Rajendra Prasad", c: "Sardar Patel", d: "Dr. B.R. Ambedkar" },
  { q: "The capital of India is located in which state?", a: "Uttar Pradesh", b: "Haryana", c: "Delhi", d: "Rajasthan" },
  { q: "Who wrote the Indian National Anthem?", a: "Tagore", b: "Iqbal", c: "Bankim", d: "Sarojini" },
  { q: "How many fundamental rights are in the Constitution?", a: "5", b: "6", c: "7", d: "8" },
];
const OPTIONS = ["a", "b", "c", "d"];
const QUESTIONS = Array.from({ length: 10 }, (_, i) => {
  const t = Q_TEMPLATES[i % Q_TEMPLATES.length];
  return { ...t, correct: OPTIONS[i % 4] };
});

async function main() {
  const doc = await PDFDocument.create();
  doc.addPage();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  let y = 750;
  const lineHeight = 16;

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const lines = [
      `${i + 1}. ${q.q}`,
      `(a) ${q.a}`,
      `(b) ${q.b}`,
      `(c) ${q.c}`,
      `(d) ${q.d}`,
    ];
    for (const line of lines) {
      if (y < 50) {
        doc.addPage();
        y = 750;
      }
      doc.getPage(doc.getPageCount() - 1).drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font,
      });
      y -= lineHeight;
    }
    y -= 10;
  }

  const pdfBytes = await doc.save();
  const outPath = path.join(__dirname, "..", "sample-questions.pdf");
  fs.writeFileSync(outPath, pdfBytes);
  console.log("Created:", outPath);

  // Answer key PDF
  const keyDoc = await PDFDocument.create();
  const keyFont = await keyDoc.embedFont(StandardFonts.Helvetica);
  let keyText = "Answer Key\n\n";
  QUESTIONS.forEach((q, i) => {
    keyText += `${i + 1}. (${q.correct})\n`;
  });
  const keyPage = keyDoc.addPage();
  keyPage.drawText(keyText, { x: 50, y: 750, size: 12, font: keyFont });
  const keyBytes = await keyDoc.save();
  const keyPath = path.join(__dirname, "..", "sample-answerkey.pdf");
  fs.writeFileSync(keyPath, keyBytes);
  console.log("Created:", keyPath);
}

main().catch(console.error);
