import * as XLSX from "xlsx";

/**
 * Normalize header cell to key: topic, subtopic
 */
function headerKey(cell) {
  const s = String(cell || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (s.includes("subtopic") || s === "sub-topic" || s === "sub topic") return "subtopic";
  if (s.includes("topic")) return "topic";
  return "";
}

/**
 * Parse workbook buffer: each sheet name = subject.
 * Expects columns Topic (+ optional Subtopic) in first row.
 */
export function parseSyllabusWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const subjects = [];

  for (const sheetName of workbook.SheetNames) {
    const subject = String(sheetName || "").trim();
    if (!subject || subject.startsWith("_")) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    if (!rows.length) {
      subjects.push({ name: subject, topics: [] });
      continue;
    }

    const headerRow = rows[0].map((c) => String(c || "").trim());
    let topicCol = -1;
    let subtopicCol = -1;
    for (let i = 0; i < headerRow.length; i++) {
      const k = headerKey(headerRow[i]);
      if (k === "topic" && topicCol < 0) topicCol = i;
      if (k === "subtopic" && subtopicCol < 0) subtopicCol = i;
    }
    if (topicCol < 0) {
      topicCol = 0;
      subtopicCol = headerRow.length > 1 ? 1 : -1;
    }

    const topics = [];
    let current = null;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const topicCell = String(row[topicCol] ?? "").trim();
      const subCell =
        subtopicCol >= 0 ? String(row[subtopicCol] ?? "").trim() : "";

      if (!topicCell && !subCell) continue;

      if (topicCell) {
        current = { topic: topicCell, subtopics: subCell ? [subCell] : [] };
        topics.push(current);
      } else if (subCell && current) {
        current.subtopics.push(subCell);
      } else if (subCell && !current) {
        current = { topic: subCell, subtopics: [] };
        topics.push(current);
      }
    }

    subjects.push({ name: subject, topics });
  }

  const totalTopicRows = subjects.reduce((n, s) => n + s.topics.length, 0);
  return { subjects, totalTopicRows };
}
