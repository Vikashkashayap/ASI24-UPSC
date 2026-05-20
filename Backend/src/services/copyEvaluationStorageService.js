/**
 * Persist copy evaluation page images on disk for history & UI preview
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COPY_EVAL_BASE = path.join(__dirname, "../../uploads/copy-evaluations");

export const getEvaluationDir = (evaluationId) =>
  path.join(COPY_EVAL_BASE, String(evaluationId));

/**
 * Save page buffers (base64 or buffer) as JPEG files
 * @returns {Array<{ pageNumber: number, fileName: string }>}
 */
export const saveEvaluationPageImages = async (evaluationId, pages) => {
  const dir = getEvaluationDir(evaluationId);
  await fs.mkdir(dir, { recursive: true });

  const stored = [];

  for (const page of pages) {
    const fileName = `page-${page.pageNumber}.jpg`;
    const filePath = path.join(dir, fileName);
    const buffer = page.buffer
      ? page.buffer
      : Buffer.from(page.base64, "base64");

    await fs.writeFile(filePath, buffer);
    stored.push({ pageNumber: page.pageNumber, fileName });
  }

  return stored;
};

export const getPageImagePath = (evaluationId, pageNumber) => {
  const dir = getEvaluationDir(evaluationId);
  return path.join(dir, `page-${pageNumber}.jpg`);
};

export const deleteEvaluationFiles = async (evaluationId) => {
  const dir = getEvaluationDir(evaluationId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
};

export default {
  saveEvaluationPageImages,
  getPageImagePath,
  getEvaluationDir,
  deleteEvaluationFiles,
};
