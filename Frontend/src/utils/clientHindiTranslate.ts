/**
 * Free EN→HI display translation for exam UI (no OpenRouter / backend tokens).
 * Fast + timeout-safe so the exam never hangs on "हिंदी…".
 */

import { isIncompleteHindiStem } from "./bilingualQuestion";

const CACHE_PREFIX = "md_hi_v3:";
const memory = new Map<string, string>();
const TRANSLATE_TIMEOUT_MS = 7000;
const MAX_PARALLEL = 4;

function cacheKey(text: string): string {
  return `${CACHE_PREFIX}${text.slice(0, 24)}_${text.length}_${simpleHash(text)}`;
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function readCache(text: string): string | null {
  const key = cacheKey(text);
  if (memory.has(key)) return memory.get(key)!;
  try {
    const v = localStorage.getItem(key);
    if (v) {
      memory.set(key, v);
      return v;
    }
  } catch {
    /* private mode */
  }
  return null;
}

function writeCache(text: string, translated: string) {
  const key = cacheKey(text);
  memory.set(key, translated);
  try {
    localStorage.setItem(key, translated);
  } catch {
    /* quota */
  }
}

function hasDevanagari(s: string): boolean {
  return /[\u0900-\u097F]/.test(s || "");
}

function stemLooksHindi(s: string): boolean {
  const t = String(s || "");
  if (!hasDevanagari(t)) return false;
  const hiChars = (t.match(/[\u0900-\u097F]/g) || []).length;
  return hiChars >= 12 || (hiChars >= 6 && t.length < 40);
}

function chunkText(text: string, maxLen = 450): string[] {
  const t = String(text || "");
  if (t.length <= maxLen) return [t];
  const parts: string[] = [];
  const lines = t.split("\n");
  let buf = "";
  for (const line of lines) {
    if ((buf + "\n" + line).length > maxLen && buf) {
      parts.push(buf);
      buf = line;
    } else {
      buf = buf ? `${buf}\n${line}` : line;
    }
  }
  if (buf) parts.push(buf);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= maxLen) out.push(p);
    else {
      for (let i = 0; i < p.length; i += maxLen) out.push(p.slice(i, i + maxLen));
    }
  }
  return out;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function translateChunk(text: string): Promise<string> {
  const q = text.trim();
  if (!q) return "";
  if (hasDevanagari(q) && !/[A-Za-z]{4,}/.test(q)) return q;

  const cached = readCache(q);
  if (cached) return cached;

  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=" +
    encodeURIComponent(q);

  try {
    const res = await fetchWithTimeout(url, TRANSLATE_TIMEOUT_MS);
    if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
    const data = await res.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((row: unknown) => (Array.isArray(row) ? String(row[0] || "") : "")).join("")
      : "";
    const out = translated.trim() || q;
    writeCache(q, out);
    return out;
  } catch (err) {
    console.warn("[client-hi] chunk failed, keeping English:", (err as Error)?.message || err);
    return q; // never hang — show English fragment rather than freeze UI
  }
}

export async function translateEnToHi(text: string): Promise<string> {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (hasDevanagari(raw) && !/[A-Za-z]{4,}/.test(raw) && raw.length > 12) return raw;

  const chunks = chunkText(raw);
  if (chunks.length === 1) return translateChunk(chunks[0]);
  const parts = await mapPool(chunks, 2, (c) => translateChunk(c));
  return parts.join("\n").trim();
}

export type ClientMcq = {
  _id?: string;
  question?: string;
  question_en?: string;
  question_hi?: string;
  options?: { A?: string; B?: string; C?: string; D?: string };
  options_en?: { A?: string; B?: string; C?: string; D?: string };
  options_hi?: { A?: string; B?: string; C?: string; D?: string };
  matchColumns?: { columnA?: string[]; columnB?: string[] } | null;
  matchColumns_hi?: { columnA?: string[]; columnB?: string[] } | null;
  assertionReason?: { assertion?: string; reason?: string } | null;
  assertionReason_hi?: { assertion?: string; reason?: string } | null;
  explanation?: string | { A?: string; B?: string; C?: string; D?: string };
  explanation_en?: string | { A?: string; B?: string; C?: string; D?: string };
  explanation_hi?: string | { A?: string; B?: string; C?: string; D?: string };
  hasHindi?: boolean;
};

function enStem(q: ClientMcq): string {
  return String(q.question_en || q.question || "").trim();
}

function enOpts(q: ClientMcq) {
  return q.options_en || q.options || {};
}

function matchHiOk(q: ClientMcq): boolean {
  const matchHi = q.matchColumns_hi;
  if (!matchHi?.columnA?.length || !matchHi?.columnB?.length) return false;
  const a = matchHi.columnA.filter((t) => String(t || "").trim());
  const b = matchHi.columnB.filter((t) => String(t || "").trim());
  if (a.length < 2 || b.length < 2 || a.length !== b.length) return false;
  return [...a, ...b].some((t) => hasDevanagari(String(t || "")));
}

function assertionHiOk(q: ClientMcq): boolean {
  const arHi = q.assertionReason_hi;
  if (
    arHi?.assertion &&
    arHi?.reason &&
    stemLooksHindi(arHi.assertion) &&
    stemLooksHindi(arHi.reason)
  ) {
    return true;
  }
  const hi = String(q.question_hi || "");
  return (
    /(?:अभिकथन|assertion)\s*\(A\)/i.test(hi) &&
    /(?:कारण|reason)\s*\(R\)/i.test(hi) &&
    stemLooksHindi(hi)
  );
}

function optionsHiOk(q: ClientMcq): boolean {
  const opts = q.options_hi || {};
  return ["A", "B", "C", "D"].every((k) =>
    hasDevanagari(String((opts as Record<string, string>)[k] || ""))
  );
}

function looksMatch(q: ClientMcq): boolean {
  if (q.matchColumns?.columnA && q.matchColumns.columnA.length >= 2) return true;
  return /match\s+the\s+following|list\s*[-–—]?\s*i\b/i.test(enStem(q));
}

function looksAssertion(q: ClientMcq): boolean {
  if (q.assertionReason?.assertion && q.assertionReason?.reason) return true;
  const en = enStem(q);
  return /assertion\s*\(A\)/i.test(en) && /reason\s*\(R\)/i.test(en);
}

function buildFullEnglishStem(q: ClientMcq): string {
  let en = enStem(q);
  if (looksAssertion(q) && q.assertionReason?.assertion) {
    en = [
      `Assertion (A): ${String(q.assertionReason.assertion).trim()}`,
      `Reason (R): ${String(q.assertionReason.reason || "").trim()}`,
      "In the context of the above, which of the following is correct?",
    ].join("\n");
  } else if (looksMatch(q) && q.matchColumns?.columnA?.length) {
    const lines = [en.split("\n")[0] || "Match the following:", "List-I"];
    (q.matchColumns.columnA || []).forEach((item, i) => {
      if (String(item || "").trim()) lines.push(`${String.fromCharCode(65 + i)}. ${item}`);
    });
    lines.push("List-II");
    (q.matchColumns.columnB || []).forEach((item, i) => {
      if (String(item || "").trim()) lines.push(`${i + 1}. ${item}`);
    });
    lines.push("Select the correct answer using the code given below:");
    en = lines.join("\n");
  }
  return en;
}

export function needsClientHindi(
  q: ClientMcq | null | undefined,
  opts: { includeExplanations?: boolean } = {}
): boolean {
  if (!q) return false;
  const en = buildFullEnglishStem(q);
  if (!en && !q.matchColumns?.columnA?.length) return false;

  if (looksMatch(q) && !matchHiOk(q)) return true;
  if (looksAssertion(q) && !assertionHiOk(q)) return true;

  const hi = String(q.question_hi || "").trim();
  if (!hi || !stemLooksHindi(hi) || isIncompleteHindiStem(hi, en)) return true;
  if (!optionsHiOk(q)) return true;

  if (opts.includeExplanations && !explanationHiOk(q)) return true;

  return false;
}

function explanationHiOk(q: ClientMcq): boolean {
  const answer = String(q.correctAnswer || "A").toUpperCase().charAt(0);
  const raw = q.explanation_hi;
  if (!raw) return false;
  if (typeof raw === "string") return hasDevanagari(raw);
  const hi = String((raw as Record<string, string>)[answer] || "").trim();
  return hasDevanagari(hi);
}

function buildHindiAssertionStem(assertion: string, reason: string): string {
  return [
    `अभिकथन (A): ${assertion}`,
    `कारण (R): ${reason}`,
    "उपर्युक्त के संदर्भ में निम्नलिखित में से कौन-सा सही है?",
  ].join("\n");
}

function buildHindiMatchStem(columnA: string[], columnB: string[]): string {
  const lines = ["निम्नलिखित का मिलान कीजिए:", "सूची-I"];
  columnA.forEach((item, i) => {
    if (String(item || "").trim()) lines.push(`${String.fromCharCode(65 + i)}. ${item}`);
  });
  lines.push("सूची-II");
  columnB.forEach((item, i) => {
    if (String(item || "").trim()) lines.push(`${i + 1}. ${item}`);
  });
  lines.push("नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:");
  return lines.join("\n");
}

/**
 * Hard deadline around one MCQ translate so the exam UI never freezes.
 */
export async function ensureClientHindiMcq<T extends ClientMcq>(
  q: T,
  opts: { includeExplanations?: boolean; deadlineMs?: number } = {}
): Promise<T> {
  if (!needsClientHindi(q, opts)) return q;

  const deadlineMs = opts.deadlineMs ?? 18000;
  const work = ensureClientHindiMcqInner(q, opts);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          console.warn("[client-hi] deadline hit — showing partial/English");
          resolve(q);
        }, deadlineMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function ensureClientHindiMcqInner<T extends ClientMcq>(
  q: T,
  opts: { includeExplanations?: boolean } = {}
): Promise<T> {
  const includeExplanations = opts.includeExplanations === true;
  const stemEn = buildFullEnglishStem(q);
  const optsEn = enOpts(q) as Record<string, string>;
  const existingHi = String(q.question_hi || "").trim();
  const keepExistingStem =
    existingHi &&
    stemLooksHindi(existingHi) &&
    !isIncompleteHindiStem(existingHi, stemEn) &&
    !(looksMatch(q) && !matchHiOk(q)) &&
    !(looksAssertion(q) && !assertionHiOk(q));

  let assertionReason_hi = q.assertionReason_hi || null;
  let question_hi = keepExistingStem ? existingHi : "";
  let matchColumns_hi = q.matchColumns_hi || null;

  // Run pattern-specific stem + options in parallel where possible
  const tasks: Promise<void>[] = [];

  if (looksAssertion(q) && !assertionHiOk(q)) {
    tasks.push(
      (async () => {
        let assertion = String(q.assertionReason?.assertion || "").trim();
        let reason = String(q.assertionReason?.reason || "").trim();
        if (!assertion || !reason) {
          const aM = stemEn.match(
            /(?:Assertion|अभिकथन)\s*\(A\)\s*:\s*([\s\S]*?)(?=(?:Reason|कारण)\s*\(R\)|$)/i
          );
          const rM = stemEn.match(
            /(?:Reason|कारण)\s*\(R\)\s*:\s*([\s\S]*?)(?=\n(?:In the context|Which of the|उपर्युक्त)|$)/i
          );
          assertion = assertion || String(aM?.[1] || "").trim();
          reason = reason || String(rM?.[1] || "").trim();
        }
        if (!assertion || !reason) return;
        const [aHi, rHi] = await Promise.all([translateEnToHi(assertion), translateEnToHi(reason)]);
        assertionReason_hi = { assertion: aHi, reason: rHi };
        question_hi = buildHindiAssertionStem(aHi, rHi);
      })()
    );
  }

  if (looksMatch(q) && q.matchColumns?.columnA?.length && !matchHiOk(q)) {
    tasks.push(
      (async () => {
        const items = [
          ...(q.matchColumns!.columnA || []).map((t) => String(t || "")),
          ...(q.matchColumns!.columnB || []).map((t) => String(t || "")),
        ];
        const translated = await mapPool(items, MAX_PARALLEL, (t) => translateEnToHi(t));
        const aLen = (q.matchColumns!.columnA || []).length;
        const columnA = translated.slice(0, aLen);
        const columnB = translated.slice(aLen);
        matchColumns_hi = { columnA, columnB };
        question_hi = buildHindiMatchStem(columnA, columnB);
      })()
    );
  }

  await Promise.all(tasks);

  if (!question_hi || !stemLooksHindi(question_hi)) {
    question_hi = keepExistingStem ? existingHi : await translateEnToHi(stemEn);
  }

  const existingOpts = q.options_hi || {};
  const optKeys = ["A", "B", "C", "D"] as const;
  const optTranslated = await mapPool([...optKeys], MAX_PARALLEL, async (k) => {
    const have = String((existingOpts as Record<string, string>)[k] || "").trim();
    if (hasDevanagari(have)) return have;
    return translateEnToHi(String(optsEn[k] || ""));
  });
  const options_hi = {
    A: optTranslated[0],
    B: optTranslated[1],
    C: optTranslated[2],
    D: optTranslated[3],
  };

  // Explanations only when explicitly requested (result page) — free Google MT, no OpenRouter
  let explanation_hi: ClientMcq["explanation_hi"] = q.explanation_hi;
  if (includeExplanations) {
    const answer = String(q.correctAnswer || "A").toUpperCase().charAt(0) as
      | "A"
      | "B"
      | "C"
      | "D";
    const expEnRaw = q.explanation_en ?? q.explanation;
    const existing =
      explanation_hi && typeof explanation_hi === "object"
        ? ({ ...(explanation_hi as Record<string, string>) } as Record<string, string>)
        : typeof explanation_hi === "string" && explanation_hi.trim()
          ? { A: "", B: "", C: "", D: "", [answer]: explanation_hi.trim() }
          : { A: "", B: "", C: "", D: "" };

    if (expEnRaw && typeof expEnRaw === "object") {
      const translated: Record<string, string> = { ...existing };
      // Prefer correct option; also fill any distinct wrong-option reasons
      await mapPool([...optKeys], 2, async (k) => {
        const en = String((expEnRaw as Record<string, string>)[k] || "").trim();
        if (!en) return;
        if (hasDevanagari(String(existing[k] || ""))) {
          translated[k] = existing[k];
          return;
        }
        translated[k] = await translateEnToHi(en.slice(0, 500));
      });
      explanation_hi = translated as ClientMcq["explanation_hi"];
    } else if (typeof expEnRaw === "string" && expEnRaw.trim()) {
      if (!hasDevanagari(String(existing[answer] || ""))) {
        existing[answer] = await translateEnToHi(expEnRaw.slice(0, 500));
      }
      explanation_hi = existing as ClientMcq["explanation_hi"];
    }
  }

  return {
    ...q,
    question_hi,
    options_hi,
    matchColumns_hi,
    assertionReason_hi,
    explanation_hi,
    hasHindi: true,
  } as T;
}
