import { z } from "zod";

export const documentIdParamSchema = z.object({
  documentId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid documentId"),
});

export const retryBodySchema = z.object({
  fromStage: z.string().optional(),
  force: z.boolean().optional(),
});

export const dashboardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["queued", "running", "completed", "failed", "retrying", "cancelled"])
    .optional(),
});
