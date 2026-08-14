const MATCH_INTRO_RE =
  /match\s+(?:the\s+)?following|consider the following pairs|pairs?\s+(?:is\/are|are|is)\s+correctly\s+matched|correctly\s+matched|match\s+list[- ]?i|list[- ]?i\s+with\s+list[- ]?ii|list[- ]?i\b[\s\S]{0,500}?list[- ]?ii\b|निम्नलिखित.*(?:मिलान|युग्म)|(?:सूची[- ]?[iI1१].*(?:सूची|list)[- ]?[iI2२])/i;
const MATCH_PROMPT_RE =
  /select the correct|code given below|नीचे दिए गए|सही उत्तर|सही जोड़ी|कूट/i;
const STATEMENT_PROMPT_RE =
  /which of the (?:statements|following statements)|statements given above|उपर्युक्त कथनों/i;
const MATCH_SECTION_SKIP =
  /^(?:list[- ]?i|list[- ]?ii|सूची[- ]?[iI12१२])(?:\s*\([^)]+\))?\s*$/i;

function extractLetteredColumnItems(text) {
  const items = [];
  const markers = [...text.matchAll(/\b([A-D])\.\s*/gi)];
  if (markers.length < 2) return items;

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    let item = text.slice(start, end).trim();
    item = item.replace(/\s*(?:सूची|list)[- ]?[iI2२II].*$/i, "").trim();
    if (item) items.push(item);
  }
  return items;
}

function extractNumberedColumnItems(text) {
  const items = [];
  for (const line of text.split(/\n+/)) {
    const m = line.trim().match(/^(\d+)[.)]\s*(.+)$/);
    if (m) items.push(m[2].trim());
  }
  if (items.length >= 2) return items;

  const markers = [...text.matchAll(/(?:^|\s)(\d+)\.\s+/g)];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i][0].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const item = text.slice(start, end).trim();
    if (item) items.push(item);
  }
  return items;
}

function extractMatchIntro(fullText, beforeListII) {
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

function extractMatchPrompt(text) {
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

function parseMatchParagraph(text) {
  // Prefer explicit List-II / सूची-II header (with or without parenthesis)
  const listIISplit = text.split(/(?:सूची[- ]?(?:II|2|२)|list[- ]?ii)\s*(?:\([^)]*\))?\s*:?/i);
  const beforeListII = listIISplit[0] || text;
  const afterListII = listIISplit.length > 1 ? listIISplit.slice(1).join("") : "";

  const columnA = extractLetteredColumnItems(beforeListII);
  if (columnA.length < 2) return null;

  let columnB = extractNumberedColumnItems(afterListII);
  if (columnB.length < 2) {
    columnB = extractNumberedColumnItems(text.slice(beforeListII.length));
  }

  // Drop List-II bleed into columnA (e.g. "Objectivity 1. definition...")
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

/** Parse match-the-following from plain question text. */
export function parseMatchFollowingFromText(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed || !MATCH_INTRO_RE.test(trimmed)) return null;

  const columnA = [];
  const columnB = [];
  const introParts = [];
  let prompt = "";

  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (STATEMENT_PROMPT_RE.test(line) && !/\b[A-D]\.\s/.test(line)) continue;
    if (MATCH_PROMPT_RE.test(line)) {
      if (!prompt && !/\b[A-D]\.\s/.test(line) && line.length < 120) prompt = line;
      continue;
    }
    if (MATCH_SECTION_SKIP.test(line)) continue;
    if (/^\([^)]{3,50}\)$/.test(line)) continue;

    if (columnA.length < 2 && /\bA\.\s+\S/.test(line) && /\bB\.\s+\S/.test(line)) {
      const extracted = extractLetteredColumnItems(line);
      if (extracted.length >= 2) {
        columnA.push(...extracted);
        continue;
      }
    }

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
        // Strip accidental List-II bleed: "Objectivity 1. long definition..."
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
    let m;
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

export function formatMatchColumnsAsText(questionEn, columnA, columnB) {
  const lines = [String(questionEn || "").trim() || "Match the following:"];
  lines.push("List-I");
  (columnA || []).forEach((item, i) => {
    if (String(item || "").trim()) lines.push(`${String.fromCharCode(65 + i)}. ${String(item).trim()}`);
  });
  lines.push("List-II");
  (columnB || []).forEach((item, i) => {
    if (String(item || "").trim()) lines.push(`${i + 1}. ${String(item).trim()}`);
  });
  lines.push("Select the correct answer using the code given below:");
  return lines.join("\n");
}

export function buildMatchQuestionTextForTranslation(q) {
  const en = String(q.question_en || q.question || "").trim();
  if (q.matchColumns?.columnA?.length) {
    return formatMatchColumnsAsText(
      en.split("\n")[0] || "Match the following:",
      q.matchColumns.columnA,
      q.matchColumns.columnB || []
    );
  }
  return en;
}

/** Structured payload fields for reliable Hindi match translation. */
export function buildMatchColumnsPayload(q) {
  if (!q?.matchColumns?.columnA?.length) return null;
  return {
    columnA: (q.matchColumns.columnA || []).map((x) => String(x || "").trim()).filter(Boolean),
    columnB: (q.matchColumns.columnB || []).map((x) => String(x || "").trim()).filter(Boolean),
  };
}
