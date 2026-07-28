import { z } from "zod";

const objectId = z
  .union([
    z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
    z.literal(""),
    z.null(),
  ])
  .optional();

export const metadataSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).optional().default(""),
  subjectId: objectId,
  chapterId: objectId,
  topicId: objectId,
  categoryId: objectId,
  sourceId: objectId,
  source: z.string().trim().max(200).optional().default(""),
  publication: z.string().trim().max(200).optional().default(""),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  language: z.string().trim().max(50).optional().default("English"),
  tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
  difficulty: z
    .enum(["Easy", "Moderate", "Hard", "Static", "Dynamic"])
    .optional()
    .default("Moderate"),
  contentType: z.enum(["Static", "Dynamic"]).optional().default("Static"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium"),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  q: z.string().optional().default(""),
  subjectId: z.string().optional(),
  chapterId: z.string().optional(),
  topicId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  processingStatus: z.string().optional(),
  year: z.coerce.number().optional(),
  language: z.string().optional(),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1),
  action: z.enum([
    "delete",
    "archive",
    "move",
    "changeCategory",
    "changeSubject",
    "retry",
  ]),
  subjectId: objectId,
  chapterId: objectId,
  topicId: objectId,
  categoryId: objectId,
});

export const subjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  gsPaper: z.string().trim().max(40).optional().default(""),
  sortOrder: z.coerce.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const subjectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  gsPaper: z.string().trim().max(40).optional(),
  sortOrder: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export const chapterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subjectId: z.string().regex(/^[a-f\d]{24}$/i),
  description: z.string().trim().max(2000).optional().default(""),
  sortOrder: z.coerce.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const chapterUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  subjectId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export const topicSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subjectId: z.string().regex(/^[a-f\d]{24}$/i),
  chapterId: z.string().regex(/^[a-f\d]{24}$/i),
  description: z.string().trim().max(2000).optional().default(""),
  sortOrder: z.coerce.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const topicUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  subjectId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  chapterId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  color: z.string().trim().max(30).optional().default("#2563eb"),
  isActive: z.boolean().optional().default(true),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  color: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
});

export function parseTags(raw) {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      // comma-separated
    }
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeMetadata(input) {
  const parsed = metadataSchema.parse(input || {});
  const emptyToNull = (v) => (v === "" || v === undefined ? null : v);
  return {
    ...parsed,
    subjectId: emptyToNull(parsed.subjectId),
    chapterId: emptyToNull(parsed.chapterId),
    topicId: emptyToNull(parsed.topicId),
    categoryId: emptyToNull(parsed.categoryId),
    sourceId: emptyToNull(parsed.sourceId),
    tags: parseTags(parsed.tags),
    year: parsed.year ?? null,
  };
}
