/**
 * Strip copyright, URLs, Hindi (Devanagari), and common PDF junk from displayed text.
 * Use for both test and result pages so old saved data also shows clean.
 */
const JUNK_REGEX =
  /\s*(©|Copyright|www\.\S+|Space\s+for\s+Rough\s+Work|PTS\s*\(\s*GS\s*\)|CSE\s+20\d{2}|\(\d+\s*-\s*[A-Da-d]\s*\)|nextias\.com)[\s\S]*/i;
const DEVANAGARI_REGEX = /[\u0900-\u097F]+/g;

export function cleanDisplayText(str: string | undefined | null): string {
  if (str == null || typeof str !== "string") return "";
  let s = str.replace(DEVANAGARI_REGEX, "");
  const junkIndex = s.search(JUNK_REGEX);
  if (junkIndex !== -1) s = s.substring(0, junkIndex);
  return s.replace(/\s+/g, " ").trim();
}
