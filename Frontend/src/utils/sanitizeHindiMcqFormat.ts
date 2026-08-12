/**
 * Normalize broken Hindi MCQ formatting from LLM/MT translators.
 * - Keep Latin A/B/C/D and 1/2/3/4 as option/list markers (never ए/बी/सी/डी)
 * - Strip leaked option banks from Assertion-Reason bodies
 * - Fix wrong match prompts ("statements correct?" → code-selection)
 */

/** Transliterated A/B/C/D used as markers → Latin letters. */
export function normalizeLatinMcqLetters(text: string): string {
  let s = String(text || "");
  if (!s) return s;

  // List / code markers: "ए." "बी-" "सी)" "डी—" → A. B- C) D—
  const pairs: [RegExp, string][] = [
    [/(^|[\s,;:(\n])ए\s*([.)\-–—])/g, "$1A$2"],
    [/(^|[\s,;:(\n])बी\s*([.)\-–—])/g, "$1B$2"],
    [/(^|[\s,;:(\n])सी\s*([.)\-–—])/g, "$1C$2"],
    [/(^|[\s,;:(\n])(?:डी|डी़)\s*([.)\-–—])/g, "$1D$2"],
    // Parenthetical option keys: (ए) (बी)
    [/\(\s*ए\s*\)/g, "(A)"],
    [/\(\s*बी\s*\)/g, "(B)"],
    [/\(\s*सी\s*\)/g, "(C)"],
    [/\(\s*डी\s*\)/g, "(D)"],
    // Compact codes without separator: ए4 → A-4 (only when digit follows)
    [/(^|[\s,;])ए\s*(?=\d)/g, "$1A-"],
    [/(^|[\s,;])बी\s*(?=\d)/g, "$1B-"],
    [/(^|[\s,;])सी\s*(?=\d)/g, "$1C-"],
    [/(^|[\s,;])डी\s*(?=\d)/g, "$1D-"],
  ];
  for (const [re, rep] of pairs) s = s.replace(re, rep);
  return s;
}

/** Remove option bank / code-instruction that leaked into A-R body text. */
export function stripLeakedOptionsFromArBody(text: string): string {
  let s = String(text || "").trim();
  if (!s) return s;

  const cutPatterns = [
    /\n?\s*नीचे दिए गए कूट[\s\S]*$/i,
    /\n?\s*Select the correct answer using the code[\s\S]*$/i,
    /\n?\s*In the context of the above[\s\S]*$/i,
    /(?:[.!?]?\s*)Which of the following(?:\s+options?)?(?:\s+is\/are|\s+are|\s+is)?[^.?]*\??\s*$/i,
    /\n?\s*उपर्युक्त के संदर्भ में[\s\S]*$/i,
    /(?:[.!?]?\s*)निम्नलिखित में से कौन[^.?]*\??\s*$/i,
    // Option bank starting mid-body
    /\n?\s*\(\s*A\s*\)\s*(?:दोनों|Both)[\s\S]*$/i,
    /\n?\s*A\s*[.)]\s*(?:दोनों|Both)[\s\S]*$/i,
  ];
  for (const re of cutPatterns) {
    const next = s.replace(re, "").trim();
    if (next.length >= 10) s = next;
  }
  return s.trim();
}

function looksLikeMatchText(text: string): boolean {
  return /मिलान|सूची\s*[-–—]?\s*[iI1१]|match\s+the\s+following|list\s*[-–—]?\s*i\b/i.test(
    String(text || "")
  );
}

/** Wrong statement prompt on match questions → correct code prompt. */
export function fixMatchPromptInHindi(text: string): string {
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

/**
 * Full Hindi MCQ text sanitizer for stems / options / A-R bodies.
 */
export function sanitizeHindiMcqFormat(text: string): string {
  let s = String(text || "").replace(/\\n/g, "\n").trim();
  if (!s) return s;
  s = normalizeLatinMcqLetters(s);
  s = stripLeakedOptionsFromArBody(s);
  s = fixMatchPromptInHindi(s);
  // Collapse accidental double spaces from replacements
  s = s.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

/** Sanitize structured A-R Hindi fields. */
export function sanitizeHindiAssertionReason(ar: {
  assertion?: string;
  reason?: string;
}): { assertion: string; reason: string } | null {
  const assertion = sanitizeHindiMcqFormat(String(ar?.assertion || ""));
  const reason = sanitizeHindiMcqFormat(String(ar?.reason || ""));
  if (!assertion || !reason) return null;
  return { assertion, reason };
}

/** Sanitize options_hi map — Latin codes + no leaked banks. */
export function sanitizeHindiOptions<T extends Record<string, string>>(
  options: T | null | undefined
): T | null {
  if (!options || typeof options !== "object") return null;
  const out = { ...options };
  for (const key of Object.keys(out)) {
    out[key as keyof T] = sanitizeHindiMcqFormat(String(out[key] ?? "")) as T[keyof T];
  }
  return out;
}
