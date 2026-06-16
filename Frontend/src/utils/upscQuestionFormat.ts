export type UpscStemPart =
  | { type: "intro"; text: string }
  | { type: "statement"; number: number; text: string }
  | { type: "prompt"; text: string }
  | { type: "assertion"; role: "A" | "R"; text: string }
  | { type: "plain"; text: string };

const PROMPT_PATTERNS = [
  /which of the (?:statements|following statements)(?: given above)?(?: is\/are| are)?[^.]*\??/i,
  /how many of the (?:above )?statements?(?: given above)?(?: is\/are| are)?[^.]*\??/i,
  /which of the above(?: statements)?(?: is\/are| are)?[^.]*\??/i,
  /select the correct answer using the codes? given below[^.]*\??/i,
  /निम्नलिखित(?: में से)?(?: कौन(?:-सा|-से)?\/कौन-से)?[^.]*\??/,
  /उपर्युक्त(?: में से)?(?: कौन(?:-सा|-से)?\/कौन-से)?[^.]*\??/,
  /ऊपर(?: दिए गए)?(?: कथनों| कथन)?(?: में से)?[^.]*\??/,
];

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

    if (stmt) parts.push({ type: "statement", number: markers[i].number, text: stmt });
  }

  return parts.length > 0 ? parts : null;
}

function parseAssertionReasonStem(text: string): UpscStemPart[] | null {
  const aSplit = text.split(/(?:Assertion|अभिकथन|कथन)\s*\(A\)\s*:?\s*/i);
  if (aSplit.length < 2) return null;

  const afterA = aSplit[1];
  const rSplit = afterA.split(/(?:Reason|कारण)\s*\(R\)\s*:?\s*/i);
  if (rSplit.length < 2) return null;

  const assertion = rSplit[0].trim();
  const reasonAndRest = rSplit[1].trim();
  const { body: reason, prompt } = extractTrailingPrompt(reasonAndRest);

  const parts: UpscStemPart[] = [
    { type: "assertion", role: "A", text: assertion },
    { type: "assertion", role: "R", text: reason },
  ];
  if (prompt) parts.push({ type: "prompt", text: prompt });
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
      parts.push({ type: "statement", number: Number(stmtMatch[1]), text: stmtMatch[2].trim() });
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
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.includes("<table")) {
    return [{ type: "plain", text: trimmed }];
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
  /match\s+(?:the\s+)?following|match\s+list[- ]?i|list[- ]?i\s+with\s+list[- ]?ii|निम्नलिखित.*मिलान|सूची[- ]?[iI1१].*(?:सूची|list)[- ]?[iI2२]|सूची[- ]?i.*(?:मिला|से)/i;
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
  // Split only on List-II header with subtitle e.g. "सूची-II (फोकस...)" — not intro "सूची-I का सूची-II से"
  const listIISplit = text.split(/(?:सूची[- ]?II|list[- ]?ii)\s*\(/i);
  const beforeListII = listIISplit[0] || text;
  const afterListII =
    listIISplit.length > 1
      ? listIISplit
          .slice(1)
          .map((part, i) => (i === 0 ? `(${part}` : part))
          .join("")
      : "";

  const columnA = extractLetteredColumnItems(beforeListII);
  if (columnA.length < 2) return null;

  let columnB = extractNumberedColumnItems(afterListII);
  if (columnB.length < 2) {
    columnB = extractNumberedColumnItems(text.slice(beforeListII.length));
  }

  return {
    intro: extractMatchIntro(text, beforeListII),
    columnA,
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
        columnA.push(rest);
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
  if (isChronologyQuestion(q)) return ["A", "B", "C"];
  const opts = q.options_en || q.options || {};
  const keys: OptionKey[] = ["A", "B", "C", "D"];
  return keys.filter((k) => String(opts[k] ?? "").trim());
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
  if (lang === "hi") {
    if (question.matchColumns_hi?.columnA?.length) {
      return {
        intro: "निम्नलिखित का मिलान कीजिए:",
        columnA: question.matchColumns_hi.columnA || [],
        columnB: question.matchColumns_hi.columnB || [],
        prompt: "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनिए:",
      };
    }
    const hiText = String(question.question_hi || "").trim();
    if (!hiText) return null;
    return parseMatchFollowingFromText(hiText) || parseMatchParagraph(hiText);
  }

  if (question.matchColumns?.columnA?.length) {
    return {
      intro: "Match the following:",
      columnA: question.matchColumns.columnA || [],
      columnB: question.matchColumns.columnB || [],
      prompt: "Select the correct answer using the code given below:",
    };
  }
  const text = String(question.question_en || question.question || "").trim();
  return parseMatchFollowingFromText(text);
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
  const isHi = /[\u0900-\u097F]/.test(`${ar.assertion}${ar.reason}`);
  const aLabel = isHi ? "कथन (A)" : "Assertion (A)";
  const rLabel = isHi ? "कारण (R)" : "Reason (R)";
  const prompt =
    ar.prompt ||
    (isHi
      ? "उपर्युक्त कथन (अ) और कारण (र) के संबंध में निम्नलिखित में से कौन-सा सही है?"
      : "In the context of the above, which of the following is correct?");
  return `${aLabel}: ${ar.assertion}\n${rLabel}: ${ar.reason}\n${prompt}`;
}
