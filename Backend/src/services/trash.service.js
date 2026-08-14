import Test from "../models/Test.js";
import CopyEvaluation from "../models/CopyEvaluation.js";
import { User } from "../models/User.js";
import { deleteEvaluationFiles } from "./copyEvaluationStorageService.js";
import {
  TRASH_TTL_DAYS,
  restorePayload,
  trashDaysLeft,
  trashExpiresAt,
} from "../models/plugins/softTrash.js";

export const TRASH_CATEGORIES = [
  "all",
  "evaluation",
  "chapter",
  "practice",
  "module",
  "other",
];

const MODULE_TOPIC = /module\s*final/i;

function escapeRx(q) {
  return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isModuleTest(test) {
  return Boolean(test.syllabusModuleTargetId) || MODULE_TOPIC.test(String(test.topic || ""));
}

export function testCategory(test) {
  if (isModuleTest(test)) return "module";
  if (test.isChapterModulePractice) return "chapter";
  if (test.isPracticeGenerator) return "practice";
  return "other";
}

const CATEGORY_LABEL = {
  evaluation: "Copy Evaluation",
  chapter: "Chapter-wise",
  practice: "Practice",
  module: "Module",
  other: "Other",
};

function mapUser(user) {
  if (!user || typeof user !== "object") return null;
  return {
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
  };
}

function mapTestItem(doc) {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const category = testCategory(o);
  return {
    id: String(o._id),
    kind: "test",
    category,
    title: o.topic || o.subject || "Test",
    subtitle: [o.subject, CATEGORY_LABEL[category]].filter(Boolean).join(" · "),
    subject: o.subject,
    topic: o.topic,
    score: o.score,
    totalQuestions: o.totalQuestions,
    isSubmitted: o.isSubmitted,
    user: mapUser(o.userId),
    trashedAt: o.trashedAt,
    expiresAt: trashExpiresAt(o.trashedAt),
    daysLeft: trashDaysLeft(o.trashedAt),
    createdAt: o.createdAt,
  };
}

function mapEvalItem(doc) {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const fileName = o.fileName || o.pdfFileName || "";
  return {
    id: String(o._id),
    kind: "evaluation",
    category: "evaluation",
    title: o.subject || fileName || "Copy evaluation",
    subtitle: [o.paper, o.year, fileName].filter(Boolean).join(" · "),
    subject: o.subject,
    paper: o.paper,
    year: o.year,
    status: o.status,
    user: mapUser(o.userId),
    trashedAt: o.trashedAt,
    expiresAt: trashExpiresAt(o.trashedAt),
    daysLeft: trashDaysLeft(o.trashedAt),
    createdAt: o.createdAt,
  };
}

function testCategoryFilter(category) {
  if (category === "module") {
    return {
      $or: [
        { syllabusModuleTargetId: { $exists: true, $ne: null } },
        { topic: MODULE_TOPIC },
      ],
    };
  }
  if (category === "chapter") {
    return {
      isChapterModulePractice: true,
      $and: [
        {
          $or: [
            { syllabusModuleTargetId: null },
            { syllabusModuleTargetId: { $exists: false } },
          ],
        },
        { topic: { $not: MODULE_TOPIC } },
      ],
    };
  }
  if (category === "practice") {
    return { isPracticeGenerator: true };
  }
  if (category === "other") {
    return {
      isPracticeGenerator: { $ne: true },
      isChapterModulePractice: { $ne: true },
      $and: [
        {
          $or: [
            { syllabusModuleTargetId: null },
            { syllabusModuleTargetId: { $exists: false } },
          ],
        },
        { topic: { $not: MODULE_TOPIC } },
      ],
    };
  }
  return {};
}

async function studentUserIds(student) {
  const q = String(student || "").trim();
  if (!q) return null;
  const rx = new RegExp(escapeRx(q), "i");
  const users = await User.find({ $or: [{ name: rx }, { email: rx }] })
    .select("_id")
    .lean();
  return users.map((u) => u._id);
}

function withSearchAndStudent(base, { search, userIds, fields }) {
  const filter = { ...base, isTrashed: true };
  const and = [];
  if (Array.isArray(userIds)) {
    and.push({ userId: { $in: userIds } });
  }
  const q = String(search || "").trim();
  if (q) {
    const rx = new RegExp(escapeRx(q), "i");
    and.push({ $or: fields.map((f) => ({ [f]: rx })) });
  }
  if (and.length) filter.$and = [...(filter.$and || []), ...and];
  return filter;
}

const TEST_SELECT =
  "userId subject topic score totalQuestions isSubmitted isPracticeGenerator isChapterModulePractice assignedPracticeTestId prelimsMockId syllabusModuleTargetId trashedAt createdAt";

export async function listTrash({
  type = "all",
  page = 1,
  limit = 10,
  search = "",
  student = "",
} = {}) {
  const skip = (page - 1) * limit;
  const userIds = await studentUserIds(student);
  if (Array.isArray(userIds) && userIds.length === 0) {
    const students = await listTrashStudents();
    return emptyTrashResult(page, limit, students);
  }

  const wantEvals = type === "all" || type === "evaluation";
  const wantTests = type !== "evaluation";
  const testCat = ["chapter", "practice", "module", "other"].includes(type) ? type : "all";

  const testFilter = withSearchAndStudent(
    testCat === "all" ? {} : testCategoryFilter(testCat),
    { search, userIds, fields: ["subject", "topic"] }
  );
  const evalFilter = withSearchAndStudent(
    {},
    { search, userIds, fields: ["subject", "paper", "fileName", "pdfFileName"] }
  );

  const countFilters = {
    evaluation: evalFilter,
    chapter: withSearchAndStudent(testCategoryFilter("chapter"), {
      search,
      userIds,
      fields: ["subject", "topic"],
    }),
    practice: withSearchAndStudent(testCategoryFilter("practice"), {
      search,
      userIds,
      fields: ["subject", "topic"],
    }),
    module: withSearchAndStudent(testCategoryFilter("module"), {
      search,
      userIds,
      fields: ["subject", "topic"],
    }),
    other: withSearchAndStudent(testCategoryFilter("other"), {
      search,
      userIds,
      fields: ["subject", "topic"],
    }),
  };

  const [evalCount, chapterCount, practiceCount, moduleCount, otherCount, testMeta, evalMeta, students] =
    await Promise.all([
      CopyEvaluation.countDocuments(countFilters.evaluation),
      Test.countDocuments(countFilters.chapter),
      Test.countDocuments(countFilters.practice),
      Test.countDocuments(countFilters.module),
      Test.countDocuments(countFilters.other),
      wantTests
        ? Test.find(testFilter).select("_id trashedAt").sort({ trashedAt: -1 }).lean()
        : Promise.resolve([]),
      wantEvals
        ? CopyEvaluation.find(evalFilter).select("_id trashedAt").sort({ trashedAt: -1 }).lean()
        : Promise.resolve([]),
      listTrashStudents(),
    ]);

  const merged = [
    ...testMeta.map((t) => ({ id: t._id, kind: "test", trashedAt: t.trashedAt })),
    ...evalMeta.map((e) => ({ id: e._id, kind: "evaluation", trashedAt: e.trashedAt })),
  ].sort((a, b) => new Date(b.trashedAt || 0) - new Date(a.trashedAt || 0));

  const total = merged.length;
  const pageSlice = merged.slice(skip, skip + limit);
  const testIds = pageSlice.filter((x) => x.kind === "test").map((x) => x.id);
  const evalIds = pageSlice.filter((x) => x.kind === "evaluation").map((x) => x.id);

  const [tests, evals] = await Promise.all([
    testIds.length
      ? Test.find({ _id: { $in: testIds }, isTrashed: true })
          .select(TEST_SELECT)
          .populate("userId", "name email")
          .lean()
      : [],
    evalIds.length
      ? CopyEvaluation.find({ _id: { $in: evalIds }, isTrashed: true })
          .select("userId subject paper year fileName pdfFileName status trashedAt createdAt")
          .populate("userId", "name email")
          .lean()
      : [],
  ]);

  const testMap = new Map(tests.map((t) => [String(t._id), t]));
  const evalMap = new Map(evals.map((e) => [String(e._id), e]));
  const items = pageSlice
    .map((row) => {
      if (row.kind === "test") {
        const doc = testMap.get(String(row.id));
        return doc ? mapTestItem(doc) : null;
      }
      const doc = evalMap.get(String(row.id));
      return doc ? mapEvalItem(doc) : null;
    })
    .filter(Boolean);

  const counts = {
    evaluation: evalCount,
    chapter: chapterCount,
    practice: practiceCount,
    module: moduleCount,
    other: otherCount,
    total: evalCount + chapterCount + practiceCount + moduleCount + otherCount,
  };

  return {
    items,
    ttlDays: TRASH_TTL_DAYS,
    students,
    counts,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

function emptyTrashResult(page, limit, students = []) {
  return {
    items: [],
    ttlDays: TRASH_TTL_DAYS,
    students,
    counts: { evaluation: 0, chapter: 0, practice: 0, module: 0, other: 0, total: 0 },
    pagination: { total: 0, page, limit, pages: 1 },
  };
}

async function listTrashStudents() {
  const [testUsers, evalUsers] = await Promise.all([
    Test.distinct("userId", { isTrashed: true, userId: { $ne: null } }),
    CopyEvaluation.distinct("userId", { isTrashed: true, userId: { $ne: null } }),
  ]);
  const ids = [...new Set([...testUsers, ...evalUsers].map((id) => String(id)))];
  if (!ids.length) return [];
  const users = await User.find({ _id: { $in: ids } })
    .select("name email")
    .sort({ name: 1 })
    .lean();
  return users.map((u) => ({
    _id: String(u._id),
    name: u.name || "",
    email: u.email || "",
  }));
}

export async function restoreTrashItem(kind, id) {
  const filter = { _id: id, isTrashed: true };
  const update = restorePayload();
  if (kind === "test") {
    return Test.findOneAndUpdate(filter, update, { new: true });
  }
  if (kind === "evaluation") {
    return CopyEvaluation.findOneAndUpdate(filter, update, { new: true });
  }
  return null;
}

export async function permanentlyDeleteTrashItem(kind, id) {
  const filter = { _id: id, isTrashed: true };
  if (kind === "test") {
    const doc = await Test.findOneAndDelete(filter);
    return Boolean(doc);
  }
  if (kind === "evaluation") {
    const doc = await CopyEvaluation.findOneAndDelete(filter);
    if (!doc) return false;
    await deleteEvaluationFiles(id);
    return true;
  }
  return false;
}

function normalizeBulkItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, 100)
    .map((row) => {
      const kind = row?.kind === "evaluation" ? "evaluation" : row?.kind === "test" ? "test" : null;
      const id = row?.id ? String(row.id) : "";
      return kind && id ? { kind, id } : null;
    })
    .filter(Boolean);
}

export async function bulkRestoreTrash(items) {
  const rows = normalizeBulkItems(items);
  let restored = 0;
  for (const row of rows) {
    const doc = await restoreTrashItem(row.kind, row.id);
    if (doc) restored += 1;
  }
  return { restored, requested: rows.length };
}

export async function bulkPermanentDeleteTrash(items) {
  const rows = normalizeBulkItems(items);
  let deleted = 0;
  for (const row of rows) {
    const ok = await permanentlyDeleteTrashItem(row.kind, row.id);
    if (ok) deleted += 1;
  }
  return { deleted, requested: rows.length };
}

export async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - TRASH_TTL_DAYS * 24 * 60 * 60 * 1000);
  const expiredFilter = { isTrashed: true, trashedAt: { $lte: cutoff } };

  const expiredEvals = await CopyEvaluation.find(expiredFilter).select("_id").lean();
  for (const row of expiredEvals) {
    try {
      await deleteEvaluationFiles(row._id);
    } catch (err) {
      console.warn("[trash] eval files cleanup failed:", row._id, err?.message || err);
    }
  }

  const [evalResult, testResult] = await Promise.all([
    CopyEvaluation.deleteMany(expiredFilter),
    Test.deleteMany(expiredFilter),
  ]);

  return {
    tests: testResult.deletedCount || 0,
    evaluations: evalResult.deletedCount || 0,
  };
}
