import fs from "fs";
import path from "path";

const src = "C:/Users/vikas/Downloads";
const dst = "D:/ASI24/Frontend/src/data";
const files = [
  "upsc_social_justice.json",
  "upsc_internal_security.json",
  "upsc_post_independence.json",
  "upsc_disaster_management.json",
  "upsc_art_culture.json",
];

const log = [];
for (const f of files) {
  try {
    const from = path.join(src, f);
    const to = path.join(dst, f);
    fs.copyFileSync(from, to);
    log.push(`${f}: OK (${fs.statSync(to).size} bytes)`);
  } catch (err) {
    log.push(`${f}: FAIL ${err.message}`);
  }
}
fs.writeFileSync("D:/ASI24/copy-upsc-syllabus.log", log.join("\n"), "utf8");
console.log(log.join("\n"));
