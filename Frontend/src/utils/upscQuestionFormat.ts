export type UpscStemPart =
  | { type: "intro"; text: string }
  | { type: "statement"; number: number; text: string }
  | { type: "prompt"; text: string }
  | { type: "assertion"; role: "A" | "R"; text: string }
  | { type: "plain"; text: string };

const PLACEHOLDER_ITEM_RE =
  /^(?:[—–\-−•·.…]{1,6}|n\/?a|na|tbd|todo|null|undefined|none|blank|empty|\[object object\]|\.\.\.|…)$/i;

/** True when a numbered statement/option body is blank or a dash placeholder. */
export function isBlankUpscItemText(value: unknown): boolean {
  const s = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return true;
  if (s === "[object Object]") return true;
  if (PLACEHOLDER_ITEM_RE.test(s)) return true;
  if (/^[\s—–\-−•·.…,;:|/\\]+$/.test(s)) return true;
  return false;
}

/** Strip corrupted / blank numbered lines before render. */
export function sanitizeUpscStemText(text: string): string {
  return String(text || "")
    .replace(/\\n/g, "\n")
    .replace(/\[object Object\]/gi, "")
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\s*\d+[.)]\s+)(.*)$/);
      if (!m) return line;
      const body = m[2].trim();
      if (isBlankUpscItemText(body)) return null;
      return `${m[1]}${body}`;
    })
    .filter((l): l is string => l != null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stemHasBlankNumberedItems(text: string): boolean {
  const src = String(text || "").replace(/\\n/g, "\n");
  const markers = [...src.matchAll(/(?:^|\n)\s*\d+[.)]\s+/g)];
  if (markers.length < 2) return false;
  let blank = 0;
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index! + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index! : src.length;
    const body = src.slice(start, end).trim().split(/\n/)[0] || "";
    if (isBlankUpscItemText(body) || body.length < 8) blank += 1;
  }
  return blank > 0;
}

const PROMPT_PATTERNS = [
  /which of the (?:statements|following statements)(?: given above)?(?: is\/are| are)?[^.]*\??/i,
  /which of the following(?:\s+options?)?(?:\s+is\/are|\s+are|\s+is)?[^.]*\??/i,
  /in the context of the above,?\s*which of the following[^.]*\??/i,
  /how many of the (?:above )?statements?(?: given above)?(?: is\/are| are)?[^.]*\??/i,
  /which of the above(?: statements)?(?: is\/are| are)?[^.]*\??/i,
  /select the correct answer using the codes? given below[^.]*\??/i,
  /निम्नलिखित(?: में से)?(?: कौन(?:-सा|-से)?\/कौन-से)?[^.]*\??/,
  /उपर्युक्त(?: में से)?(?: कौन(?:-सा|-से)?\/कौन-से)?[^.]*\??/,
  /ऊपर(?: दिए गए)?(?: कथनों| कथन)?(?: में से)?[^.]*\??/,
];

/** Trailing MCQ prompts that must never stay inside Assertion/Reason body text. */
const AR_TRAILING_PROMPT_RE =
  /(?:[.!?]?\s*)(?:In the context of the above,?\s*)?(?:Which of the following(?:\s+options?)?(?:\s+is\/are|\s+are|\s+is)?[^.?]*\??|Select the correct answer[^.?]*\??|उपर्युक्त के संदर्भ में[^.?]*\??|निम्नलिखित में से कौन[^.?]*\??)\s*$/i;

/** Strip leaked "Which of the following is correct?" (etc.) from A/R body. */
export function stripAssertionReasonTrailingPrompt(text: string): string {
  return String(text || "")
    .replace(AR_TRAILING_PROMPT_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

const INTRO_PATTERNS = [
  /consider the following/i,
  /read the following/i,
  /with reference to/i,
  /regarding the following/i,
  /निम्नलिखित(?: कथनों?| में से)?/,
  /निम्न(?: कथनों?)?(?: पर| के| में)?/,
];

function extractTrailingPrompt(text: string): { body: string; prompt: string | null } {
  for (const pattern of PROMPT_PATTERNS) {
    const match = text.match(pattern);
    if (!match || match.index == null) continue;
    const before = text.slice(0, match.index).trim();
    if (before.length < 8) continue;
    return { body: before, prompt: match[0].trim() };
  }
  return { body: text, prompt: null };
}

function findStatementMarkers(text: string): { index: number; length: number; number: number }[] {
  const markers: { index: number; length: number; number: number }[] = [];
  const regex = /\b(\d+)[.)]\s+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    markers.push({
      index: match.index,
      length: match[0].length,
      number: Number(match[1]),
    });
  }
  return markers;
}

function parseStatementStem(text: string): UpscStemPart[] | null {
  const markers = findStatementMarkers(text);
  if (markers.length < 2) return null;

  const parts: UpscStemPart[] = [];
  const intro = text.slice(0, markers[0].index).trim().replace(/[:\s]+$/, "");
  if (intro) parts.push({ type: "intro", text: intro.endsWith(":") ? intro : `${intro}:` });

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    let stmt = text.slice(start, end).trim();

    if (i === markers.length - 1) {
      const { body, prompt } = extractTrailingPrompt(stmt);
      stmt = body;
      if (prompt) parts.push({ type: "prompt", text: prompt });
      else if (INTRO_PATTERNS.some((p) => p.test(intro || text))) {
        parts.push({
          type: "prompt",
          text: /[\u0900-\u097F]/.test(text)
            ? "उपर्युक्त कथनों में से कौन-सा/से सही है/हैं?"
            : "Which of the statements given above is/are correct?",
        });
      }
    }

    if (stmt) {
      if (!isBlankUpscItemText(stmt)) {
        parts.push({ type: "statement", number: markers[i].number, text: stmt });
      }
    }
  }

  return parts.length > 0 ? parts : null;
}

function parseAssertionReasonStem(text: string): UpscStemPart[] | null {
  const aSplit = text.split(/(?:Assertion|अभिकथन|कथन)\s*\(A\)\s*:?\s*/i);
  if (aSplit.length < 2) return null;

  const afterA = aSplit[1];
  const rSplit = afterA.split(/(?:Reason|कारण)\s*\(R\)\s*:?\s*/i);
  if (rSplit.length < 2) return null;

  let assertion = stripAssertionReasonTrailingPrompt(rSplit[0]);
  let reasonAndRest = rSplit[1].trim();

  // Strip leaked option banks / code prompts from reason body
  reasonAndRest = reasonAndRest
    .replace(/\n?\s*नीचे दिए गए कूट[\s\S]*$/i, "")
    .replace(/\n?\s*Select the correct answer using the code[\s\S]*$/i, "")
    .replace(/\n?\s*In the context of the above[\s\S]*$/i, "")
    .replace(/\n?\s*Which of the following(?:\s+is|\s+are|\s+options)?[^.]*\??\s*$/i, "")
    .replace(/\n?\s*उपर्युक्त के संदर्भ में[\s\S]*$/i, "")
    .replace(/\n?\s*\(\s*A\s*\)\s*(?:दोनों|Both)[\s\S]*$/i, "")
    .replace(/\n?\s*A\s*[.)]\s*(?:दोनों|Both)[\s\S]*$/i, "")
    .trim();

  const { body: reasonRaw, prompt } = extractTrailingPrompt(reasonAndRest);
  const reason = stripAssertionReasonTrailingPrompt(reasonRaw);

  // Incomplete A-R (empty assertion or reason) — fall back to plain text
  if (assertion.length < 10 || reason.length < 10) return null;

  // Prefer clean A-R prompt (not a leaked options line)
  let cleanPrompt = prompt;
  if (cleanPrompt && /\(\s*[A-D]\s*\)|दोनों A और R|Both A and R/i.test(cleanPrompt)) {
    cleanPrompt = null;
  }

  const parts: UpscStemPart[] = [
    { type: "assertion", role: "A", text: assertion },
    { type: "assertion", role: "R", text: reason },
  ];
  if (cleanPrompt) parts.push({ type: "prompt", text: cleanPrompt });
  else {
    parts.push({
      type: "prompt",
      text: /[\u0900-\u097F]/.test(text)
        ? "उपर्युक्त के संदर्भ में निम्नलिखित में से कौन-सा सही है?"
        : "In the context of the above, which of the following is correct?",
    });
  }
  return parts;
}

function parseNewlineStatements(text: string): UpscStemPart[] | null {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 3) return null;

  const stmtLines = lines.filter((l) => /^\d+[.)]\s+/.test(l));
  if (stmtLines.length < 2) return null;

  const parts: UpscStemPart[] = [];
  const firstStmtIdx = lines.findIndex((l) => /^\d+[.)]\s+/.test(l));
  const introLines = lines.slice(0, firstStmtIdx);
  if (introLines.length) {
    const intro = introLines.join(" ").trim();
    parts.push({ type: "intro", text: intro.endsWith(":") ? intro : `${intro}:` });
  }

  for (const line of lines.slice(firstStmtIdx)) {
    const stmtMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (stmtMatch) {
      const body = stmtMatch[2].trim();
      if (!isBlankUpscItemText(body)) {
        parts.push({ type: "statement", number: Number(stmtMatch[1]), text: body });
      }
      continue;
    }
    if (PROMPT_PATTERNS.some((p) => p.test(line))) {
      parts.push({ type: "prompt", text: line });
    }
  }

  if (parts.some((p) => p.type === "statement") && !parts.some((p) => p.type === "prompt")) {
    parts.push({
      type: "prompt",
      text: /[\u0900-\u097F]/.test(text)
        ? "उपर्युक्त कथनों में से कौन-सा/से सही है/हैं?"
        : "Which of the statements given above is/are correct?",
    });
  }

  return parts.some((p) => p.type === "statement") ? parts : null;
}

/** Parse UPSC Prelims-style question stem into intro / numbered statements / prompt / A-R blocks. */
export function parseUpscQuestionStem(text: string): UpscStemPart[] {
  const trimmed = sanitizeUpscStemText(text);
  if (!trimmed) return [];

  if (trimmed.includes("<table")) {
    return [{ type: "plain", text: trimmed }];
  }

  // If original had blank numbered lines, prefer plain sanitized text over fake empty structure
  if (stemHasBlankNumberedItems(text) && !stemHasBlankNumberedItems(trimmed)) {
    const structured =
      parseAssertionReasonStem(trimmed) ||
      parseNewlineStatements(trimmed) ||
      parseStatementStem(trimmed);
    if (structured && structured.some((p) => p.type === "statement" || p.type === "assertion")) {
      return structured;
    }
  }

  return (
    parseAssertionReasonStem(trimmed) ||
    parseNewlineStatements(trimmed) ||
    parseStatementStem(trimmed) || [{ type: "plain", text: trimmed }]
  );
}

export function isStructuredUpscStem(parts: UpscStemPart[]): boolean {
  return parts.some((p) => p.type === "statement" || p.type === "assertion");
}

export interface ParsedMatchFollowing {
  intro: string;
  columnA: string[];
  columnB: string[];
  prompt: string;
}

const MATCH_INTRO_RE =
  /match\s+(?:the\s+)?following|consider the following pairs|match\s+list[- ]?i|list[- ]?i\s+with\s+list[- ]?ii|निम्नलिखित.*(?:मिलान|युग्म)|(?:सूची[- ]?[iI1१].*(?:सूची|list)[- ]?[iI2२])/i;
const MATCH_PROMPT_RE =
  /select the correct|code given below|नीचे दिए गए|सही उत्तर|सही जोड़ी|कूट/i;
const MATCH_SECTION_SKIP =
  /^(?:list[- ]?i|list[- ]?ii|सूची[- ]?[iI12१२])(?:\s*\([^)]+\))?\s*$/i;

function extractLetteredColumnItems(text: string): string[] {
  const items: string[] = [];
  const markers = [...text.matchAll(/\b([A-D])\.\s*/gi)];
  if (markers.length < 2) return items;

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index! + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index! : text.length;
    let item = text.slice(start, end).trim();
    item = item.replace(/\s*(?:सूची|list)[- ]?[iI2२II].*$/i, "").trim();
    if (item) items.push(item);
  }
  return items;
}

function extractNumberedColumnItems(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split(/\n+/)) {
    const m = line.trim().match(/^(\d+)[.)]\s*(.+)$/);
    if (m) items.push(m[2].trim());
  }
  if (items.length >= 2) return items;

  const markers = [...text.matchAll(/(?:^|\s)(\d+)\.\s+/g)];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index! + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index! : text.length;
    const item = text.slice(start, end).trim();
    if (item) items.push(item);
  }
  return items;
}

function extractMatchIntro(fullText: string, beforeListII: string): string {
  const beforeA = beforeListII.split(/\s*[A-D]\.\s*/i)[0]?.trim() || "";
  const cleaned = beforeA
    .replace(/\s*(?:सूची|list)[- ]?I\s*(?:\([^)]*\))?\s*:?\s*$/i, "")
    .trim();

  if (cleaned.length >= 10) {
    return cleaned.endsWith(":") || cleaned.endsWith("：") ? cleaned : `${cleaned}:`;
  }

  const hi = fullText.match(/^(.+?(?:मिलाएं|मिलान करें|मिलान)[^.]*[.:]?)/i);
  if (hi) return hi[1].trim();
  const en = fullText.match(/^(Match[^:]*:?)/i);
  if (en) return en[1].trim();

  return /[\u0900-\u097F]/.test(fullText) ? "निम्नलिखित का मिलान कीजिए:" : "Match the following:";
}

function extractMatchPrompt(text: string): string {
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!MATCH_PROMPT_RE.test(trimmed)) continue;
    if (/\b[A-D]\.\s/.test(trimmed) || /(?:सूची|list)[- ]?I\s*\(/i.test(trimmed)) continue;
    if (trimmed.length > 120) continue;
    return trimmed;
  }
  return /[\u0900-\u097F]/.test(text)
    ? "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:"
    : "Select the correct answer using the code given below:";
}

/** Parse match columns from a single paragraph (common in Hindi translations). */
function parseMatchParagraph(text: string): ParsedMatchFollowing | null {
  const listIISplit = text.split(/(?:सूची[- ]?(?:II|2|२)|list[- ]?ii)\s*(?:\([^)]*\))?\s*:?/i);
  const beforeListII = listIISplit[0] || text;
  const afterListII = listIISplit.length > 1 ? listIISplit.slice(1).join("") : "";

  const columnA = extractLetteredColumnItems(beforeListII);
  if (columnA.length < 2) return null;

  let columnB = extractNumberedColumnItems(afterListII);
  if (columnB.length < 2) {
    columnB = extractNumberedColumnItems(text.slice(beforeListII.length));
  }

  const cleanedA = columnA.map((item) =>
    String(item)
      .replace(/\s+\d+[.)]\s+[\s\S]*$/, "")
      .trim()
  );

  return {
    intro: extractMatchIntro(text, beforeListII),
    columnA: cleanedA,
    columnB,
    prompt: extractMatchPrompt(text),
  };
}

/** Parse "Match the following" / List-I & List-II from plain question text. */
export function parseMatchFollowingFromText(text: string): ParsedMatchFollowing | null {
  const trimmed = String(text || "").trim();
  if (!trimmed || !MATCH_INTRO_RE.test(trimmed)) return null;

  const columnA: string[] = [];
  const columnB: string[] = [];
  const introParts: string[] = [];
  let prompt = "";

  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (MATCH_PROMPT_RE.test(line)) {
      if (!prompt && !/\b[A-D]\.\s/.test(line) && line.length < 120) prompt = line;
      continue;
    }
    if (MATCH_SECTION_SKIP.test(line)) continue;
    if (/^\([^)]{3,50}\)$/.test(line)) continue;

    const inline = line.match(/^([A-D])\.\s*(.+?)\s+(\d+)\.\s*(.+)$/i);
    if (inline) {
      columnA.push(inline[2].trim());
      columnB.push(inline[4].trim());
      continue;
    }

    const aOnly = line.match(/^([A-D])\.\s*(.+)$/i);
    if (aOnly) {
      const rest = aOnly[2].trim();
      const embedded = rest.match(/^(.+?)\s+(\d+)\.\s*(.+)$/);
      if (embedded) {
        columnA.push(embedded[1].trim());
        columnB.push(embedded[3].trim());
      } else {
        const bleed = rest.match(/^(.+?)\s+\d+[.)]\s+/);
        columnA.push(bleed ? bleed[1].trim() : rest);
      }
      continue;
    }

    const bOnly = line.match(/^(\d+)\.\s*(.+)$/);
    if (bOnly) {
      columnB.push(bOnly[2].trim());
      continue;
    }

    if (columnA.length === 0 && columnB.length === 0) {
      introParts.push(line);
    }
  }

  if (columnA.length < 2 && columnB.length < 2) {
    const globalRe =
      /([A-D])\.\s*([^A-D\d][\s\S]*?)\s+(\d+)\.\s*([^A-D][^\n]*?)(?=\s+[A-D]\.\s|\s*$)/gi;
    let m: RegExpExecArray | null;
    while ((m = globalRe.exec(trimmed)) !== null) {
      columnA.push(m[2].trim());
      columnB.push(m[4].trim());
    }
  }

  if (columnA.length < 2) {
    return parseMatchParagraph(trimmed);
  }

  const intro =
    introParts.join(" ").trim() ||
    trimmed.split(/\n/)[0]?.trim() ||
    "Match the following:";

  const cleanedIntro = intro.replace(/\s*list[- ]?i.*$/i, "").replace(/\s*सूची[- ]?I.*$/i, "").trim();

  return {
    intro: cleanedIntro || extractMatchIntro(trimmed, trimmed),
    columnA,
    columnB,
    prompt: prompt || extractMatchPrompt(trimmed),
  };
}

const CHRONOLOGY_RE =
  /chronolog|कालक्रम|correct chronological order|arrange the following|order the following|sequence of events|क्रम में/i;

export function isChronologyQuestionText(text: string): boolean {
  return CHRONOLOGY_RE.test(String(text || ""));
}

export function isChronologyQuestion(q: {
  questionType?: string;
  question?: string;
  question_en?: string;
}): boolean {
  if (q.questionType === "chronology") return true;
  const en = String(q.question_en || q.question || "");
  return isChronologyQuestionText(en);
}

export type OptionKey = "A" | "B" | "C" | "D";

/** Chronology MCQs use 3 options (UPSC style). */
export function getQuestionOptionKeys(q: {
  questionType?: string;
  question?: string;
  question_en?: string;
  options?: Record<string, string>;
  options_en?: Record<string, string>;
}): OptionKey[] {
  if (isChronologyQuestion(q)) {
    return (["A", "B", "C"] as OptionKey[]).filter((k) => {
      const opts = q.options_en || q.options || {};
      const v = String(opts[k] ?? "").trim();
      return v && !isBlankUpscItemText(v);
    });
  }
  const opts = q.options_en || q.options || {};
  const keys: OptionKey[] = ["A", "B", "C", "D"];
  return keys.filter((k) => {
    const v = String(opts[k] ?? "").trim();
    return v && !isBlankUpscItemText(v);
  });
}

export function isAssertionReasonText(text: string): boolean {
  return (
    /(?:Assertion|अभिकथन|कथन)\s*\(A\)/i.test(text) &&
    /(?:Reason|कारण)\s*\(R\)/i.test(text)
  );
}

export function resolveMatchColumns(
  question: {
    question?: string;
    question_en?: string;
    question_hi?: string;
    matchColumns?: { columnA?: string[]; columnB?: string[] } | null;
    matchColumns_hi?: { columnA?: string[]; columnB?: string[] } | null;
  },
  lang: "en" | "hi" = "en"
): ParsedMatchFollowing | null {
  const normalizeCols = (columnA: string[], columnB: string[]) => {
    const coerce = (x: unknown) => {
      if (x == null) return "";
      if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") {
        const s = String(x).trim();
        return s === "[object Object]" ? "" : s;
      }
      if (typeof x === "object") {
        const o = x as Record<string, unknown>;
        for (const k of ["text", "hi", "en", "item", "content", "value", "label", "name"]) {
          if (typeof o[k] === "string" && String(o[k]).trim()) return String(o[k]).trim();
        }
      }
      return "";
    };
    const a = columnA.map(coerce);
    const b = columnB.map(coerce);
    const n = Math.max(a.length, b.length);
    while (a.length < n) a.push("");
    while (b.length < n) b.push("");
    return { columnA: a, columnB: b };
  };

  if (lang === "hi") {
    if (question.matchColumns_hi?.columnA?.length) {
      const { columnA, columnB } = normalizeCols(
        question.matchColumns_hi.columnA || [],
        question.matchColumns_hi.columnB || []
      );
      const aOk = columnA.filter(Boolean).length;
      const bOk = columnB.filter(Boolean).length;
      const hasHi = [...columnA, ...columnB].some((t) => /[\u0900-\u097F]/.test(t));
      // Only accept Hindi structured lists when they actually contain Devanagari
      if (aOk >= 2 && bOk >= 2 && aOk === bOk && !columnA.some((t, i) => !t || !columnB[i]) && hasHi) {
        return {
          intro: "निम्नलिखित का मिलान कीजिए:",
          columnA,
          columnB,
          prompt: "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:",
        };
      }
    }
    const hiText = String(question.question_hi || "")
      .trim()
      // Normalize ए/बी/सी/डी → A/B/C/D so match parser can find Latin markers
      .replace(/(^|[\s,;:(\n])ए\s*([.)\-–—])/g, "$1A$2")
      .replace(/(^|[\s,;:(\n])बी\s*([.)\-–—])/g, "$1B$2")
      .replace(/(^|[\s,;:(\n])सी\s*([.)\-–—])/g, "$1C$2")
      .replace(/(^|[\s,;:(\n])(?:डी|डी़)\s*([.)\-–—])/g, "$1D$2")
      .replace(/उपर्युक्त कथनों में से कौन-सा\/से सही है\/हैं\??/g, "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:");
    // Reject fake "statement" Hindi that was wrongly generated for a match question
    const hiLooksLikeMatch =
      /सूची\s*[-–—]?\s*i|मिलान|match\s+the\s+following|list\s*[-–—]?\s*i/i.test(hiText);
    const hiLooksLikeWrongStatement =
      /उपर्युक्त कथनों|कौन-सा\/से सही|which of the (following )?statements/i.test(hiText) &&
      !hiLooksLikeMatch;
    if (hiText && !hiLooksLikeWrongStatement && /[\u0900-\u097F]/.test(hiText)) {
      const parsed = parseMatchFollowingFromText(hiText) || parseMatchParagraph(hiText);
      if (
        parsed &&
        parsed.columnA.filter(Boolean).length >= 2 &&
        parsed.columnB.filter(Boolean).length >= 2 &&
        parsed.columnA.filter(Boolean).length === parsed.columnB.filter(Boolean).length &&
        // Require Devanagari in list bodies — don't show English under हिंदी label
        [...parsed.columnA, ...parsed.columnB].some((t) => /[\u0900-\u097F]/.test(String(t || "")))
      ) {
        return parsed;
      }
    }
    // Do NOT fall back to English columns under Hindi label (causes EN text in हिंदी panel)
    return null;
  }

  if (question.matchColumns?.columnA?.length) {
    const { columnA, columnB } = normalizeCols(
      question.matchColumns.columnA || [],
      question.matchColumns.columnB || []
    );
    const aOk = columnA.filter(Boolean).length;
    const bOk = columnB.filter(Boolean).length;
    // Accept 2+ complete pairs (UPSC often uses 2–4). Never pad with Missing item.
    if (
      aOk >= 2 &&
      bOk >= 2 &&
      aOk === bOk &&
      !columnA.some((t, i) => !t || !columnB[i])
    ) {
      return {
        intro: "Match the following:",
        columnA,
        columnB,
        prompt: "Select the correct answer using the code given below:",
      };
    }
  }
  const text = String(question.question_en || question.question || "").trim();
  const parsed = parseMatchFollowingFromText(text);
  if (
    parsed &&
    parsed.columnA.filter(Boolean).length >= 2 &&
    parsed.columnB.filter(Boolean).length >= 2 &&
    parsed.columnA.filter(Boolean).length === parsed.columnB.filter(Boolean).length
  ) {
    return parsed;
  }
  return null;
}

/** Flatten match columns into translatable plain text (for Hindi batch translation). */
export function formatMatchColumnsAsText(
  questionEn: string,
  columnA: string[],
  columnB: string[]
): string {
  const lines = [questionEn.trim() || "Match the following:"];
  columnA.forEach((item, i) => {
    if (item?.trim()) lines.push(`${String.fromCharCode(65 + i)}. ${item.trim()}`);
  });
  columnB.forEach((item, i) => {
    if (item?.trim()) lines.push(`${i + 1}. ${item.trim()}`);
  });
  lines.push("Select the correct answer using the code given below:");
  return lines.join("\n");
}

export function buildAssertionReasonStem(ar: {
  assertion: string;
  reason: string;
  prompt?: string;
}): string {
  const assertion = stripAssertionReasonTrailingPrompt(ar.assertion);
  const reason = stripAssertionReasonTrailingPrompt(ar.reason);
  const isHi = /[\u0900-\u097F]/.test(`${assertion}${reason}`);
  const aLabel = isHi ? "अभिकथन (A)" : "Assertion (A)";
  const rLabel = isHi ? "कारण (R)" : "Reason (R)";
  const prompt =
    ar.prompt ||
    (isHi
      ? "उपर्युक्त के संदर्भ में निम्नलिखित में से कौन-सा सही है?"
      : "In the context of the above, which of the following is correct?");
  return `${aLabel}: ${assertion}\n${rLabel}: ${reason}\n${prompt}`;
}
