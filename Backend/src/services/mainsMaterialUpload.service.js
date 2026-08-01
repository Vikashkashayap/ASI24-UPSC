/**

 * Persist Mains Materials PDFs to AWS S3 under mains-materials/{type}/

 */



import { v4 as uuidv4 } from "uuid";

import {

  uploadBufferToS3,

  deleteS3Object,

  downloadBufferFromS3,

  isS3Configured,

  getS3Client,

  getBucket,

} from "../knowledge/services/s3.service.js";

import { GetObjectCommand } from "@aws-sdk/client-s3";



const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME = new Set(["application/pdf"]);

const FILE_TYPES = new Set(["ppt", "workbook", "referenceCards"]);



function getMaxBytes() {

  const n = parseInt(process.env.MAINS_MATERIALS_MAX_BYTES, 10);

  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;

}



function getPrefix() {

  return String(process.env.MAINS_MATERIALS_S3_PREFIX || "mains-materials").replace(

    /^\/|\/$/g,

    ""

  );

}



function safeFileName(originalName) {

  const base = String(originalName || "document.pdf").split(/[/\\]/).pop() || "document.pdf";

  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");

  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;

}



/**

 * Save a PDF buffer to S3 for a given material type.

 * @returns {{ storageKey: string, storageUrl: string, filePath: string, originalName: string, fileSize: number, mimeType: string }}

 */

export async function saveMainsMaterialPdf({ buffer, originalName, mimeType, fileType }) {

  if (!FILE_TYPES.has(fileType)) {

    throw new Error("Invalid file type");

  }

  if (!isS3Configured()) {

    throw new Error(

      "AWS S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION"

    );

  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {

    throw new Error("PDF file is empty");

  }

  if (!ALLOWED_MIME.has(mimeType) && !String(originalName || "").toLowerCase().endsWith(".pdf")) {

    throw new Error("Only PDF files are allowed");

  }



  const maxBytes = getMaxBytes();

  if (buffer.length > maxBytes) {

    throw new Error(`PDF exceeds max size of ${Math.round(maxBytes / (1024 * 1024))}MB`);

  }



  const name = safeFileName(originalName);

  const key = `${getPrefix()}/${fileType}/${uuidv4()}-${name}`;



  const uploaded = await uploadBufferToS3({

    buffer,

    key,

    contentType: "application/pdf",

  });



  return {

    storageKey: uploaded.key,

    storageUrl: uploaded.url,

    // Keep filePath as the S3 key for any older callers

    filePath: uploaded.key,

    originalName: name,

    fileSize: buffer.length,

    mimeType: "application/pdf",

  };

}



/**

 * Resolve the S3 key from stored file metadata.

 */

export function resolveMainsMaterialStorageKey(metaOrKey) {

  if (!metaOrKey) return null;

  if (typeof metaOrKey === "string") return metaOrKey.trim() || null;

  const key = metaOrKey.storageKey || metaOrKey.filePath || "";

  return String(key).trim() || null;

}



export async function removeMainsMaterialFile(metaOrKey) {

  const key = resolveMainsMaterialStorageKey(metaOrKey);

  if (!key) return;

  try {

    await deleteS3Object(key);

  } catch (err) {

    console.warn("[mains-materials] S3 delete failed:", err?.message || err);

  }

}



/**

 * Stream an S3 object to an Express response (inline PDF).

 */

export async function streamMainsMaterialToResponse(metaOrKey, res, downloadName) {

  const key = resolveMainsMaterialStorageKey(metaOrKey);

  if (!key) {

    const err = new Error("File not uploaded");

    err.status = 404;

    throw err;

  }

  if (!isS3Configured()) {

    const err = new Error("AWS S3 is not configured");

    err.status = 500;

    throw err;

  }



  const s3 = getS3Client();

  const result = await s3.send(

    new GetObjectCommand({

      Bucket: getBucket(),

      Key: key,

    })

  );



  const safeName = String(downloadName || "document.pdf").replace(/"/g, "");

  res.setHeader("Content-Type", result.ContentType || "application/pdf");

  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

  if (result.ContentLength != null) {

    res.setHeader("Content-Length", String(result.ContentLength));

  }



  const body = result.Body;

  if (!body) {

    const err = new Error("Empty S3 object");

    err.status = 404;

    throw err;

  }



  // AWS SDK v3 Body is a Readable stream in Node

  if (typeof body.pipe === "function") {

    return body.pipe(res);

  }



  // Fallback: buffer then send

  const { buffer } = await downloadBufferFromS3(key);

  return res.send(buffer);

}



export { FILE_TYPES as MAINS_MATERIAL_FILE_TYPES };


