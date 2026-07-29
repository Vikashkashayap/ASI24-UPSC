import {
  sanitizeHindiMcqFormat,
} from "./sanitizeHindiMcqFormat";

export type OptionKey = "A" | "B" | "C" | "D";

export type ExamLang = "hi" | "en" | "both";

export type BilingualOptions = Record<OptionKey, string>;

export interface BilingualQuestionFields {
  question?: string;
  question_en?: string;
  question_hi?: string;
  options?: BilingualOptions;
  options_en?: BilingualOptions;
  options_hi?: BilingualOptions;
  option_a_en?: string;
  option_b_en?: string;
  option_c_en?: string;
  option_d_en?: string;
  option_a_hi?: string;
  option_b_hi?: string;
  option_c_hi?: string;
  option_d_hi?: string;
  hasHindi?: boolean;
}

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

export function hasDevanagari(s: string): boolean {
  return /[\u0900-\u097F]/.test(s || "");
}

/** True Hindi text — must contain Devanagari (rejects EN copied into *_hi). */
export function looksLikeHindiText(s: string): boolean {
  const t = String(s || "").trim();
  if (!t) return false;
  return hasDevanagari(t);
}

/**
 * Chronology / code options like "1, 2 and 4 only" or "1-2-3-4" —
 * language-neutral; must not stay stuck on "अनुवाद हो रहा है…".
 */
export function isCodeLikeOptionText(text: string): boolean {
  const t = String(text || "").trim();
  if (!t || t.length > 80) return false;
  const stripped = t
    .replace(/\b(only|and|or|both|all|none|of|the|above|following|केवल|और|या|सभी)\b/gi, "")
    .replace(/[\d０-９०-९\s,.\-–—/()]+/g, "")
    .trim();
  if (stripped.length <= 2) return true;
  const compact = t.replace(/\s+/g, "");
  const digits = (compact.match(/[\d०-९]/g) || []).length;
  return digits >= 2 && digits >= compact.length * 0.35;
}

/** Light Hindi gloss for code options (keeps digits; translates only/and). */
export function glossCodeOptionToHindi(text: string): string {
  const t = String(text || "").trim();
  if (!t) return "";
  if (hasDevanagari(t)) return t;
  return t
    .replace(/\bonly\b/gi, "केवल")
    .replace(/\band\b/gi, "और")
    .replace(/\bor\b/gi, "या")
    .replace(/\bboth\b/gi, "दोनों")
    .replace(/\ball\b/gi, "सभी")
    .replace(/\bnone\b/gi, "कोई नहीं")
    .replace(/\bof the above\b/gi, "उपर्युक्त में से")
    .replace(/\bof the following\b/gi, "निम्नलिखित में से")
    .trim();
}

export type ResolvedLangText = {
  primary: string;
  secondary?: string;
  source: "hi" | "en" | "missing";
};

export function shouldShowBoth(lang?: ExamLang | null): boolean {
  return !lang || lang === "both";
}

function flatOptionEn(q: BilingualQuestionFields, key: OptionKey): string {
  const flat = q[`option_${key.toLowerCase()}_en` as keyof BilingualQuestionFields];
  if (typeof flat === "string" && flat.trim()) return flat.trim();
  return (q.options_en?.[key] || q.options?.[key] || "").trim();
}

function flatOptionHi(q: BilingualQuestionFields, key: OptionKey): string {
  const flat = q[`option_${key.toLowerCase()}_hi` as keyof BilingualQuestionFields];
  if (typeof flat === "string" && flat.trim()) return flat.trim();
  return (q.options_hi?.[key] || "").trim();
}

export function getQuestionEnglish(q: BilingualQuestionFields): string {
  return (q.question_en || q.question || "").trim();
}

/** True when stem was corrupted by String(object) or blank placeholders during generation. */
export function isCorruptedStemText(text: string): boolean {
  const s = String(text || "");
  if (/\[object Object\]/i.test(s)) return true;
  const markers = [...s.replace(/\\n/g, "\n").matchAll(/(?:^|\n)\s*\d+[.)]\s+/g)];
  if (markers.length < 2) return false;
  let blank = 0;
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index! + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index! : s.length;
    const body = (s.slice(start, end).trim().split(/\n/)[0] || "").trim();
    if (
      !body ||
      body === "[object Object]" ||
      /^(?:[—–\-−•·.…]{1,6}|n\/?a|tbd|\.\.\.|…)$/i.test(body)
    ) {
      blank += 1;
    }
  }
  return blank >= 2;
}

function countNumberedItems(text: string): number {
  const s = String(text || "").replace(/\\n/g, "\n");
  const markers = [...s.matchAll(/(?:^|\n)\s*\d+[.)]\s+/g)];
  let ok = 0;
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index! + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index! : s.length;
    const body = (s.slice(start, end).trim().split(/\n/)[0] || "").trim();
    if (body && body !== "[object Object]" && !/^(?:[—–\-−•·.…]{1,6}|\.\.\.|…)$/i.test(body)) {
      ok += 1;
    }
  }
  return ok;
}

function countLetterItems(text: string): number {
  const s = String(text || "").replace(/\\n/g, "\n");
  return (s.match(/(?:^|\n)\s*[A-DΑ-Δअ-ई][.)]\s+\S+/gi) || []).length;
}

/**
 * Hindi stem incomplete vs English (half lists / wrong pattern) — do not show as "full Hindi".
 */
export function isIncompleteHindiStem(hi: string, en: string): boolean {
  const h = String(hi || "").trim();
  const e = String(en || "").trim();
  if (!h || !e) return false;
  if (isCorruptedStemText(h)) return true;

  const enIsMatch = /match\s+the\s+following|list\s*[-–—]?\s*i\b/i.test(e);
  const hiIsMatch = /मिलान|सूची\s*[-–—]?\s*i/i.test(h);
  const hiWrongStatementForMatch =
    enIsMatch &&
    !hiIsMatch &&
    /उपर्युक्त कथनों|कौन-सा\/से सही|which of the (following )?statements/i.test(h);
  if (hiWrongStatementForMatch) return true;

  const enNums = countNumberedItems(e);
  const hiNums = countNumberedItems(h);
  if (enNums >= 2 && hiNums < Math.min(2, enNums)) return true;
  if (enNums >= 3 && hiNums > 0 && hiNums < enNums - 1) return true;

  const enLetters = countLetterItems(e);
  const hiLetters = countLetterItems(h);
  if (enIsMatch && enLetters >= 2 && hiIsMatch && hiLetters < 2) return true;

  // Assertion-reason: both A and R must exist in Hindi when English has them
  if (/assertion\s*\(A\)/i.test(e) && /reason\s*\(R\)/i.test(e)) {
    if (
      !/(?:assertion|अभिकथन|कथन)\s*\(A\)/i.test(h) ||
      !/(?:reason|कारण)\s*\(R\)/i.test(h)
    ) {
      return true;
    }
  }

  return false;
}

/** Hindi stem — no English fallback when strict (exam Hindi toggle). */
export function getQuestionHindi(
  q: BilingualQuestionFields,
  { strict = true }: { strict?: boolean } = {}
): string {
  const hiRaw = (q.question_hi || "").trim();
  const hi = sanitizeHindiMcqFormat(hiRaw);
  const en = getQuestionEnglish(q);
  // Broken / half / English-in-Hindi — reject for strict Hindi mode
  if (hi && (isCorruptedStemText(hi) || isIncompleteHindiStem(hi, en) || !looksLikeHindiText(hi))) {
    return strict ? "" : en;
  }
  if (hi) return hi;
  if (strict) return "";
  return en;
}

export function hasStoredHindiQuestion(q: BilingualQuestionFields): boolean {
  const hiStem = (q.question_hi || "").trim();
  if (!hiStem || isCorruptedStemText(hiStem) || !looksLikeHindiText(hiStem)) return false;
  return OPTION_KEYS.every((key) => {
    const en = flatOptionEn(q, key);
    if (!en) return true;
    const hi = flatOptionHi(q, key);
    return Boolean(hi) && looksLikeHindiText(hi);
  });
}

export function hasDistinctHindiQuestion(q: BilingualQuestionFields): boolean {
  const hiRaw = (q.question_hi || "").trim();
  if (!hiRaw || isCorruptedStemText(hiRaw)) return false;
  const hi = getQuestionHindi(q, { strict: true });
  const en = getQuestionEnglish(q);
  return Boolean(hi && en && hi !== en);
}

export function getOptionEnglish(q: BilingualQuestionFields, key: OptionKey): string {
  return flatOptionEn(q, key);
}

export function getOptionHindi(
  q: BilingualQuestionFields,
  key: OptionKey,
  { strict = true }: { strict?: boolean } = {}
): string {
  const hiRaw = flatOptionHi(q, key);
  const hi = sanitizeHindiMcqFormat(hiRaw);
  if (hi && looksLikeHindiText(hi)) return hi;
  if (hi && isCodeLikeOptionText(hi)) return glossCodeOptionToHindi(hi);

  const en = getOptionEnglish(q, key);
  // Chronology codes are language-neutral — never block Hindi mode on these
  if (en && isCodeLikeOptionText(en)) return glossCodeOptionToHindi(en);

  if (strict) return "";
  return en;
}

export function hasDistinctHindiOption(q: BilingualQuestionFields, key: OptionKey): boolean {
  const hi = flatOptionHi(q, key);
  const en = getOptionEnglish(q, key);
  return Boolean(hi && en && hi !== en);
}

export function hasBilingualOptions(q: BilingualQuestionFields): boolean {
  return OPTION_KEYS.some((key) => hasDistinctHindiOption(q, key));
}

export function isBilingualQuestion(q: BilingualQuestionFields): boolean {
  return hasStoredHindiQuestion(q) || hasDistinctHindiQuestion(q) || hasBilingualOptions(q);
}

export function getQuestionByLang(q: BilingualQuestionFields, lang: ExamLang): string {
  if (lang === "hi") return getQuestionHindi(q, { strict: true });
  if (lang === "both") {
    const resolved = resolveStem(q, "both");
    return resolved.primary;
  }
  return getQuestionEnglish(q);
}

export function getOptionByLang(
  q: BilingualQuestionFields,
  key: OptionKey,
  lang: ExamLang
): string {
  if (lang === "hi") return getOptionHindi(q, key, { strict: true });
  if (lang === "both") {
    const resolved = resolveOption(q, key, "both");
    return resolved.primary;
  }
  return getOptionEnglish(q, key);
}

/**
 * Strict stem resolution for exam UI.
 * hi → Hindi only (empty if missing); en → English; both → HI primary + EN secondary.
 */
export function resolveStem(
  q: BilingualQuestionFields,
  lang: ExamLang = "en"
): ResolvedLangText {
  const en = getQuestionEnglish(q);
  const hi = getQuestionHindi(q, { strict: true });

  if (lang === "hi") {
    if (hi) return { primary: hi, source: "hi" };
    return { primary: "", source: "missing" };
  }
  if (lang === "both") {
    if (hi && en && hi !== en) return { primary: hi, secondary: en, source: "hi" };
    if (hi) return { primary: hi, source: "hi" };
    if (en) return { primary: en, source: "en" };
    return { primary: "", source: "missing" };
  }
  if (en) return { primary: en, source: "en" };
  if (hi) return { primary: hi, source: "hi" };
  return { primary: "", source: "missing" };
}

/**
 * Strict option resolution — same policy as resolveStem.
 */
export function resolveOption(
  q: BilingualQuestionFields,
  key: OptionKey,
  lang: ExamLang = "en"
): ResolvedLangText {
  const en = getOptionEnglish(q, key);
  const hi = getOptionHindi(q, key, { strict: true });

  if (lang === "hi") {
    if (hi) return { primary: hi, source: "hi" };
    // Last resort: show English rather than permanent "translating…"
    if (en) return { primary: en, source: "en" };
    return { primary: "", source: "missing" };
  }
  if (lang === "both") {
    if (hi && en && hi !== en) return { primary: hi, secondary: en, source: "hi" };
    if (hi) return { primary: hi, source: "hi" };
    if (en) return { primary: en, source: "en" };
    return { primary: "", source: "missing" };
  }
  if (en) return { primary: en, source: "en" };
  if (hi) return { primary: hi, source: "hi" };
  return { primary: "", source: "missing" };
}

type ExplanationShape = string | { A?: string; B?: string; C?: string; D?: string } | undefined;

export function getExplanationByLang(
  q: {
    explanation?: ExplanationShape;
    explanation_en?: ExplanationShape;
    explanation_hi?: ExplanationShape;
    correctAnswer?: string;
  },
  lang: ExamLang,
  optionKey?: OptionKey
): string {
  const pick = (raw: ExplanationShape): string => {
    if (!raw) return "";
    if (typeof raw === "string") return raw.trim();
    if (optionKey && raw[optionKey]) return String(raw[optionKey]).trim();
    const ca = q.correctAnswer as OptionKey | undefined;
    if (ca && raw[ca]) return String(raw[ca]).trim();
    return String(raw.A || raw.B || raw.C || raw.D || "").trim();
  };

  if (lang === "hi") {
    const hi = pick(q.explanation_hi);
    if (hi && looksLikeHindiText(hi)) return hi;
    return "";
  }
  return pick(q.explanation_en ?? q.explanation);
}

/** Strict explanation resolution for review UI. */
export function resolveExplanation(
  q: {
    explanation?: ExplanationShape;
    explanation_en?: ExplanationShape;
    explanation_hi?: ExplanationShape;
    correctAnswer?: string;
  },
  lang: ExamLang,
  optionKey?: OptionKey
): ResolvedLangText {
  const en = getExplanationByLang(q, "en", optionKey);
  const hi = getExplanationByLang(q, "hi", optionKey);

  if (lang === "hi") {
    if (hi) return { primary: hi, source: "hi" };
    return { primary: "", source: "missing" };
  }
  if (lang === "both") {
    if (hi && en && hi !== en) return { primary: hi, secondary: en, source: "hi" };
    if (hi) return { primary: hi, source: "hi" };
    if (en) return { primary: en, source: "en" };
    return { primary: "", source: "missing" };
  }
  if (en) return { primary: en, source: "en" };
  if (hi) return { primary: hi, source: "hi" };
  return { primary: "", source: "missing" };
}
