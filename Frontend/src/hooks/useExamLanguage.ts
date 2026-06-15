import { useCallback, useEffect, useState } from "react";

export type ExamLang = "hi" | "en";

const STORAGE_KEY = "asi24_exam_lang";

export function readExamLang(): ExamLang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "hi") return v;
  } catch {
    /* ignore */
  }
  return "hi";
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
    setLang(lang === "hi" ? "en" : "hi");
  }, [lang, setLang]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "hi" || e.newValue === "en")) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { lang, setLang, toggleLang };
}
