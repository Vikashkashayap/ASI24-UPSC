/**
 * One-shot: translate foundation chapter names → Hindi map file.
 * Usage: node scripts/genChapterHindiLabels.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const ROOT = path.resolve(__dirname, "../..");
const CHAPTERS_PATH = path.join(ROOT, "tmp_chapters.json");
const OUT_PATH = path.join(ROOT, "Backend/src/services/foundationSyllabusChapterHi.js");

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY missing");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(CHAPTERS_PATH, "utf8"));
const uniqueNames = [...new Set(rows.map((r) => r.name))];

async function translateBatch(names) {
  const prompt = `You are a professional Hindi translator for UPSC CSE syllabus chapter titles.
Translate each English chapter title into formal Hindi (Devanagari).
Keep proper nouns, acronyms (UPSC, GST, NITI, CAG, NHRC, UNESCO, NCERT, etc.), article numbers, and years as-is where natural.
Return ONLY a JSON array of strings, same length and order as input. No markdown.

Input JSON array:
${JSON.stringify(names)}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mentorsdaily.local",
      "X-Title": "ASI24 Chapter Hindi Labels",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Return only valid JSON arrays. No commentary." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content || "";
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length !== names.length) {
    throw new Error(`Bad batch length: got ${parsed?.length}, expected ${names.length}`);
  }
  return parsed.map((x) => String(x || "").trim());
}

const map = {};
const BATCH = 40;
for (let i = 0; i < uniqueNames.length; i += BATCH) {
  const slice = uniqueNames.slice(i, i + BATCH);
  process.stdout.write(`Translating ${i + 1}–${i + slice.length}/${uniqueNames.length}… `);
  let attempt = 0;
  for (;;) {
    try {
      const hi = await translateBatch(slice);
      slice.forEach((en, idx) => {
        map[en] = hi[idx] || en;
      });
      console.log("ok");
      break;
    } catch (e) {
      attempt += 1;
      console.log(`retry ${attempt}: ${e.message}`);
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

// Also key by moduleId|chapter for stable lookup
const byKey = {};
for (const r of rows) {
  const hi = map[r.name] || r.name;
  byKey[`${r.moduleId}|${r.chapter}`] = hi;
}

const file = `/**
 * Auto-generated Hindi chapter titles for MentorsDaily Foundation Plan.
 * Keys: English chapter name, and moduleId|chapterNumber.
 */
export const CHAPTER_NAME_HI_BY_EN = ${JSON.stringify(map, null, 2)};

export const CHAPTER_NAME_HI_BY_KEY = ${JSON.stringify(byKey, null, 2)};

export function getChapterNameHi(englishName, moduleId, chapter) {
  const key = moduleId != null && chapter != null ? \`\${moduleId}|\${chapter}\` : null;
  if (key && CHAPTER_NAME_HI_BY_KEY[key]) return CHAPTER_NAME_HI_BY_KEY[key];
  if (englishName && CHAPTER_NAME_HI_BY_EN[englishName]) return CHAPTER_NAME_HI_BY_EN[englishName];
  return englishName || "";
}
`;

fs.writeFileSync(OUT_PATH, file, "utf8");
console.log(`Wrote ${OUT_PATH} (${Object.keys(map).length} names, ${Object.keys(byKey).length} keys)`);
