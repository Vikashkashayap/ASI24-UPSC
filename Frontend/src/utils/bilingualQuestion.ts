export type OptionKey = "A" | "B" | "C" | "D";

export type BilingualOptions = Record<OptionKey, string>;

export interface BilingualQuestionFields {
  question?: string;
  question_en?: string;
  question_hi?: string;
  options?: BilingualOptions;
  options_en?: BilingualOptions;
  options_hi?: BilingualOptions;
}

export function getQuestionEnglish(q: BilingualQuestionFields): string {
  return (q.question_en || q.question || "").trim();
}

export function getQuestionHindi(q: BilingualQuestionFields): string {
  const hi = (q.question_hi || "").trim();
  const en = getQuestionEnglish(q);
  return hi || en;
}

export function hasDistinctHindiQuestion(q: BilingualQuestionFields): boolean {
  const hi = (q.question_hi || "").trim();
  const en = getQuestionEnglish(q);
  return Boolean(hi && en && hi !== en);
}

export function getOptionEnglish(q: BilingualQuestionFields, key: OptionKey): string {
  return (q.options_en?.[key] || q.options?.[key] || "").trim();
}

export function getOptionHindi(q: BilingualQuestionFields, key: OptionKey): string {
  const hi = (q.options_hi?.[key] || "").trim();
  const en = getOptionEnglish(q, key);
  return hi || en;
}

export function hasDistinctHindiOption(q: BilingualQuestionFields, key: OptionKey): boolean {
  const hi = (q.options_hi?.[key] || "").trim();
  const en = getOptionEnglish(q, key);
  return Boolean(hi && en && hi !== en);
}

export function hasBilingualOptions(q: BilingualQuestionFields): boolean {
  return (["A", "B", "C", "D"] as const).some((key) => hasDistinctHindiOption(q, key));
}

export function isBilingualQuestion(q: BilingualQuestionFields): boolean {
  return hasDistinctHindiQuestion(q) || hasBilingualOptions(q);
}
