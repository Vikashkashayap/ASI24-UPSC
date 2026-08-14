import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, "../../backups");
const KEEP_FILES = Math.max(7, parseInt(process.env.TEST_BACKUP_KEEP, 10) || 14);

function backupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  return BACKUP_DIR;
}

function testsCollection() {
  if (!mongoose.connection?.db) {
    throw new Error("MongoDB is not connected");
  }
  return mongoose.connection.db.collection("tests");
}

function archiveCollection() {
  return mongoose.connection.db.collection("testdeletearchives");
}

export async function backupTestsCollection({ reason = "manual" } = {}) {
  const tests = testsCollection();
  const rows = await tests.find({}).toArray();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir(), `tests-backup-${stamp}.json`);
  const payload = {
    exportedAt: new Date().toISOString(),
    reason,
    count: rows.length,
    tests: rows,
  };
  fs.writeFileSync(file, JSON.stringify(payload));
  rotateOldBackups();
  console.log(`[testBackup] saved ${rows.length} tests → ${file} (${reason})`);
  return { file, count: rows.length };
}

function rotateOldBackups() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("tests-backup-") && f.endsWith(".json"))
    .sort();
  const extra = files.length - KEEP_FILES;
  if (extra <= 0) return;
  for (const name of files.slice(0, extra)) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, name));
    } catch {
      /* ignore */
    }
  }
}

export function listTestBackupFiles() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("tests-backup-") && f.endsWith(".json"))
    .sort()
    .map((name) => path.join(BACKUP_DIR, name));
}

export function readLatestTestBackup() {
  const files = listTestBackupFiles();
  if (!files.length) return null;
  const file = files[files.length - 1];
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return { file, ...data };
}

/**
 * Copy matching tests into testdeletearchives, then delete from tests.
 * Submitted papers are never deleted by this helper.
 */
export async function archiveThenDeleteTests(filter, { reason = "cleanup" } = {}) {
  const tests = testsCollection();
  const docs = await tests.find(filter).toArray();
  if (!docs.length) return { archived: 0, deleted: 0 };

  const now = new Date();
  const archiveDocs = docs.map((doc) => ({
    originalId: doc._id,
    deletedAt: now,
    deletedReason: reason,
    test: doc,
  }));
  await archiveCollection().insertMany(archiveDocs, { ordered: false }).catch(() => {});

  const result = await tests.deleteMany(filter);
  console.log(
    `[testBackup] archived ${docs.length} then deleted ${result.deletedCount} (${reason})`
  );
  return { archived: docs.length, deleted: result.deletedCount };
}

export async function restoreMissingTestsFromBackup(backupPath) {
  const file = backupPath || readLatestTestBackup()?.file;
  if (!file) throw new Error("No tests backup file found in Backend/backups");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = data.tests || [];
  const tests = testsCollection();
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const id = row._id;
    if (!id) {
      skipped += 1;
      continue;
    }
    const exists = await tests.findOne({ _id: id }, { projection: { _id: 1 } });
    if (exists) {
      skipped += 1;
      continue;
    }
    await tests.insertOne(row);
    inserted += 1;
  }
  console.log(`[testBackup] restore from ${file}: inserted=${inserted} skipped=${skipped}`);
  return { file, inserted, skipped, total: rows.length };
}

export async function restoreFromDeleteArchive({ includeUnsubmitted = false } = {}) {
  const archive = archiveCollection();
  const tests = testsCollection();
  const rows = await archive.find({}).toArray();
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const doc = row.test;
    if (!doc?._id) {
      skipped += 1;
      continue;
    }
    if (!includeUnsubmitted && doc.isSubmitted !== true) {
      skipped += 1;
      continue;
    }
    const exists = await tests.findOne({ _id: doc._id }, { projection: { _id: 1 } });
    if (exists) {
      skipped += 1;
      continue;
    }
    await tests.insertOne(doc);
    inserted += 1;
  }
  console.log(`[testBackup] restore from archive: inserted=${inserted} skipped=${skipped}`);
  return { inserted, skipped, total: rows.length };
}

let backupCronStarted = false;

export function startTestBackupCron() {
  if (backupCronStarted) return;
  backupCronStarted = true;
  const hours = Math.max(1, parseInt(process.env.TEST_BACKUP_INTERVAL_HOURS, 10) || 72);
  const ms = hours * 60 * 60 * 1000;

  const run = () =>
    backupTestsCollection({ reason: "scheduled" }).catch((err) =>
      console.warn("[testBackup] scheduled backup failed:", err?.message || err)
    );

  setTimeout(() => {
    run();
  }, 20 * 1000);
  setInterval(run, ms);
  console.log(`[testBackup] cron on — every ${hours}h, keep last ${KEEP_FILES} files`);
}
