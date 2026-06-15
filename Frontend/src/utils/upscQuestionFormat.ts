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

const CHRONOLOGY_INTRO_PATTERNS = [
  /arrange the following/i,
  /chronological order/i,
  /correct sequence/i,
  /correct order/i,
  /sequence of/i,
  /कालानुक्रम/i,
  /क्रम में व्यवस्थित/i,
  /क्रम में सजाएं/i,
];

const MATCH_INTRO_PATTERNS = [
  /match list-?i/i,
  /match the following/i,
  /सूची-?i/i,
  /मिलान करें/i,
];

function isChronologyIntro(text: string): boolean {
  return CHRONOLOGY_INTRO_PATTERNS.some((p) => p.test(text));
}

function isMatchIntro(text: string): boolean {
  return MATCH_INTRO_PATTERNS.some((p) => p.test(text));
}

const INTRO_PATTERNS = [
  /consider the following/i,
  /read the following/i,
  /with reference to/i,
  /regarding the following/i,
  /arrange the following/i,
  /match list-?i/i,
  /match the following/i,
  /निम्नलिखित(?: कथनों?| में से| घटनाओं)?/,
  /निम्न(?: कथनों?)?(?: पर| के| में)?/,
  /कालानुक्रम/i,
  /सूची-?i/i,
];

function defaultStemPrompt(intro: string, fullText: string): string | null {
  const isHi = /[\u0900-\u097F]/.test(fullText);
  if (isChronologyIntro(intro) || isChronologyIntro(fullText)) {
    return isHi
      ? "उपर्युक्त घटनाओं का सही कालानुक्रमिक क्रम नीचे दिए गए विकल्पों में से चुनें।"
      : "Select the correct chronological order from the options given below.";
  }
  if (isMatchIntro(intro) || isMatchIntro(fullText)) {
    return isHi
      ? "नीचे दिए गए कूट का प्रयोग कर सही उत्तर चुनें।"
      : "Select the correct answer using the codes given below.";
  }
  if (INTRO_PATTERNS.some((p) => p.test(intro || fullText))) {
    return isHi
      ? "उपर्युक्त कथनों में से कौन-सा/से सही है/हैं?"
      : "Which of the statements given above is/are correct?";
  }
  return null;
}


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
  const regex = /(?:^|\s)(?:\(?(\d+)\)?[.)]\s+)/g;
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
      else {
        const auto = defaultStemPrompt(intro || text, text);
        if (auto) parts.push({ type: "prompt", text: auto });
      }
    }

    if (stmt) parts.push({ type: "statement", number: markers[i].number, text: stmt });
  }

  return parts.length > 0 ? parts : null;
}

function parseAssertionReasonStem(text: string): UpscStemPart[] | null {
  const aSplit = text.split(/(?:Assertion|अभिकथन)\s*\(A\)\s*:?\s*/i);
  if (aSplit.length < 2) return null;

  const afterA = aSplit[1];
  const rSplit = afterA.split(/(?:Reason|कारण)\s*\(R\)\s*:?\s*/i);
  if (rSplit.length < 2) return null;

  const assertion = rSplit[0].trim();
  const reasonAndRest = rSplit[1].trim();
  const { body: reason, prompt } = extractTrailingPrompt(reasonAndRest);

  const clean = normalizeAssertionReasonPair(assertion, reason);
  const parts: UpscStemPart[] = [
    { type: "assertion", role: "A", text: clean.assertion },
    { type: "assertion", role: "R", text: clean.reason },
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
    const introPart = parts.find((p) => p.type === "intro");
    const auto = defaultStemPrompt(introPart?.type === "intro" ? introPart.text : "", text);
    if (auto) parts.push({ type: "prompt", text: auto });
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

/** Remove UPSC Assertion/Reason label prefix from stored field text. */
export function stripAssertionReasonLabel(text: string, role: "A" | "R"): string {
  let out = String(text ?? "").trim();
  if (!out) return "";
  const re =
    role === "A"
      ? /^(?:Assertion|अभिकथन)\s*\(A\)\s*:?\s*/i
      : /^(?:Reason|कारण)\s*\(R\)\s*:?\s*/i;
  while (re.test(out)) {
    out = out.replace(re, "").trim();
  }
  return out;
}

/**
 * Split combined "Assertion… Reason…" blobs and strip label prefixes.
 * Fixes LLM output where both A and R were stored in assertion with reason empty.
 */
export function normalizeAssertionReasonPair(
  assertion: string,
  reason: string
): { assertion: string; reason: string } {
  let a = stripAssertionReasonLabel(assertion, "A");
  let r = stripAssertionReasonLabel(reason, "R");

  if (!r && a) {
    const split = a.split(/(?:Reason|कारण)\s*\(R\)\s*:?\s*/i);
    if (split.length >= 2) {
      a = stripAssertionReasonLabel(split[0], "A");
      r = split.slice(1).join(" ").trim();
    }
  }

  return { assertion: a, reason: r };
}
