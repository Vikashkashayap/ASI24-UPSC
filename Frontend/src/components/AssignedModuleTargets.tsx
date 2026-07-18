import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Target } from "lucide-react";
import {
  syllabusTargetsAPI,
  type StudentSyllabusTarget,
} from "../services/api";

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

export function AssignedModuleTargets() {
  const [targets, setTargets] = useState<StudentSyllabusTarget[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await syllabusTargetsAPI.listMine({ includeCompleted: true });
      if (res.data.success) {
        setTargets(res.data.data.targets || []);
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

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      setTogglingId(id);
      await syllabusTargetsAPI.toggleComplete(id, !completed);
      setTargets((prev) =>
        prev.map((t) => (t._id === id ? { ...t, completed: !completed } : t))
      );
      setActiveCount((c) => (completed ? c + 1 : Math.max(0, c - 1)));
      setCompletedCount((c) => (completed ? Math.max(0, c - 1) : c + 1));
    } catch {
      setError("Could not update module status");
    } finally {
      setTogglingId(null);
    }
  };

  const visible = targets.filter((t) => (showCompleted ? true : !t.completed));

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

  return (
    <div className="sd-card sd-assigned-targets">
      <div className="sd-card-hd">
        <div>
          <h3>Your Module Targets</h3>
          <p className="sd-syll-deck">
            Assigned by your mentor · {activeCount} active
            {completedCount > 0 ? ` · ${completedCount} done` : ""}
          </p>
        </div>
        <Target className="sd-assigned-hd-icon" aria-hidden />
      </div>

      {error && <p className="sd-assigned-error">{error}</p>}

      {completedCount > 0 && (
        <div className="sd-assigned-filter">
          <button
            type="button"
            className={!showCompleted ? "active" : ""}
            onClick={() => setShowCompleted(false)}
          >
            Active
          </button>
          <button
            type="button"
            className={showCompleted ? "active" : ""}
            onClick={() => setShowCompleted(true)}
          >
            All ({targets.length})
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="sd-assigned-empty">All assigned modules are complete. Great work!</p>
      ) : (
        <ul className="sd-assigned-list">
          {visible.map((t) => {
            const due = formatDue(t.dueDate);
            const overdue = !t.completed && isOverdue(t.dueDate);
            return (
              <li key={t._id} className={t.completed ? "done" : ""}>
                <button
                  type="button"
                  className="sd-assigned-check"
                  disabled={togglingId === t._id}
                  onClick={() => toggleComplete(t._id, t.completed)}
                  aria-label={t.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {togglingId === t._id ? (
                    <Loader2 className="sd-assigned-spin" />
                  ) : t.completed ? (
                    <Check />
                  ) : (
                    <span className="sd-assigned-check-empty" />
                  )}
                </button>
                <div className="sd-assigned-body">
                  <div className="sd-assigned-subject">
                    {t.subjectName}
                    {t.moduleId ? ` · ${t.moduleId}` : ""}
                  </div>
                  <strong>{t.moduleName}</strong>
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
                    {!t.chapterRange && t.topicCount > 0 ? <span>{t.topicCount} chapters</span> : null}
                    {due ? (
                      <span className={overdue ? "overdue" : ""}>
                        Due {due}
                        {overdue ? " · overdue" : ""}
                      </span>
                    ) : null}
                  </div>
                  {t.note ? <p className="sd-assigned-note">{t.note}</p> : null}
                  {t.topicsPreview?.length > 0 && (
                    <ul className="sd-assigned-chapter-list">
                      {t.topicsPreview.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
