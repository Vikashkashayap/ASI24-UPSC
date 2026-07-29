import { useCallback, useEffect, useState } from "react";
import type { ExamLang } from "../utils/bilingualQuestion";

export type { ExamLang };

const STORAGE_KEY = "asi24_exam_lang";
export function readExamLang(): ExamLang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "hi" || v === "both") return v;
  } catch {
    /* ignore */
  }
  // English-only generation — default to English so every Q always shows
  return "en";
}

export function useExamLanguage() {
  const [lang, setLangState] = useState<ExamLang>(() => readExamLang());

  const setLang = useCallback((next: ExamLang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "hi" ? "en" : lang === "en" ? "both" : "hi");
  }, [lang, setLang]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "hi" || e.newValue === "en" || e.newValue === "both")) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { lang, setLang, toggleLang };
}
