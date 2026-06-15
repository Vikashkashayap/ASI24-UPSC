/** Shared OpenRouter token budgets and cost display constants */

export const JSON_MAX_TOKENS = parseInt(process.env.JSON_MAX_TOKENS, 10) || 1200;
export const CHAT_MAX_TOKENS = parseInt(process.env.CHAT_MAX_TOKENS, 10) || 450;
export const VISION_MAX_TOKENS = parseInt(process.env.VISION_MAX_TOKENS, 10) || 6144;
export const PLANNER_MAX_TOKENS = parseInt(process.env.PLANNER_MAX_TOKENS, 10) || 1200;
export const UPSC_STRUCTURE_MAX_TOKENS =
  parseInt(process.env.UPSC_STRUCTURE_MAX_TOKENS, 10) || 1200;

export const INR_PER_USD = parseFloat(process.env.INR_PER_USD) || 83;
export const COST_WARN_INR = parseFloat(process.env.COST_WARN_INR) || 1;

export function usdToInr(usd) {
  return (usd || 0) * INR_PER_USD;
}
