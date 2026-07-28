import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, BookOpen, Layers, Tag } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { knowledgeAPI } from "../api";
import type { KbSubject, KbChapter, KbTopic, KbCategory } from "../types";

type Props = {
  isDark: boolean;
  subjects: KbSubject[];
  categories: KbCategory[];
  onRefresh: () => void;
};

export const KnowledgeTaxonomyPanel: React.FC<Props> = ({
  isDark,
  subjects,
  categories,
  onRefresh,
}) => {
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [chapters, setChapters] = useState<KbChapter[]>([]);
  const [topics, setTopics] = useState<KbTopic[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newChapter, setNewChapter] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  const loadChapters = async (sid: string) => {
    setSubjectId(sid);
    setChapterId("");
    setTopics([]);
    if (!sid) {
      setChapters([]);
      return;
    }
    const res = await knowledgeAPI.chapters.list(sid);
    setChapters(res.data.data || []);
  };

  const loadTopics = async (cid: string) => {
    setChapterId(cid);
    if (!cid) {
      setTopics([]);
      return;
    }
    const res = await knowledgeAPI.topics.list({ chapterId: cid, subjectId });
    setTopics(res.data.data || []);
  };

  const addSubject = async () => {
    if (!newSubject.trim()) return;
    try {
      await knowledgeAPI.subjects.create({ name: newSubject.trim() });
      setNewSubject("");
      toast.success("Subject created");
      onRefresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed";
      toast.error(msg);
    }
  };

  const addChapter = async () => {
    if (!subjectId || !newChapter.trim()) return;
    try {
      await knowledgeAPI.chapters.create({ name: newChapter.trim(), subjectId });
      setNewChapter("");
      toast.success("Chapter created");
      loadChapters(subjectId);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed";
      toast.error(msg);
    }
  };

  const addTopic = async () => {
    if (!subjectId || !chapterId || !newTopic.trim()) return;
    try {
      await knowledgeAPI.topics.create({
        name: newTopic.trim(),
        subjectId,
        chapterId,
      });
      setNewTopic("");
      toast.success("Topic created");
      loadTopics(chapterId);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed";
      toast.error(msg);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await knowledgeAPI.categories.create({ name: newCategory.trim() });
      setNewCategory("");
      toast.success("Category created");
      onRefresh();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed";
      toast.error(msg);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 space-y-4 ${
        isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white"
      }`}
    >
      <div>
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          <Layers className="w-4 h-4 text-sky-500" />
          Taxonomy
        </h3>
        <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
          Subjects → Chapters → Topics. Categories classify uploads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className={`text-xs font-medium flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            <BookOpen className="w-3.5 h-3.5" /> Subjects
          </div>
          <div className="flex gap-2">
            <input
              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
              placeholder="New subject"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <Button onClick={addSubject}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <select
            className={`w-full rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
            value={subjectId}
            onChange={(e) => loadChapters(e.target.value)}
          >
            <option value="">Select to manage chapters</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Chapters
          </div>
          <div className="flex gap-2">
            <input
              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
              placeholder="New chapter"
              value={newChapter}
              disabled={!subjectId}
              onChange={(e) => setNewChapter(e.target.value)}
            />
            <Button onClick={addChapter} disabled={!subjectId}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <select
            className={`w-full rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
            value={chapterId}
            disabled={!subjectId}
            onChange={(e) => loadTopics(e.target.value)}
          >
            <option value="">Select chapter</option>
            {chapters.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {chapters.length > 0 && (
            <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {chapters.length} chapter(s)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Topics
          </div>
          <div className="flex gap-2">
            <input
              className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
              placeholder="New topic"
              value={newTopic}
              disabled={!chapterId}
              onChange={(e) => setNewTopic(e.target.value)}
            />
            <Button onClick={addTopic} disabled={!chapterId}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <ul className={`text-xs max-h-24 overflow-y-auto space-y-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {topics.map((t) => (
              <li key={t._id}>• {t.name}</li>
            ))}
            {!topics.length && chapterId && <li className="opacity-60">No topics yet</li>}
          </ul>
        </div>
      </div>

      <div className="pt-2 border-t border-inherit space-y-2">
        <div className={`text-xs font-medium flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          <Tag className="w-3.5 h-3.5" /> Categories
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {categories.map((c) => (
            <span
              key={c._id}
              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                isDark ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"
              }`}
              style={{ borderColor: c.color || undefined }}
            >
              {c.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm">
          <input
            className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
            placeholder="Custom category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <Button onClick={addCategory}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
