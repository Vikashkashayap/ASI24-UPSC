/**
 * Robust JSON extraction from LLM responses.
 */

export function parseLlmJson(raw) {
  let content = String(raw || "").trim();
  if (!content) return null;

  if (content.startsWith("```")) {
    content = content.replace(/^```\s*(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }

  try {
    return JSON.parse(content);
  } catch {
    /* continue */
  }

  const objStart = content.indexOf("{");
  const objEnd = content.lastIndexOf("}");
  const arrStart = content.indexOf("[");
  const arrEnd = content.lastIndexOf("]");

  if (arrStart >= 0 && arrEnd > arrStart && (objStart < 0 || arrStart < objStart)) {
    try {
      return JSON.parse(content.slice(arrStart, arrEnd + 1));
    } catch {
      /* continue */
    }
  }

  if (objStart >= 0 && objEnd > objStart) {
    try {
      return JSON.parse(content.slice(objStart, objEnd + 1));
    } catch {
      return salvageObjects(content);
    }
  }

  return salvageObjects(content);
}

function salvageObjects(content) {
  const matches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
  const out = [];
  for (const m of matches) {
    try {
      out.push(JSON.parse(m));
    } catch {
      /* skip */
    }
  }
  if (!out.length) return null;
  return out.length === 1 ? out[0] : out;
}

export function ensureArray(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.questions)) return parsed.questions;
  if (parsed.question) return [parsed];
  return [];
}

export default { parseLlmJson, ensureArray };
