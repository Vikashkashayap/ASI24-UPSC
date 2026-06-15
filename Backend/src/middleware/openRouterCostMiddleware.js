import { openRouterCostContext, logRouteCostSummary } from "../services/openRouterCostTracker.js";

/**
 * Track OpenRouter API spend per HTTP request on AI-heavy routes.
 */
export function openRouterCostMiddleware(req, res, next) {
  const store = {
    costUsd: 0,
    calls: 0,
    route: req.originalUrl,
    method: req.method,
  };

  openRouterCostContext.run(store, () => {
    res.on("finish", () => logRouteCostSummary(store));
    next();
  });
}

export default openRouterCostMiddleware;
