import { S3Client, DeleteObjectCommand, HeadBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";

let client = null;

export function isS3Configured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_BUCKET_NAME &&
      process.env.AWS_REGION
  );
}

export function getS3Client() {
  if (!isS3Configured()) {
    throw new Error(
      "AWS S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION"
    );
  }
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export function getBucket() {
  return process.env.AWS_BUCKET_NAME;
}

export function getPublicBaseUrl() {
  const custom = String(process.env.AWS_S3_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (custom) return custom;
  const bucket = getBucket();
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

export function buildPublicUrl(key) {
  return `${getPublicBaseUrl()}/${String(key).replace(/^\//, "")}`;
}

export function getKnowledgePrefix() {
  return String(process.env.KNOWLEDGE_S3_PREFIX || "knowledge-base").replace(/^\/|\/$/g, "");
}

/**
 * Upload a buffer to S3 under knowledge-base/…
 * @returns {{ key: string, url: string, etag?: string }}
 */
export async function uploadBufferToS3({
  buffer,
  key,
  contentType,
  onProgress,
  abortSignal,
}) {
  const s3 = getS3Client();
  const body = Readable.from(buffer);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
      // Public-read if bucket policy allows; ACL may be blocked on newer buckets
      // ACL: "public-read",
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024,
    leavePartsOnError: false,
  });

  if (typeof onProgress === "function") {
    upload.on("httpUploadProgress", (progress) => {
      const loaded = progress.loaded || 0;
      const total = progress.total || buffer.length || 1;
      onProgress({ loaded, total, percent: Math.min(100, Math.round((loaded / total) * 100)) });
    });
  }

  if (abortSignal) {
    if (abortSignal.aborted) {
      throw new Error("Upload aborted");
    }
    abortSignal.addEventListener("abort", () => {
      upload.abort().catch(() => {});
    });
  }

  const result = await upload.done();
  return {
    key,
    url: buildPublicUrl(key),
    etag: result?.ETag,
  };
}

export async function deleteS3Object(key) {
  if (!key || !isS3Configured()) return;
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
}

/**
 * Download an object from S3 as a Buffer.
 * @param {string} key
 * @returns {Promise<{ buffer: Buffer, contentType?: string, contentLength?: number }>}
 */
export async function downloadBufferFromS3(key) {
  if (!key) throw new Error("S3 key is required");
  const s3 = getS3Client();
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
  const bytes = await result.Body?.transformToByteArray?.();
  if (!bytes) throw new Error(`Empty S3 object: ${key}`);
  return {
    buffer: Buffer.from(bytes),
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}

export async function checkS3Health() {
  if (!isS3Configured()) {
    return { ok: false, configured: false, message: "S3 not configured" };
  }
  try {
    const s3 = getS3Client();
    await s3.send(new HeadBucketCommand({ Bucket: getBucket() }));
    return {
      ok: true,
      configured: true,
      bucket: getBucket(),
      region: process.env.AWS_REGION,
      prefix: getKnowledgePrefix(),
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      bucket: getBucket(),
      region: process.env.AWS_REGION,
      message: err?.message || "S3 health check failed",
    };
  }
}
