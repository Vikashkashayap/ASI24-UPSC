/**
 * Normalize broken Hindi MCQ formatting from LLM/MT translators.
 * Keep Latin A/B/C/D markers; strip leaked option banks from A-R bodies.
 */

export function normalizeLatinMcqLetters(text) {
  let s = String(text || "");
  if (!s) return s;

  const pairs = [
    [/(^|[\s,;:(\n])ए\s*([.)\-–—])/g, "$1A$2"],
    [/(^|[\s,;:(\n])बी\s*([.)\-–—])/g, "$1B$2"],
    [/(^|[\s,;:(\n])सी\s*([.)\-–—])/g, "$1C$2"],
    [/(^|[\s,;:(\n])(?:डी|डी़)\s*([.)\-–—])/g, "$1D$2"],
    [/\(\s*ए\s*\)/g, "(A)"],
    [/\(\s*बी\s*\)/g, "(B)"],
    [/\(\s*सी\s*\)/g, "(C)"],
    [/\(\s*डी\s*\)/g, "(D)"],
    [/(^|[\s,;])ए\s*(?=\d)/g, "$1A-"],
    [/(^|[\s,;])बी\s*(?=\d)/g, "$1B-"],
    [/(^|[\s,;])सी\s*(?=\d)/g, "$1C-"],
    [/(^|[\s,;])डी\s*(?=\d)/g, "$1D-"],
  ];
  for (const [re, rep] of pairs) s = s.replace(re, rep);
  return s;
}

export function stripLeakedOptionsFromArBody(text) {
  let s = String(text || "").trim();
  if (!s) return s;

  const cutPatterns = [
    /\n?\s*नीचे दिए गए कूट[\s\S]*$/i,
    /\n?\s*Select the correct answer using the code[\s\S]*$/i,
    /\n?\s*In the context of the above[\s\S]*$/i,
    /\n?\s*उपर्युक्त के संदर्भ में[\s\S]*$/i,
    /\n?\s*\(\s*A\s*\)\s*(?:दोनों|Both)[\s\S]*$/i,
    /\n?\s*A\s*[.)]\s*(?:दोनों|Both)[\s\S]*$/i,
  ];
  for (const re of cutPatterns) {
    const next = s.replace(re, "").trim();
    if (next.length >= 10) s = next;
  }
  return s.trim();
}

function looksLikeMatchText(text) {
  return /मिलान|सूची\s*[-–—]?\s*[iI1१]|match\s+the\s+following|list\s*[-–—]?\s*i\b/i.test(
    String(text || "")
  );
}

export function fixMatchPromptInHindi(text) {
  let s = String(text || "");
  if (!looksLikeMatchText(s)) return s;
  s = s.replace(
    /उपर्युक्त कथनों में से कौन-सा\/से सही है\/हैं\??/g,
    "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:"
  );
  s = s.replace(
    /Which of the (?:statements|following statements)(?: given above)?(?: is\/are| are)?[^.]*\??/gi,
    "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:"
  );
  return s;
}

export function sanitizeHindiMcqFormat(text) {
  let s = String(text || "").replace(/\\n/g, "\n").trim();
  if (!s) return s;
  s = normalizeLatinMcqLetters(s);
  s = stripLeakedOptionsFromArBody(s);
  s = fixMatchPromptInHindi(s);
  s = s.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

export function sanitizeHindiAssertionReason(ar) {
  const assertion = sanitizeHindiMcqFormat(String(ar?.assertion || ""));
  const reason = sanitizeHindiMcqFormat(String(ar?.reason || ""));
  if (!assertion || !reason) return null;
  return { assertion, reason };
}

export function sanitizeHindiOptions(options) {
  if (!options || typeof options !== "object") return null;
  const out = { ...options };
  for (const key of Object.keys(out)) {
    out[key] = sanitizeHindiMcqFormat(String(out[key] ?? ""));
  }
  return out;
}
