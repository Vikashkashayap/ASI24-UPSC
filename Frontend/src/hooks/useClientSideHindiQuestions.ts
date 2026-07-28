import { useEffect, useMemo, useRef, useState } from "react";
import type { ExamLang } from "../utils/bilingualQuestion";
import {
  ClientMcq,
  ensureClientHindiMcq,
  needsClientHindi,
} from "../utils/clientHindiTranslate";

/**
 * Live exam Hindi fill — never blocks forever.
 * Prefetch only current + next question.
 */
export function useClientSideHindiQuestions<T extends ClientMcq>(
  questions: T[],
  lang: ExamLang,
  currentIndex: number
): { questions: T[]; translating: boolean } {
  const [overlay, setOverlay] = useState<Record<number, T>>({});
  const [translating, setTranslating] = useState(false);
  const doneRef = useRef<Set<number>>(new Set());
  const inflightRef = useRef<Set<number>>(new Set());
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const fingerprint = useMemo(
    () =>
      questions
        .map((q) => String(q._id || q.question_en || q.question || "").slice(0, 40))
        .join("|"),
    [questions]
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

    // Only current + next — keeps UI snappy, avoids rate-limit hangs
    const idxs = [currentIndex, currentIndex + 1].filter(
      (i) => i >= 0 && i < questions.length
    );

    let cancelled = false;

    (async () => {
      for (const i of idxs) {
        if (cancelled) return;
        if (doneRef.current.has(i) || inflightRef.current.has(i)) continue;

        const base = questionsRef.current[i];
        if (!base || !needsClientHindi(base)) {
          doneRef.current.add(i);
          continue;
        }

        inflightRef.current.add(i);
        setTranslating(true);
        try {
          const next = await ensureClientHindiMcq(base, {
            includeExplanations: false,
            deadlineMs: 16000,
          });
          if (cancelled) return;
          doneRef.current.add(i);
          // Always overlay — even partial progress is better than stuck English
          setOverlay((prev) => ({ ...prev, [i]: next }));
        } catch (err) {
          console.warn("[client-hi] translate failed", err);
          doneRef.current.add(i); // don't retry forever
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
  }, [wantHi, currentIndex, fingerprint, questions.length]);

  const merged = useMemo(
    () => questions.map((q, i) => overlay[i] || q),
    [questions, overlay]
  );

  return { questions: merged, translating };
}
