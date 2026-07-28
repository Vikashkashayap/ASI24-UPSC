/**
 * Section / structure detection from cleaned page text.
 */

const QUESTION_START =
  /^(?:Q\.?\s*|Question\s*)?(\d{1,3})[\).\]]\s+(.+)/i;
const OPTION_LINE = /^[\(\[]?([A-Da-d])[\).\]]\s+(.+)/;
const ANSWER_LINE = /^(?:Ans(?:wer)?|Correct\s*Answer)\s*[:.\-]\s*(.+)/i;
const EXPLAIN_LINE = /^(?:Exp(?:lanation)?|Solution)\s*[:.\-]\s*(.+)/i;

function isHeading(line) {
  const s = line.trim();
  if (s.length < 3 || s.length > 120) return false;
  if (QUESTION_START.test(s) || OPTION_LINE.test(s)) return false;
  if (/^[A-Z0-9][A-Z0-9\s,&:\-]{4,}$/.test(s)) return true;
  if (/^\d+(\.\d+)*\s+[A-Z]/.test(s)) return true;
  if (/^(chapter|unit|part|section|theme)\s+/i.test(s)) return true;
  return false;
}

function isSubheading(line) {
  const s = line.trim();
  if (s.length < 3 || s.length > 100) return false;
  return /^[A-Z][\w\s,&\-]+:$/.test(s) || /^\d+\.\d+/.test(s);
}

/**
 * @returns {Array<{ sectionType, text, pageNumber, order, headingLevel, metadata }>}
 */
export function detectSections(pages) {
  const sections = [];
  let order = 0;
  let currentTopic = "";

  for (const page of pages || []) {
    const pageNumber = page.pageNumber || 1;
    const lines = String(page.cleanedText || page.text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let paragraphBuf = [];

    const flushParagraph = () => {
      if (!paragraphBuf.length) return;
      sections.push({
        sectionType: "paragraph",
        text: paragraphBuf.join(" "),
        pageNumber,
        order: order++,
        headingLevel: null,
        topic: currentTopic,
        metadata: {},
      });
      paragraphBuf = [];
    };

    for (const line of lines) {
      if (QUESTION_START.test(line)) {
        flushParagraph();
        const m = line.match(QUESTION_START);
        sections.push({
          sectionType: "question",
          text: m[2],
          pageNumber,
          order: order++,
          headingLevel: null,
          topic: currentTopic,
          metadata: { questionNumber: m[1] },
        });
        continue;
      }
      if (OPTION_LINE.test(line)) {
        flushParagraph();
        const m = line.match(OPTION_LINE);
        sections.push({
          sectionType: "options",
          text: m[2],
          pageNumber,
          order: order++,
          headingLevel: null,
          topic: currentTopic,
          metadata: { label: m[1].toUpperCase() },
        });
        continue;
      }
      if (ANSWER_LINE.test(line)) {
        flushParagraph();
        const m = line.match(ANSWER_LINE);
        sections.push({
          sectionType: "answer",
          text: m[1],
          pageNumber,
          order: order++,
          headingLevel: null,
          topic: currentTopic,
          metadata: {},
        });
        continue;
      }
      if (EXPLAIN_LINE.test(line)) {
        flushParagraph();
        const m = line.match(EXPLAIN_LINE);
        sections.push({
          sectionType: "explanation",
          text: m[1],
          pageNumber,
          order: order++,
          headingLevel: null,
          topic: currentTopic,
          metadata: {},
        });
        continue;
      }
      if (isHeading(line)) {
        flushParagraph();
        currentTopic = line;
        sections.push({
          sectionType: "heading",
          text: line,
          pageNumber,
          order: order++,
          headingLevel: 1,
          topic: currentTopic,
          metadata: {},
        });
        continue;
      }
      if (isSubheading(line)) {
        flushParagraph();
        currentTopic = line.replace(/:$/, "");
        sections.push({
          sectionType: "subheading",
          text: line,
          pageNumber,
          order: order++,
          headingLevel: 2,
          topic: currentTopic,
          metadata: {},
        });
        continue;
      }
      if (/\|.+\|/.test(line)) {
        flushParagraph();
        sections.push({
          sectionType: "table",
          text: line,
          pageNumber,
          order: order++,
          headingLevel: null,
          topic: currentTopic,
          metadata: {},
        });
        continue;
      }
      paragraphBuf.push(line);
    }
    flushParagraph();
  }

  if (sections.length && sections[0].sectionType !== "title") {
    const firstHeading = sections.find((s) => s.sectionType === "heading");
    if (firstHeading) firstHeading.sectionType = "title";
  }

  return sections;
}
