import fs from "fs";

const html = fs.readFileSync(
  "c:/Users/vikas/Downloads/mentorsdaily-full-syllabus-cse2028.html",
  "utf8"
);

function strip(htmlStr) {
  return String(htmlStr || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Parse "~9 h · 3.5 days" / "~8.5 h · 3 days" exactly as in MentorsDaily HTML. */
function parseDurationChip(chip) {
  const c = String(chip || "").replace(/\s+/g, " ").trim();
  // Normalize fancy dots/dashes
  const n = c.replace(/[·•⋅∙]/g, "·").replace(/[–—]/g, "-");
  const m =
    n.match(/~?\s*(\d+(?:\.\d+)?)\s*h\s*·\s*(\d+(?:\.\d+)?)\s*days?/i) ||
    n.match(/~?\s*(\d+(?:\.\d+)?)\s*h\s*[-/]\s*(\d+(?:\.\d+)?)\s*days?/i) ||
    n.match(/~?\s*(\d+(?:\.\d+)?)\s*h.*?(\d+(?:\.\d+)?)\s*days?/i);
  if (!m) return null;
  return {
    estimated_hours: Number(m[1]),
    estimated_days: Number(m[2]),
    duration_label: c.startsWith("~") ? c : `~${c}`,
  };
}

const subjects = [];
const subjectRe =
  /<section id="([^"]+)" class="subject">([\s\S]*?)(?=<section id=|<\/main>)/g;
let m;
while ((m = subjectRe.exec(html))) {
  const id = m[1];
  const body = m[2];
  const title = strip((body.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1]);
  const sub = strip((body.match(/class="ssub">([\s\S]*?)<\/div>/) || [])[1]);
  const sheadMatch = body.match(/class="shead">([\s\S]*?)(?=<details class="module">|$)/);
  const shead = sheadMatch ? sheadMatch[1] : "";
  const subjectChips = [...shead.matchAll(/class="chip[^"]*">([\s\S]*?)<\/span>/g)].map((x) =>
    strip(x[1])
  );
  const srcNote = strip((shead.match(/class="srcnote">([\s\S]*?)<\/div>/) || [])[1]);

  const modules = [];
  const modRe = /<details class="module">([\s\S]*?)<\/details>/g;
  let mm;
  while ((mm = modRe.exec(body))) {
    const mb = mm[1];
    const mnum = strip((mb.match(/class="mnum">([\s\S]*?)<\/span>/) || [])[1]);
    const mtitle = strip((mb.match(/class="mtitle">([\s\S]*?)<\/span>/) || [])[1]);
    const mchips = [...mb.matchAll(/class="chip[^"]*">([\s\S]*?)<\/span>/g)].map((x) =>
      strip(x[1])
    );

    let estimatedHours = null;
    let estimatedDays = null;
    let durationLabel = null;
    let chapterRange = null;
    let hasTest = false;
    let testLabel = null;

    for (const c of mchips) {
      if (/test/i.test(c)) {
        hasTest = true;
        testLabel = c;
        continue;
      }
      const dur = parseDurationChip(c);
      if (dur) {
        estimatedHours = dur.estimated_hours;
        estimatedDays = dur.estimated_days;
        durationLabel = dur.duration_label;
        continue;
      }
      // chapter / unit range chip (everything else that isn't duration/test)
      if (!chapterRange) chapterRange = c;
    }

    const chapters = [];
    const rowRe = /<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g;
    let r;
    while ((r = rowRe.exec(mb))) {
      const ch = strip(r[1]);
      const name = strip(r[2]);
      if (/^Ch$/i.test(ch) || /^Chapter/i.test(name)) continue;
      chapters.push({ chapter: ch, name });
    }

    const focus = strip(
      (mb.match(/class="mfoot"><b>Focus:<\/b>\s*([\s\S]*?)<\/div>/) || [])[1]
    );

    modules.push({
      module_code: mnum,
      module_name: mtitle,
      chapter_range: chapterRange,
      estimated_hours: estimatedHours,
      estimated_days: estimatedDays,
      duration_label: durationLabel,
      has_module_test: hasTest,
      test_label: testLabel,
      focus,
      chapters,
      chips: mchips,
    });
  }

  subjects.push({
    id,
    name: title,
    primary_source: sub,
    source_note: srcNote || null,
    chips: subjectChips,
    modules,
  });
}

const out = {
  meta: {
    title: "MentorsDaily Foundation Plan — Full Syllabus (CSE 2028 · 4h Tier)",
    source: "mentorsdaily-full-syllabus-cse2028.html",
    subjects: subjects.length,
    modules: subjects.reduce((a, s) => a + s.modules.length, 0),
  },
  subjects,
};

fs.writeFileSync(
  "d:/ASI24/Frontend/src/data/mentorsdaily_foundation_cse2028.json",
  JSON.stringify(out, null, 2)
);

// sanity: Economy E1 must be 3.5 days
const eco = subjects.find((s) => s.id === "economy");
const e1 = eco?.modules?.find((x) => x.module_code === "E1");
console.log("Wrote foundation syllabus");
console.log("subjects", out.meta.subjects, "modules", out.meta.modules);
console.log("E1 check:", e1?.module_name, e1?.duration_label, "days=", e1?.estimated_days, "hrs=", e1?.estimated_hours);

let bad = 0;
for (const s of subjects) {
  for (const mod of s.modules) {
    const chip = (mod.chips || []).find((c) => /days?/i.test(c) && /h\b/i.test(c));
    if (!chip) continue;
    const parsed = parseDurationChip(chip);
    if (!parsed || parsed.estimated_days !== mod.estimated_days) {
      bad++;
      console.log("MISMATCH", s.name, mod.module_code, chip, "->", mod.estimated_days);
    }
  }
}
console.log("duration mismatches:", bad);
