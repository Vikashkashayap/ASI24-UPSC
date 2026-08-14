import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const sid = process.argv[2] || "6a57553a761bf85515560fbe";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../backups");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const latest = path.join(dir, files[files.length - 1]);
const data = JSON.parse(fs.readFileSync(latest, "utf8"));

const rows = data.tests.filter((t) => {
  const uid = t.userId?.$oid || t.userId;
  return String(uid) === sid;
});

console.log("Backup file:", files[files.length - 1]);
console.log("Tests for student", sid, ":", rows.length);
for (const t of rows) {
  console.log(
    `  ${t.isSubmitted ? "SUB" : "open"} | ${t.subject} | ${String(t.topic).slice(0, 70)} | score=${t.score} | ${t.createdAt}`
  );
}
