import { useEffect, useMemo, useRef, useState } from "react";
import type { ExamLang } from "../utils/bilingualQuestion";
import {
  ClientMcq,
  ensureClientHindiMcq,
  needsClientHindi,
} from "../utils/clientHindiTranslate";

/**
 * Live exam / result Hindi fill — never blocks forever.
 * Prefetch only current + next question.
 * Result page: pass includeExplanations so व्याख्या also gets free Google HI.
 */
export function useClientSideHindiQuestions<T extends ClientMcq>(
  questions: T[],
  lang: ExamLang,
  currentIndex: number,
  opts: { includeExplanations?: boolean } = {}
): { questions: T[]; translating: boolean } {
  const includeExplanations = opts.includeExplanations === true;
  const [overlay, setOverlay] = useState<Record<number, T>>({});
  const [translating, setTranslating] = useState(false);
  const doneRef = useRef<Set<number>>(new Set());
  const inflightRef = useRef<Set<number>>(new Set());
  const questionsRef = useRef(questions);
  const overlayRef = useRef(overlay);
  questionsRef.current = questions;
  overlayRef.current = overlay;

  const fingerprint = useMemo(
    () =>
      questions
        .map((q) => String(q._id || q.question_en || q.question || "").slice(0, 40))
        .join("|") + `|expl:${includeExplanations ? 1 : 0}`,
    [questions, includeExplanations]
  );

  useEffect(() => {
    setOverlay({});
    doneRef.current = new Set();
    inflightRef.current = new Set();
    setTranslating(false);
  }, [fingerprint]);

  const wantHi = lang === "hi" || lang === "both";

  useEffect(() => {
    if (!wantHi || !questions.length) {
      setTranslating(false);
      return;
    }

    const idxs = [currentIndex, currentIndex + 1].filter(
      (i) => i >= 0 && i < questions.length
    );

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

        inflightRef.current.add(i);
        setTranslating(true);
        try {
          const next = await ensureClientHindiMcq(base, {
            includeExplanations,
            deadlineMs: includeExplanations ? 22000 : 16000,
          });
          if (cancelled) return;
          doneRef.current.add(i);
          setOverlay((prev) => ({ ...prev, [i]: next }));
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
  }, [wantHi, currentIndex, fingerprint, questions.length, includeExplanations]);

  const merged = useMemo(
    () => questions.map((q, i) => overlay[i] || q),
    [questions, overlay]
  );

  return { questions: merged, translating };
}
