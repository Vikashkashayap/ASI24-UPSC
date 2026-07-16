/**
 * Enterprise UPSC Prelims Question Generation — public API.
 */

import { QG_CONFIG } from "./config/qg.config.js";
import {
  runQuestionPipeline,
  retrieveAndBuildContext,
  generateVerifiedFromContext,
} from "./services/pipeline.service.js";
import { hybridRetrieve } from "./services/hybridRetrieval.service.js";
import { rerankChunks } from "./services/rerank.service.js";
import { buildMergedContext } from "./services/contextBuilder.service.js";
import { getQgMetricsSnapshot, resetQgMetrics } from "./services/metrics.service.js";
import { isRerankerConfigured } from "./providers/reranker.provider.js";
import { getModelForStage } from "./providers/llmRouter.js";

export {
  QG_CONFIG,
  runQuestionPipeline,
  retrieveAndBuildContext,
  generateVerifiedFromContext,
  hybridRetrieve,
  rerankChunks,
  buildMergedContext,
  getQgMetricsSnapshot,
  resetQgMetrics,
  isRerankerConfigured,
  getModelForStage,
};

export default {
  QG_CONFIG,
  runQuestionPipeline,
  retrieveAndBuildContext,
  generateVerifiedFromContext,
  hybridRetrieve,
  rerankChunks,
  buildMergedContext,
  getQgMetricsSnapshot,
  resetQgMetrics,
  isRerankerConfigured,
  getModelForStage,
};
