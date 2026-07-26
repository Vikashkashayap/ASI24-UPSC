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
    if (!/assertion\s*\(A\)|अभिकथन\s*\(A\)/i.test(h) || !/reason\s*\(R\)|कारण\s*\(R\)/i.test(h)) {
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
  const hi = (q.question_hi || "").trim();
  const en = getQuestionEnglish(q);
  // Broken / half Hindi — fall back to English so student never sees incomplete stem
  if (hi && (isCorruptedStemText(hi) || isIncompleteHindiStem(hi, en))) {
    return strict ? "" : en;
  }
  if (hi) return hi;
  if (strict) return "";
  return en;
}

export function hasStoredHindiQuestion(q: BilingualQuestionFields): boolean {
  if (q.hasHindi === true) {
    const hiStem = (q.question_hi || "").trim();
    if (hiStem && isCorruptedStemText(hiStem)) return false;
    return true;
  }
  const hiStem = (q.question_hi || "").trim();
  if (!hiStem || isCorruptedStemText(hiStem)) return false;
  return OPTION_KEYS.every((key) => Boolean(flatOptionHi(q, key)));
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
  const hi = flatOptionHi(q, key);
  if (hi) return hi;
  if (strict) return "";
  return getOptionEnglish(q, key);
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
  return getQuestionEnglish(q);
}

export function getOptionByLang(
  q: BilingualQuestionFields,
  key: OptionKey,
  lang: ExamLang
): string {
  if (lang === "hi") return getOptionHindi(q, key, { strict: true });
  return getOptionEnglish(q, key);
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
    if (hi) return hi;
    return "";
  }
  return pick(q.explanation_en ?? q.explanation);
}
