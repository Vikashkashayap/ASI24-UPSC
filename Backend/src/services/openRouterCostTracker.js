import { AsyncLocalStorage } from "async_hooks";
import { COST_WARN_INR, usdToInr } from "../config/openRouterDefaults.js";

export const openRouterCostContext = new AsyncLocalStorage();

/**
 * Record OpenRouter spend for the current HTTP request (if middleware is active).
 */
export function recordOpenRouterCost(costUsd, cached = false) {
  if (cached) return;
  const store = openRouterCostContext.getStore();
  if (!store) return;
  store.costUsd += costUsd || 0;
  store.calls += 1;
}

export function getOpenRouterRequestCost() {
  return openRouterCostContext.getStore() || null;
}

export function formatCostLog(costUsd) {
  const inr = usdToInr(costUsd);
  return `$${(costUsd || 0).toFixed(6)} (₹${inr.toFixed(2)})`;
}

export function logRouteCostSummary(store) {
  if (!store || store.calls === 0) return;
  const inr = usdToInr(store.costUsd);
  console.log(
    `📊 OpenRouter route total: ${store.method} ${store.route} calls=${store.calls} cost=${formatCostLog(store.costUsd)}`
  );
  if (inr > COST_WARN_INR) {
    console.warn(
      `⚠️ OpenRouter cost exceeded ₹${COST_WARN_INR} on ${store.method} ${store.route} (₹${inr.toFixed(2)})`
    );
  }
}
