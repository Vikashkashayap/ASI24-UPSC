/**
 * Per-stage LLM model router — OpenRouter-backed, configurable.
 */

import { callOpenRouterAPI } from "../../openRouterService.js";
import { QG_CONFIG } from "../config/qg.config.js";
import { withRetry } from "../utils/retry.js";
import { parseLlmJson } from "../utils/jsonParse.js";

const STAGES = ["question", "verification", "explanation", "factCheck"];

export function getModelForStage(stage) {
  const key = STAGES.includes(stage) ? stage : "question";
  return QG_CONFIG.models[key] || QG_CONFIG.models.question;
}

/**
 * @param {{
 *   stage: "question"|"verification"|"explanation"|"factCheck",
 *   systemPrompt: string,
 *   userPrompt: string,
 *   temperature?: number,
 *   maxTokens?: number,
 *   parseJson?: boolean,
 * }} params
 */
export async function callStageLlm({
  stage,
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens = 4000,
  parseJson = true,
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = getModelForStage(stage);
  const temp =
    temperature ??
    (stage === "verification" || stage === "factCheck"
      ? QG_CONFIG.generation.verifyTemperature
      : QG_CONFIG.generation.temperature);

  const startedAt = Date.now();
  const result = await withRetry(
    async () => {
      const res = await callOpenRouterAPI({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        temperature: temp,
        maxTokens,
      });
      if (!res?.success) {
        throw new Error(res?.error || `LLM ${stage} failed`);
      }
      return res;
    },
    { retries: QG_CONFIG.retry.llm, label: `qg.llm.${stage}` }
  );

  const durationMs = Date.now() - startedAt;
  const content = result.content || "";
  const parsed = parseJson ? parseLlmJson(content) : null;

  return {
    success: true,
    stage,
    model: result.model || model,
    content,
    parsed,
    usage: result.usage || {},
    durationMs,
  };
}

export default { callStageLlm, getModelForStage };
