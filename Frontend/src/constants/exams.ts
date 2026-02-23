export const EXAM_SLUGS = [
  "upsc",
  "ssc",
  "banking",
  "railway",
  "state-psc",
  "defence",
  "teaching",
  "police",
] as const;

export type ExamSlug = (typeof EXAM_SLUGS)[number];

export const EXAM_LABELS: Record<ExamSlug, string> = {
  upsc: "UPSC",
  ssc: "SSC",
  banking: "Banking",
  railway: "Railway",
  "state-psc": "State PSC",
  defence: "Defence",
  teaching: "Teaching",
  police: "Police",
};

export const EXAM_DESCRIPTIONS: Record<ExamSlug, string> = {
  upsc: "Civil Services (IAS, IPS, IFS & more) with AI-powered mocks and answer evaluation.",
  ssc: "SSC CGL, CHSL, MTS & CPO with full-length mock tests and sectional practice.",
  banking: "IBPS, SBI, RBI with sectional and full-length mocks and current affairs.",
  railway: "RRB NTPC, Group D, ALP with subject-wise tests and previous year papers.",
  "state-psc": "State Civil Services and PSC exams with state-specific mocks.",
  defence: "NDA, CDS, AFCAT with defence-specific preparation and mocks.",
  teaching: "CTET, UGC NET, TET with pedagogy and subject tests.",
  police: "Constable, SI, and state police exams with reasoning and GK focus.",
};

export function getExamLabel(slug: string): string {
  return EXAM_LABELS[slug as ExamSlug] ?? slug;
}

export function isValidExamSlug(slug: string): slug is ExamSlug {
  return EXAM_SLUGS.includes(slug as ExamSlug);
}
