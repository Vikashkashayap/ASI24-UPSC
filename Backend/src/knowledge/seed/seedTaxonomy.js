import KbSubject from "../models/KbSubject.js";
import KbCategory, { DEFAULT_CATEGORIES } from "../models/KbCategory.js";
import { slugify } from "../utils/slugify.js";

export const DEFAULT_SUBJECTS = [
  { name: "History", gsPaper: "GS1", sortOrder: 1 },
  { name: "Geography", gsPaper: "GS1", sortOrder: 2 },
  { name: "Economy", gsPaper: "GS3", sortOrder: 3 },
  { name: "Polity", gsPaper: "GS2", sortOrder: 4 },
  { name: "Environment", gsPaper: "GS3", sortOrder: 5 },
  { name: "Science", gsPaper: "GS3", sortOrder: 6 },
  { name: "International Relations", gsPaper: "GS2", sortOrder: 7 },
  { name: "Ethics", gsPaper: "GS4", sortOrder: 8 },
  { name: "Essay", gsPaper: "Essay", sortOrder: 9 },
  { name: "Current Affairs", gsPaper: "GS1-4", sortOrder: 10 },
];

let seeded = false;

export async function ensureKnowledgeTaxonomySeeded() {
  if (seeded) return { subjects: 0, categories: 0 };
  seeded = true;

  let subjectsCreated = 0;
  let categoriesCreated = 0;

  for (const s of DEFAULT_SUBJECTS) {
    const slug = slugify(s.name);
    const exists = await KbSubject.findOne({ slug });
    if (!exists) {
      await KbSubject.create({ ...s, slug, isActive: true });
      subjectsCreated += 1;
    }
  }

  for (const name of DEFAULT_CATEGORIES) {
    const slug = slugify(name);
    const exists = await KbCategory.findOne({ slug });
    if (!exists) {
      await KbCategory.create({
        name,
        slug,
        isSystem: true,
        isActive: true,
      });
      categoriesCreated += 1;
    }
  }

  return { subjects: subjectsCreated, categories: categoriesCreated };
}
