import {
  subjectRepo,
  chapterRepo,
  topicRepo,
  categoryRepo,
  sourceRepo,
  tagRepo,
} from "../repositories/index.js";
import {
  subjectSchema,
  subjectUpdateSchema,
  chapterSchema,
  chapterUpdateSchema,
  topicSchema,
  topicUpdateSchema,
  categorySchema,
  categoryUpdateSchema,
} from "../validators/knowledge.validators.js";
import { uniqueSlug } from "../utils/slugify.js";
import KbSubject from "../models/KbSubject.js";
import KbChapter from "../models/KbChapter.js";
import KbTopic from "../models/KbTopic.js";
import KbCategory from "../models/KbCategory.js";
import { ensureKnowledgeTaxonomySeeded } from "../seed/seedTaxonomy.js";

export async function listSubjects() {
  await ensureKnowledgeTaxonomySeeded();
  return subjectRepo.findActive();
}

export async function createSubject(body, userId) {
  const data = subjectSchema.parse(body);
  const slug = await uniqueSlug(KbSubject, data.name);
  return subjectRepo.create({ ...data, slug, createdBy: userId || null });
}

export async function updateSubject(id, body) {
  const data = subjectUpdateSchema.parse(body);
  if (data.name) data.slug = await uniqueSlug(KbSubject, data.name, { _id: { $ne: id } });
  const updated = await subjectRepo.update(id, data);
  if (!updated) {
    const err = new Error("Subject not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

export async function deleteSubject(id) {
  const updated = await subjectRepo.softDelete(id);
  if (!updated) {
    const err = new Error("Subject not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

export async function listChapters(query = {}) {
  const filter = {};
  if (query.subjectId) filter.subjectId = query.subjectId;
  return chapterRepo.find(filter);
}

export async function createChapter(body, userId) {
  const data = chapterSchema.parse(body);
  const slug = await uniqueSlug(KbChapter, data.name, { subjectId: data.subjectId });
  return chapterRepo.create({ ...data, slug, createdBy: userId || null });
}

export async function updateChapter(id, body) {
  const data = chapterUpdateSchema.parse(body);
  const existing = await chapterRepo.findById(id);
  if (!existing) {
    const err = new Error("Chapter not found");
    err.statusCode = 404;
    throw err;
  }
  if (data.name) {
    data.slug = await uniqueSlug(KbChapter, data.name, {
      subjectId: data.subjectId || existing.subjectId,
      _id: { $ne: id },
    });
  }
  return chapterRepo.update(id, data);
}

export async function deleteChapter(id) {
  const updated = await chapterRepo.softDelete(id);
  if (!updated) {
    const err = new Error("Chapter not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

export async function listTopics(query = {}) {
  const filter = {};
  if (query.subjectId) filter.subjectId = query.subjectId;
  if (query.chapterId) filter.chapterId = query.chapterId;
  return topicRepo.find(filter);
}

export async function createTopic(body, userId) {
  const data = topicSchema.parse(body);
  const slug = await uniqueSlug(KbTopic, data.name, { chapterId: data.chapterId });
  return topicRepo.create({ ...data, slug, createdBy: userId || null });
}

export async function updateTopic(id, body) {
  const data = topicUpdateSchema.parse(body);
  const existing = await topicRepo.findById(id);
  if (!existing) {
    const err = new Error("Topic not found");
    err.statusCode = 404;
    throw err;
  }
  if (data.name) {
    data.slug = await uniqueSlug(KbTopic, data.name, {
      chapterId: data.chapterId || existing.chapterId,
      _id: { $ne: id },
    });
  }
  return topicRepo.update(id, data);
}

export async function deleteTopic(id) {
  const updated = await topicRepo.softDelete(id);
  if (!updated) {
    const err = new Error("Topic not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

export async function listCategories() {
  await ensureKnowledgeTaxonomySeeded();
  return categoryRepo.findActive();
}

export async function createCategory(body, userId) {
  const data = categorySchema.parse(body);
  const slug = await uniqueSlug(KbCategory, data.name);
  return categoryRepo.create({ ...data, slug, isSystem: false, createdBy: userId || null });
}

export async function updateCategory(id, body) {
  const data = categoryUpdateSchema.parse(body);
  if (data.name) data.slug = await uniqueSlug(KbCategory, data.name, { _id: { $ne: id } });
  const updated = await categoryRepo.update(id, data);
  if (!updated) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

export async function deleteCategory(id) {
  const existing = await categoryRepo.findById(id);
  if (!existing) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }
  if (existing.isSystem) {
    const err = new Error("System categories cannot be deleted");
    err.statusCode = 400;
    throw err;
  }
  return categoryRepo.softDelete(id);
}

export async function listSources() {
  return sourceRepo.findActive();
}

export async function listTags() {
  return tagRepo.findActive();
}
