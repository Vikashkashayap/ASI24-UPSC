import { useEffect, useMemo, useRef, useState } from "react";
import type { ExamLang } from "../utils/bilingualQuestion";
import {
  ClientMcq,
  ensureClientHindiMcq,
  needsClientHindi,
} from "../utils/clientHindiTranslate";

const MAX_ATTEMPTS_PER_Q = 2;

/**
 * Live exam / result Hindi fill — never blocks forever.
 * Prefetch only current + next question (or all when prefetchAll).
 * Result page: pass includeExplanations so व्याख्या also gets free Google HI.
 */
export function useClientSideHindiQuestions<T extends ClientMcq>(
  questions: T[],
  lang: ExamLang,
  currentIndex: number,
  opts: { includeExplanations?: boolean; prefetchAll?: boolean } = {}
): { questions: T[]; translating: boolean } {
  const includeExplanations = opts.includeExplanations === true;
  const prefetchAll = opts.prefetchAll === true;
  const [overlay, setOverlay] = useState<Record<number, T>>({});
  const [translating, setTranslating] = useState(false);
  const doneRef = useRef<Set<number>>(new Set());
  const attemptsRef = useRef<Record<number, number>>({});
  const inflightRef = useRef<Set<number>>(new Set());
  const questionsRef = useRef(questions);
  const overlayRef = useRef(overlay);
  questionsRef.current = questions;
  overlayRef.current = overlay;

  const fingerprint = useMemo(
    () =>
      questions
        .map((q) => String(q._id || q.question_en || q.question || "").slice(0, 40))
        .join("|") + `|expl:${includeExplanations ? 1 : 0}|all:${prefetchAll ? 1 : 0}`,
    [questions, includeExplanations, prefetchAll]
  );

  useEffect(() => {
    setOverlay({});
    doneRef.current = new Set();
    attemptsRef.current = {};
    inflightRef.current = new Set();
    setTranslating(false);
  }, [fingerprint]);

  const wantHi = lang === "hi" || lang === "both";

  useEffect(() => {
    if (!wantHi || !questions.length) {
      setTranslating(false);
      return;
    }

    const idxs = prefetchAll
      ? questions.map((_, i) => i)
      : [currentIndex, currentIndex + 1].filter((i) => i >= 0 && i < questions.length);

    let cancelled = false;

    (async () => {
      for (const i of idxs) {
        if (cancelled) return;
        if (doneRef.current.has(i) || inflightRef.current.has(i)) continue;

        const base = overlayRef.current[i] || questionsRef.current[i];
        if (!base || !needsClientHindi(base, { includeExplanations })) {
          doneRef.current.add(i);
          continue;
        }

        const attempts = attemptsRef.current[i] || 0;
        if (attempts >= MAX_ATTEMPTS_PER_Q) {
          doneRef.current.add(i);
          continue;
        }

        inflightRef.current.add(i);
        setTranslating(true);
        try {
          let next = base;
          while (
            !cancelled &&
            (attemptsRef.current[i] || 0) < MAX_ATTEMPTS_PER_Q &&
            needsClientHindi(next, { includeExplanations })
          ) {
            attemptsRef.current[i] = (attemptsRef.current[i] || 0) + 1;
            next = await ensureClientHindiMcq(next, {
              includeExplanations,
              deadlineMs: includeExplanations ? 22000 : 16000,
            });
            if (cancelled) return;
            setOverlay((prev) => ({ ...prev, [i]: next }));
          }
          doneRef.current.add(i);
        } catch (err) {
          console.warn("[client-hi] translate failed", err);
          doneRef.current.add(i);
        } finally {
          inflightRef.current.delete(i);
          if (!inflightRef.current.size) setTranslating(false);
        }
      }
      if (!inflightRef.current.size) setTranslating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [wantHi, currentIndex, fingerprint, questions.length, includeExplanations, prefetchAll]);

  const merged = useMemo(
    () => questions.map((q, i) => overlay[i] || q),
    [questions, overlay]
  );

  return { questions: merged, translating };
}
