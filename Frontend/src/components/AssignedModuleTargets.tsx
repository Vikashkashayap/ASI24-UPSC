import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Loader2, Lock, Target } from "lucide-react";
import {
  syllabusTargetsAPI,
  type StudentSyllabusTarget,
} from "../services/api";

type FilterMode = "all" | "active" | "done";

type SubjectGroup = {
  subjectKey: string;
  subjectName: string;
  modules: StudentSyllabusTarget[];
  activeCount: number;
  doneCount: number;
};

function formatDue(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isOverdue(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

/** Match MentorsDaily foundation subject sequence (polity / P1 first). */
const SUBJECT_ORDER = [
  "polity",
  "ancient",
  "medieval",
  "modern",
  "postind",
  "worldhist",
  "artculture",
  "indgeo",
  "worldgeo",
  "economy",
  "environment",
  "ir",
  "intsec",
  "society",
  "governance",
  "socialjustice",
  "ethics",
  "scitech",
];

function subjectRank(key: string): number {
  const i = SUBJECT_ORDER.indexOf(key);
  return i === -1 ? 999 : i;
}

/** P1 → P2 → … within a subject; subjects follow foundation order. */
function compareBySyllabus(a: StudentSyllabusTarget, b: StudentSyllabusTarget): number {
  const ai = subjectRank(a.subjectKey);
  const bi = subjectRank(b.subjectKey);
  if (ai !== bi) return ai - bi;
  return String(a.moduleId || "").localeCompare(String(b.moduleId || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortTargets(list: StudentSyllabusTarget[]): StudentSyllabusTarget[] {
  return [...list].sort(compareBySyllabus);
}

/** Group filtered modules under subject headers (syllabus order). */
function groupBySubject(list: StudentSyllabusTarget[]): SubjectGroup[] {
  const map = new Map<string, SubjectGroup>();
  for (const t of list) {
    const key = t.subjectKey || "other";
    let g = map.get(key);
    if (!g) {
      g = {
        subjectKey: key,
        subjectName: t.subjectName || key,
        modules: [],
        activeCount: 0,
        doneCount: 0,
      };
      map.set(key, g);
    }
    g.modules.push(t);
    if (t.completed) g.doneCount += 1;
    else g.activeCount += 1;
  }
  return [...map.values()].sort(
    (a, b) => subjectRank(a.subjectKey) - subjectRank(b.subjectKey)
  );
}

function axiosMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data
      ?.message;
    if (msg) return String(msg);
  }
  return "Could not start chapter practice";
}

/** Module N unlocked only after previous module in the same subject is fully complete. */
function isModuleLocked(
  target: StudentSyllabusTarget,
  allTargets: StudentSyllabusTarget[]
): boolean {
  if (target.completed) return false;
  const sameSubject = allTargets.filter((t) => t.subjectKey === target.subjectKey);
  const ordered = [...sameSubject].sort(compareBySyllabus);
  const idx = ordered.findIndex((t) => t._id === target._id);
  if (idx <= 0) return false;
  return !ordered[idx - 1].completed;
}

/** Chapter N unlocked only if module unlocked and previous chapters in module are done. */
function isChapterLocked(
  topics: string[],
  index: number,
  doneSet: Set<string>,
  moduleDone: boolean,
  moduleLocked: boolean
): boolean {
  if (moduleLocked) return true;
  if (moduleDone) return false;
  if (index <= 0) return false;
  for (let i = 0; i < index; i++) {
    if (!doneSet.has(topics[i])) return true;
  }
  return false;
}

export function AssignedModuleTargets() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState<StudentSyllabusTarget[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [practicingKey, setPracticingKey] = useState<string | null>(null);
  /** targetId::chapter — tick selects chapter; Test button appears */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Active = remaining/progress; Done = submitted complete; All = both (subject-wise). */
  const [filter, setFilter] = useState<FilterMode>("active");
  /** Subject key filter ("" = all subjects). Handy for Done list. */
  const [subjectFilter, setSubjectFilter] = useState("");
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await syllabusTargetsAPI.listMine({ includeCompleted: true });
      if (res.data.success) {
        setTargets(sortTargets(res.data.data.targets || []));
        setActiveCount(res.data.data.activeCount || 0);
        setCompletedCount(res.data.data.completedCount || 0);
      }
    } catch {
      setError("Could not load your assigned modules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recount = (next: StudentSyllabusTarget[]) => {
    const done = next.filter((t) => t.completed).length;
    setCompletedCount(done);
    setActiveCount(next.length - done);
  };

  /** Tick = select chapter (show Test). Already-done → uncomplete. Locked → no-op. */
  const onChapterTick = (
    target: StudentSyllabusTarget,
    chapter: string,
    isDone: boolean,
    locked: boolean
  ) => {
    if (locked || practicingKey) return;
    const key = `${target._id}::${chapter}`;
    if (isDone) {
      void uncompleteChapter(target, chapter);
      return;
    }
    setSelectedKey((prev) => (prev === key ? null : key));
    setError(null);
  };

  const startChapterPractice = async (
    target: StudentSyllabusTarget,
    chapter: string,
    opts?: { retake?: boolean }
  ) => {
    const key = `${target._id}::${chapter}`;
    const retake = Boolean(opts?.retake);
    const payload = {
      targetId: target._id,
      subjectKey: target.subjectKey,
      subjectName: target.subjectName,
      moduleId: target.moduleId,
      moduleName: target.moduleName,
      chapter,
      retake,
    };
    console.log("[ModuleTargets] practice payload →", payload);

    try {
      setPracticingKey(key);
      setError(null);
      const res = await syllabusTargetsAPI.startChapterPractice(target._id, chapter, { retake });
      const data = res.data?.data;
      if (!data?.testId) {
        setError("Practice test was not created");
        return;
      }

      setSelectedKey(null);
      navigate(`/test/${data.testId}`, {
        state: {
          fromModuleTarget: true,
          targetId: target._id,
          chapter,
          nextChapter: data.nextChapter || null,
          fromCache: Boolean(data.fromCache),
          retake: Boolean(data.retake ?? retake),
        },
      });
    } catch (err) {
      setError(axiosMessage(err));
    } finally {
      setPracticingKey(null);
    }
  };

  /** All chapters done → 50Q: reuse chapter bank, generate only the shortfall. */
  const startModuleFinal = async (target: StudentSyllabusTarget) => {
    const key = `${target._id}::module-final`;
    console.log("[ModuleTargets] module final payload →", {
      targetId: target._id,
      moduleId: target.moduleId,
      moduleName: target.moduleName,
      chapters: target.topicsPreview || [],
      questionCount: 50,
    });
    try {
      setPracticingKey(key);
      setError(null);
      const res = await syllabusTargetsAPI.startModuleFinal(target._id);
      const data = res.data?.data;
      if (!data?.testId) {
        setError("Module Final was not created");
        return;
      }
      navigate(`/test/${data.testId}`, {
        state: {
          fromModuleFinal: true,
          targetId: target._id,
          moduleId: target.moduleId,
        },
      });
    } catch (err) {
      setError(axiosMessage(err));
    } finally {
      setPracticingKey(null);
    }
  };

  const uncompleteChapter = async (target: StudentSyllabusTarget, chapter: string) => {
    const key = `${target._id}::${chapter}`;
    try {
      setPracticingKey(key);
      const res = await syllabusTargetsAPI.toggleChapterComplete(target._id, chapter, false);
      const data = res.data?.data;
      setSelectedKey(null);
      setTargets((prev) => {
        const next = sortTargets(
          prev.map((t) => {
            if (t._id !== target._id) return t;
            return {
              ...t,
              completedChapters: data?.completedChapters ?? t.completedChapters ?? [],
              completed: data?.completed ?? t.completed,
            };
          })
        );
        recount(next);
        return next;
      });
    } catch {
      setError("Could not update chapter status");
    } finally {
      setPracticingKey(null);
    }
  };

  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of targets) {
      if (filter === "active" && t.completed) continue;
      if (filter === "done" && !t.completed) continue;
      const key = t.subjectKey || "other";
      if (!map.has(key)) map.set(key, t.subjectName || key);
    }
    return [...map.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => subjectRank(a.key) - subjectRank(b.key));
  }, [targets, filter]);

  // Drop stale subject filter when switching tabs / data changes
  useEffect(() => {
    if (subjectFilter && !subjectOptions.some((s) => s.key === subjectFilter)) {
      setSubjectFilter("");
    }
  }, [subjectFilter, subjectOptions]);

  const visible = useMemo(() => {
    return targets.filter((t) => {
      if (filter === "active" && t.completed) return false;
      if (filter === "done" && !t.completed) return false;
      if (subjectFilter && (t.subjectKey || "other") !== subjectFilter) return false;
      return true;
    });
  }, [targets, filter, subjectFilter]);

  const subjectGroups = useMemo(() => groupBySubject(visible), [visible]);

  const toggleSubject = (subjectKey: string) => {
    setCollapsedSubjects((prev) => ({
      ...prev,
      [subjectKey]: !prev[subjectKey],
    }));
  };

  if (loading) {
    return (
      <div className="sd-card sd-assigned-targets">
        <div className="sd-card-hd">
          <div>
            <h3>Your Module Targets</h3>
            <p className="sd-syll-deck">Loading assigned modules…</p>
          </div>
        </div>
        <div className="sd-assigned-loading">
          <Loader2 className="sd-assigned-spin" />
        </div>
      </div>
    );
  }

  if (!loading && targets.length === 0) {
    return null;
  }

  const renderModule = (t: StudentSyllabusTarget) => {
    const due = formatDue(t.dueDate);
    const overdue = !t.completed && isOverdue(t.dueDate);
    const doneChapters = new Set(t.completedChapters || []);
    const topics = t.topicsPreview || [];
    const moduleLocked = isModuleLocked(t, targets);
    const chaptersDoneCount = topics.filter((line) => doneChapters.has(line)).length;
    const chaptersComplete =
      Boolean(t.chaptersComplete) ||
      (topics.length > 0 && topics.every((line) => doneChapters.has(line)));
    const needsModuleFinal = chaptersComplete && !t.completed && !moduleLocked;
    const finalBusy = practicingKey === `${t._id}::module-final`;
    const chapterProgress =
      topics.length > 0
        ? Math.round(
            ((t.completed ? topics.length : chaptersDoneCount) / topics.length) * 100
          )
        : t.completed
          ? 100
          : 0;
    const prevModule = (() => {
      if (!moduleLocked) return null;
      const sameSubject = targets.filter((x) => x.subjectKey === t.subjectKey);
      const ordered = [...sameSubject].sort(compareBySyllabus);
      const idx = ordered.findIndex((x) => x._id === t._id);
      return idx > 0 ? ordered[idx - 1] : null;
    })();
    const statusLabel = t.completed
      ? "Completed"
      : moduleLocked
        ? "Locked"
        : needsModuleFinal
          ? "Final pending"
          : "In progress";

    return (
      <li
        key={t._id}
        className={[
          t.completed ? "done" : "",
          moduleLocked ? "module-locked" : "",
          needsModuleFinal ? "final-ready" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="sd-assigned-body">
          <div className="sd-assigned-title-row">
            <div className="sd-assigned-subject">
              {t.moduleId || "Module"}
              {t.medium === "hi" ? " · हिंदी" : ""}
            </div>
            <span
              className={[
                "sd-assigned-status",
                t.completed ? "is-done" : "",
                moduleLocked ? "is-locked" : "",
                needsModuleFinal ? "is-final" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {statusLabel}
            </span>
          </div>
          <strong>{t.moduleName}</strong>
          {moduleLocked && prevModule ? (
            <p className="sd-assigned-module-lock-hint">
              Complete <b>{prevModule.moduleId}</b> {prevModule.moduleName} (incl. Module Final) to
              unlock
            </p>
          ) : null}
          {needsModuleFinal ? (
            <div className="sd-assigned-module-final">
              <p className="sd-assigned-module-final-copy">
                All chapters done — take the <b>Module Final (50Q)</b> to unlock the next module.
              </p>
              <button
                type="button"
                className="sd-assigned-test-btn final"
                disabled={Boolean(practicingKey)}
                onClick={() => void startModuleFinal(t)}
              >
                {finalBusy ? (
                  <>
                    <Loader2 className="sd-assigned-spin" /> Preparing Final…
                  </>
                ) : (
                  "Module Final · 50Q"
                )}
              </button>
            </div>
          ) : null}
          <div className="sd-assigned-meta">
            {t.chapterRange ? <span>{t.chapterRange}</span> : null}
            {t.durationLabel ? (
              <span className="sd-assigned-duration">{t.durationLabel}</span>
            ) : (
              <>
                {t.estimatedDays != null ? <span>{t.estimatedDays} days</span> : null}
                {t.estimatedHours != null ? <span>~{t.estimatedHours}h</span> : null}
              </>
            )}
            {topics.length > 0 ? (
              <span className="sd-assigned-progress-label">
                {t.completed ? topics.length : chaptersDoneCount}/{topics.length} chapters
              </span>
            ) : t.topicCount > 0 && !t.chapterRange ? (
              <span>{t.topicCount} chapters</span>
            ) : null}
            {due ? (
              <span className={overdue ? "overdue" : ""}>
                Due {due}
                {overdue ? " · overdue" : ""}
              </span>
            ) : null}
          </div>
          {topics.length > 0 && (
            <div
              className="sd-assigned-progress"
              role="progressbar"
              aria-valuenow={chapterProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${chapterProgress}% complete`}
            >
              <span style={{ width: `${chapterProgress}%` }} />
            </div>
          )}
          {t.note ? <p className="sd-assigned-note">{t.note}</p> : null}
          {topics.length > 0 && (
            <ul className="sd-assigned-chapter-list">
              {topics.map((line, idx) => {
                const chapterDone = doneChapters.has(line) || t.completed;
                const locked = isChapterLocked(
                  topics,
                  idx,
                  doneChapters,
                  t.completed,
                  moduleLocked
                );
                const key = `${t._id}::${line}`;
                const selected = selectedKey === key;
                const chapterBusy = practicingKey === key;
                return (
                  <li
                    key={line}
                    className={[
                      chapterDone ? "done" : "",
                      locked ? "locked" : "",
                      selected ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="sd-assigned-chapter-row">
                      <button
                        type="button"
                        className="sd-assigned-chapter-check"
                        disabled={locked || Boolean(practicingKey)}
                        onClick={() => onChapterTick(t, line, chapterDone, locked)}
                        aria-label={
                          locked
                            ? `Locked: ${line}`
                            : chapterDone
                              ? `Unmark: ${line}`
                              : `Select: ${line}`
                        }
                        title={
                          moduleLocked
                            ? "Complete previous module to unlock"
                            : locked
                              ? "Submit previous chapter test to unlock"
                              : chapterDone
                                ? "Click to unmark"
                                : "Tick to show Test"
                        }
                      >
                        {chapterBusy ? (
                          <Loader2 className="sd-assigned-spin" />
                        ) : locked ? (
                          <Lock className="sd-assigned-lock-icon" />
                        ) : chapterDone ? (
                          <Check />
                        ) : selected ? (
                          <span className="sd-assigned-check-selected" />
                        ) : (
                          <span className="sd-assigned-check-empty" />
                        )}
                      </button>
                      <div className="sd-assigned-chapter-main">
                        <button
                          type="button"
                          className="sd-assigned-chapter-label"
                          disabled={locked || Boolean(practicingKey)}
                          onClick={() => onChapterTick(t, line, chapterDone, locked)}
                        >
                          {line}
                          {locked ? (
                            <span className="sd-assigned-locked-hint"> · Locked</span>
                          ) : null}
                        </button>
                        {selected && !chapterDone && !locked && (
                          <button
                            type="button"
                            className="sd-assigned-test-btn"
                            disabled={Boolean(practicingKey)}
                            onClick={() => void startChapterPractice(t, line)}
                          >
                            {chapterBusy ? (
                              <>
                                <Loader2 className="sd-assigned-spin" /> Generating…
                              </>
                            ) : (
                              "Test"
                            )}
                          </button>
                        )}
                        {chapterDone && !locked && (
                          <button
                            type="button"
                            className="sd-assigned-test-btn secondary"
                            disabled={Boolean(practicingKey)}
                            onClick={() => void startChapterPractice(t, line, { retake: true })}
                          >
                            {chapterBusy ? (
                              <>
                                <Loader2 className="sd-assigned-spin" /> Loading…
                              </>
                            ) : (
                              "Retake"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="sd-card sd-assigned-targets">
      <div className="sd-card-hd">
        <div>
          <h3>Your Module Targets</h3>
          <p className="sd-syll-deck">
            Subject-wise · Chapters → Module Final → next unlock · {activeCount} active
            {completedCount > 0 ? ` · ${completedCount} done` : ""}
          </p>
        </div>
        <Target className="sd-assigned-hd-icon" aria-hidden />
      </div>

      {error && <p className="sd-assigned-error">{error}</p>}

      {practicingKey && (
        <p className="sd-assigned-gen-hint">
          <Loader2 className="sd-assigned-spin" /> Generating questions from Knowledge Base…
        </p>
      )}

      <div className="sd-assigned-filter-row">
        <div className="sd-assigned-filter" role="tablist" aria-label="Filter modules">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "active"}
            className={filter === "active" ? "active" : ""}
            onClick={() => setFilter("active")}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "done"}
            className={filter === "done" ? "active" : ""}
            onClick={() => setFilter("done")}
          >
            Done ({completedCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({targets.length})
          </button>
        </div>

        <label className="sd-assigned-subject-filter">
          <span className="sd-assigned-subject-filter-label">Subject</span>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Filter by subject"
          >
            <option value="">
              {filter === "done"
                ? `All subjects (${completedCount})`
                : filter === "active"
                  ? `All subjects (${activeCount})`
                  : `All subjects (${targets.length})`}
            </option>
            {subjectOptions.map((s) => {
              const count = targets.filter((t) => {
                if ((t.subjectKey || "other") !== s.key) return false;
                if (filter === "active") return !t.completed;
                if (filter === "done") return t.completed;
                return true;
              }).length;
              return (
                <option key={s.key} value={s.key}>
                  {s.name} ({count})
                </option>
              );
            })}
          </select>
        </label>
      </div>

      {subjectGroups.length === 0 ? (
        <p className="sd-assigned-empty">
          {filter === "active"
            ? subjectFilter
              ? "No active modules in this subject."
              : "All modules complete — open Done to review them."
            : filter === "done"
              ? subjectFilter
                ? `No completed modules in this subject yet.`
                : "No completed modules yet. Finish a Module Final to see them here."
              : subjectFilter
                ? "No modules in this subject."
                : "No modules to show."}
        </p>
      ) : (
        <div className="sd-assigned-subjects">
          {subjectGroups.map((group) => {
            const collapsed = Boolean(collapsedSubjects[group.subjectKey]);
            const countLabel =
              filter === "active"
                ? `${group.activeCount} remaining`
                : filter === "done"
                  ? `${group.doneCount} done`
                  : `${group.activeCount} active · ${group.doneCount} done`;
            return (
              <section key={group.subjectKey} className="sd-assigned-subject-group">
                <button
                  type="button"
                  className="sd-assigned-subject-hd"
                  onClick={() => toggleSubject(group.subjectKey)}
                  aria-expanded={!collapsed}
                >
                  <span className="sd-assigned-subject-hd-main">
                    <span className="sd-assigned-subject-name">{group.subjectName}</span>
                    <span className="sd-assigned-subject-count">{countLabel}</span>
                  </span>
                  <ChevronDown
                    className={
                      collapsed
                        ? "sd-assigned-subject-chevron is-collapsed"
                        : "sd-assigned-subject-chevron"
                    }
                    aria-hidden
                  />
                </button>
                {!collapsed && (
                  <ul className="sd-assigned-list">{group.modules.map(renderModule)}</ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
