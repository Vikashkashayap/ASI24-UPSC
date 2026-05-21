import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import syllabusData from "../data/upsc_syllabus.json";
import polityData from "../data/upsc_polity_syllabus.json";
import ancientHistoryData from "../data/upsc_history_ancient.json";
import medievalHistoryData from "../data/upsc_history_medieval.json";
import modernHistoryData from "../data/upsc_history_modern.json";
import worldHistoryData from "../data/upsc_world_history.json";
import geographyPhysicalData from "../data/upsc_geography_physical.json";
import geographyIndiaData from "../data/upsc_geography_india.json";
import geographyWorldData from "../data/upsc_geography_world.json";
import economyData from "../data/upsc_economy.json";
import agricultureData from "../data/upsc_agriculture.json";
import environmentData from "../data/upsc_environment.json";
import scienceTechData from "../data/upsc_science_tech.json";
import societyData from "../data/upsc_society.json";
import governanceData from "../data/upsc_governance_social_justice.json";
import ethicsData from "../data/upsc_ethics_gs4.json";
import internationalRelationsData from "../data/upsc_international_relations.json";

type Subtopic = { id: string; name: string; hours?: number };
type Topic = {
  id: string;
  name: string;
  hours?: number;
  estimated_hours?: number;
  subtopics?: Subtopic[];
};
type Subject = { id: string; name: string; topics?: Topic[] };
type PaperWithSubjects = { name: string; subjects?: Subject[]; topics?: Topic[] };

const prelims = syllabusData.prelims as Record<string, PaperWithSubjects | undefined>;
const mains = syllabusData.mains as Record<string, unknown>;
const optionals = syllabusData.optionals as Record<string, unknown>;

type PolityTopic = {
  topic_id: string | number;
  topic_name: string;
  laxmikanth_chapter?: string;
  rs_sharma_reference?: string;
  primary_book_reference?: { chapters?: string; chapter_name?: string; book?: string };
  primary_book?: string | { chapter_name?: string; title?: string; book_title?: string; name?: string; chapter?: string | number };
  important_conventions?: string[];
  government_initiatives?: string[];
  ncert_reference?:
    | Array<
        string | { chapter_name?: string; chapters?: string; chapter?: string | number; book_name?: string; book?: string; class?: number }
      >
    | { chapter_name?: string; chapters?: string; chapter?: string | number; book_name?: string; book?: string; class?: number };
  key_concepts?: string[];
  important_cases?: string[];
  important_facts?: Record<string, unknown>;
  sources_borrowed?: Record<string, string>;
  pyq_frequency?: string | number;
  prelims_importance?: string | number;
  mains_importance?: string | number;
  daily_target_hours?: number;
  map_work?: string | string[] | { regions?: string[]; routes?: string[]; significance?: string };
};
type PolityModule = {
  module_id: string | number;
  module_name: string;
  sequence?: number;
  module_number?: number;
  estimated_days_standard?: number;
  estimated_days?: number;
  estimated_hours?: number;
  importance?: string;
  period?: string;
  module_overview?: string;
  upsc_prelims_weightage?: string;
  topics?: PolityTopic[];
};
const polityModules = (((polityData as unknown) as { modules?: PolityModule[] }).modules ?? []).sort(
  (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
);
const ancientHistoryModules = ((((ancientHistoryData as unknown) as { modules?: PolityModule[] }).modules ?? [])).sort(
  (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
);
const medievalHistoryModules = ((((medievalHistoryData as unknown) as { modules?: PolityModule[] }).modules ?? [])).sort(
  (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
);
const modernHistoryModules = ((((modernHistoryData as unknown) as { modules?: PolityModule[] }).modules ?? [])).sort(
  (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
);
const worldHistoryModules = ((((worldHistoryData as unknown) as { modules?: PolityModule[] }).modules ?? [])).sort(
  (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
);
const geographyPhysicalModules = ((((geographyPhysicalData as unknown) as { modules?: PolityModule[] }).modules ?? [])).sort(
  (a, b) => (a.sequence ?? a.module_number ?? 0) - (b.sequence ?? b.module_number ?? 0),
);
const geographyIndiaModules = ((((geographyIndiaData as unknown) as { modules?: PolityModule[] }).modules ?? [])).sort(
  (a, b) => String(a.module_id).localeCompare(String(b.module_id), undefined, { numeric: true, sensitivity: "base" }),
);

function normalizeWorldGeoTopic(raw: Record<string, unknown>): PolityTopic {
  const keyConcepts: string[] = [];
  const importantFacts: Record<string, unknown> = {};

  const arrayFields = ["major_ranges", "major_straits", "major_disputes"];
  for (const field of arrayFields) {
    const value = raw[field];
    if (Array.isArray(value)) keyConcepts.push(...value.map(String));
  }

  const objectFields = [
    "key_facts",
    "key_data",
    "major_rivers",
    "major_lakes",
    "major_deserts",
    "major_boundaries",
    "climate_zones",
    "major_regions",
    "systems",
    "top_producers",
    "regions",
    "major_grounds",
    "stages",
    "routes",
    "major_ports",
    "organizations",
    "hot_spots",
    "disputes",
    "arctic_data",
  ];
  for (const field of objectFields) {
    const value = raw[field];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(importantFacts, value as Record<string, unknown>);
    }
  }

  if (raw.hdi_notes) importantFacts.hdi_notes = raw.hdi_notes;

  return {
    topic_id: String(raw.topic_id ?? ""),
    topic_name: String(raw.topic_name ?? ""),
    ncert_reference: raw.ncert_reference as PolityTopic["ncert_reference"],
    key_concepts: keyConcepts.length > 0 ? keyConcepts : undefined,
    important_facts: Object.keys(importantFacts).length > 0 ? importantFacts : undefined,
    pyq_frequency: raw.pyq_frequency as string | number | undefined,
    prelims_importance: raw.prelims_importance as string | number | undefined,
    mains_importance: raw.mains_importance as string | number | undefined,
  };
}

function buildGeographyWorldModules(raw: Record<string, unknown>): PolityModule[] {
  const modules = (raw.modules as PolityModule[] | undefined) ?? [];
  return modules
    .map((mod) => {
      const id = String(mod.module_id);
      const topicsKey = `${id}_Topics`;
      const summaryKey = `${id}_Topics_Summary`;
      const rawTopics = (raw[topicsKey] ?? raw[summaryKey] ?? []) as Record<string, unknown>[];
      return {
        ...mod,
        module_overview: (mod as PolityModule & { description?: string }).description ?? mod.module_overview,
        topics: rawTopics.map(normalizeWorldGeoTopic),
      };
    })
    .sort((a, b) =>
      String(a.module_id).localeCompare(String(b.module_id), undefined, { numeric: true, sensitivity: "base" }),
    );
}

const geographyWorldModules = buildGeographyWorldModules(geographyWorldData as unknown as Record<string, unknown>);

type EconomyModuleRaw = PolityModule & { module_duration_days?: number };
const economyModules = (
  (((economyData as unknown) as { modules?: EconomyModuleRaw[] }).modules ?? []).map((m) => ({
    ...m,
    estimated_days: m.estimated_days ?? m.module_duration_days,
  })) as PolityModule[]
).sort((a, b) =>
  String(a.module_id).localeCompare(String(b.module_id), undefined, { numeric: true, sensitivity: "base" }),
);

function normalizeAgricultureTopic(raw: Record<string, unknown>): PolityTopic {
  const extraConcepts: string[] = [];
  const schemes = raw.government_schemes;
  if (Array.isArray(schemes)) {
    for (const s of schemes) {
      if (s && typeof s === "object" && "scheme_name" in (s as object)) {
        const o = s as Record<string, unknown>;
        extraConcepts.push(
          [o.scheme_name, o.objective, o.key_features].filter(Boolean).join(" — "),
        );
      }
    }
  }
  if (Array.isArray(raw.issues_and_challenges)) {
    extraConcepts.push(...(raw.issues_and_challenges as string[]).map((x) => `Challenge: ${x}`));
  }
  if (Array.isArray(raw.way_forward)) {
    extraConcepts.push(...(raw.way_forward as string[]).map((x) => `Way forward: ${x}`));
  }
  if (Array.isArray(raw.mains_answer_angles)) {
    extraConcepts.push(...(raw.mains_answer_angles as string[]).map((x) => `Mains angle: ${x}`));
  }
  const existing = (raw.key_concepts as string[] | undefined) ?? [];
  return {
    topic_id: String(raw.topic_id ?? ""),
    topic_name: String(raw.topic_name ?? ""),
    primary_book: raw.primary_book as PolityTopic["primary_book"],
    ncert_reference: raw.ncert_reference as PolityTopic["ncert_reference"],
    key_concepts: extraConcepts.length > 0 ? [...existing, ...extraConcepts] : existing,
    pyq_frequency: raw.pyq_frequency as string | number | undefined,
    prelims_importance: raw.prelims_importance as string | number | undefined,
    mains_importance: raw.mains_importance as string | number | undefined,
    daily_target_hours: raw.daily_target_hours as number | undefined,
  };
}

const agricultureModules = (
  (((agricultureData as unknown) as { modules?: PolityModule[] }).modules ?? []).map((m) => ({
    ...m,
    topics: (m.topics ?? []).map((t) => normalizeAgricultureTopic(t as unknown as Record<string, unknown>)),
  })) as PolityModule[]
).sort((a, b) =>
  String(a.module_id).localeCompare(String(b.module_id), undefined, { numeric: true, sensitivity: "base" }),
);

function normalizeEnvironmentTopic(raw: Record<string, unknown>): PolityTopic {
  const extraConcepts: string[] = [];
  if (Array.isArray(raw.important_conventions)) {
    extraConcepts.push(...(raw.important_conventions as string[]).map((x) => `Convention: ${x}`));
  }
  if (Array.isArray(raw.government_initiatives)) {
    extraConcepts.push(...(raw.government_initiatives as string[]).map((x) => `Initiative: ${x}`));
  }
  const existing = (raw.key_concepts as string[] | undefined) ?? [];
  const pb = raw.primary_book;
  let primaryBook: PolityTopic["primary_book"];
  if (typeof pb === "string") {
    primaryBook = pb;
  } else if (pb && typeof pb === "object") {
    const o = pb as { chapter?: string | number; name?: string };
    primaryBook = {
      chapter_name: [o.chapter != null ? `Ch ${o.chapter}` : null, o.name].filter(Boolean).join(" — "),
      name: o.name,
      chapter: o.chapter,
    };
  }
  return {
    topic_id: String(raw.topic_id ?? ""),
    topic_name: String(raw.topic_name ?? ""),
    primary_book: primaryBook,
    ncert_reference: raw.ncert_reference as PolityTopic["ncert_reference"],
    key_concepts: extraConcepts.length > 0 ? [...existing, ...extraConcepts] : existing,
    pyq_frequency: raw.pyq_frequency as string | number | undefined,
    prelims_importance: raw.prelims_importance as string | number | undefined,
    mains_importance: raw.mains_importance as string | number | undefined,
    daily_target_hours: raw.daily_target_hours as number | undefined,
  };
}

const environmentModules = (
  (((environmentData as unknown) as { modules?: PolityModule[] }).modules ?? []).map((m, index) => {
    const topics = (m.topics ?? []).map((t) => normalizeEnvironmentTopic(t as unknown as Record<string, unknown>));
    const estimatedHours = Math.round(
      topics.reduce((sum, t) => sum + (t.daily_target_hours ?? 0), 0) * 10,
    ) / 10;
    const moduleNum = Number(String(m.module_id).replace(/\D/g, "")) || index + 1;
    return {
      ...m,
      sequence: m.sequence ?? moduleNum,
      module_number: m.module_number ?? moduleNum,
      estimated_hours: m.estimated_hours ?? estimatedHours,
      estimated_days: m.estimated_days ?? Math.max(1, Math.ceil(estimatedHours / 3)),
      importance: m.importance ?? "high",
      topics,
    };
  }) as PolityModule[]
).sort((a, b) =>
  String(a.module_id).localeCompare(String(b.module_id), undefined, { numeric: true, sensitivity: "base" }),
);

function formatNcertRef(ref: PolityTopic["ncert_reference"]): string | undefined {
  if (!ref || typeof ref === "string") return typeof ref === "string" ? ref : undefined;
  if (Array.isArray(ref)) return undefined;
  const o = ref as { class?: number; book?: string; book_name?: string; chapters?: string | number[]; chapter?: string | number };
  const chapters = Array.isArray(o.chapters) ? o.chapters.join(", ") : o.chapters;
  return [o.class != null ? `Class ${o.class}` : null, o.book_name ?? o.book, chapters != null ? `Ch ${chapters}` : null]
    .filter(Boolean)
    .join(" • ");
}

function normalizeScienceTechTopic(raw: Record<string, unknown>): PolityTopic {
  const extraConcepts: string[] = [];
  if (typeof raw.india_specific === "string") {
    extraConcepts.push(`India: ${raw.india_specific}`);
  }
  if (typeof raw.recent_developments === "string") {
    extraConcepts.push(`Recent: ${raw.recent_developments}`);
  }
  const existing = (raw.key_concepts as string[] | undefined) ?? [];
  const ncert = raw.ncert_reference;
  let ncertRef: PolityTopic["ncert_reference"];
  if (typeof ncert === "string") {
    ncertRef = ncert;
  } else if (ncert && typeof ncert === "object" && !Array.isArray(ncert)) {
    const formatted = formatNcertRef(ncert as PolityTopic["ncert_reference"]);
    ncertRef = formatted ?? (ncert as PolityTopic["ncert_reference"]);
  } else {
    ncertRef = ncert as PolityTopic["ncert_reference"];
  }
  return {
    topic_id: String(raw.topic_id ?? ""),
    topic_name: String(raw.topic_name ?? ""),
    primary_book: raw.primary_book as PolityTopic["primary_book"],
    ncert_reference: ncertRef,
    key_concepts: extraConcepts.length > 0 ? [...existing, ...extraConcepts] : existing,
    pyq_frequency: raw.pyq_frequency as string | number | undefined,
    prelims_importance: raw.prelims_importance as string | number | undefined,
    mains_importance: raw.mains_importance as string | number | undefined,
    daily_target_hours: raw.daily_target_hours as number | undefined,
  };
}

const scienceTechModules = (
  (((scienceTechData as unknown) as { modules?: PolityModule[] }).modules ?? []).map((m, index) => {
    const topics = (m.topics ?? []).map((t) => normalizeScienceTechTopic(t as unknown as Record<string, unknown>));
    const estimatedHours = Math.round(topics.reduce((sum, t) => sum + (t.daily_target_hours ?? 0), 0) * 10) / 10;
    const moduleNum = Number(m.module_id) || index + 1;
    return {
      ...m,
      sequence: m.sequence ?? moduleNum,
      module_number: m.module_number ?? moduleNum,
      estimated_hours: m.estimated_hours ?? estimatedHours,
      estimated_days: m.estimated_days ?? Math.max(1, Math.ceil(estimatedHours / 3)),
      importance: m.importance ?? "high",
      topics,
    };
  }) as PolityModule[]
).sort((a, b) =>
  String(a.module_id).localeCompare(String(b.module_id), undefined, { numeric: true, sensitivity: "base" }),
);

function flattenSocietyNcert(ref: unknown): string[] {
  if (!ref) return [];
  if (typeof ref === "string") return [ref];
  if (Array.isArray(ref)) return ref.map(String);
  if (typeof ref !== "object") return [];
  const lines: string[] = [];
  for (const [key, val] of Object.entries(ref as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      for (const item of val) lines.push(`${key}: ${String(item)}`);
    } else if (val != null) {
      lines.push(`${key}: ${String(val)}`);
    }
  }
  return lines;
}

function normalizeSocietyTopic(raw: Record<string, unknown>): PolityTopic {
  const extraConcepts: string[] = [];
  if (Array.isArray(raw.thinkers_referenced)) {
    extraConcepts.push(...(raw.thinkers_referenced as string[]).map((x) => `Thinker: ${x}`));
  }
  if (Array.isArray(raw.current_affairs_connect)) {
    extraConcepts.push(...(raw.current_affairs_connect as string[]).map((x) => `Current affairs: ${x}`));
  }
  if (Array.isArray(raw.mains_answer_angles)) {
    extraConcepts.push(...(raw.mains_answer_angles as string[]).map((x) => `Mains angle: ${x}`));
  }
  const existing = (raw.key_concepts as string[] | undefined) ?? [];
  const ncertLines = flattenSocietyNcert(raw.ncert_reference);
  return {
    topic_id: String(raw.topic_id ?? ""),
    topic_name: String(raw.topic_name ?? ""),
    primary_book: typeof raw.primary_book === "string" ? raw.primary_book : undefined,
    ncert_reference: ncertLines.length > 0 ? ncertLines : undefined,
    key_concepts: extraConcepts.length > 0 ? [...existing, ...extraConcepts] : existing,
    pyq_frequency: raw.pyq_frequency as string | number | undefined,
    mains_importance: raw.mains_importance as string | number | undefined,
    daily_target_hours: raw.daily_target_hours as number | undefined,
  };
}

function normalizeGovernanceTopic(raw: Record<string, unknown>): PolityTopic {
  const extraConcepts: string[] = [];
  const schemes = raw.government_schemes;
  if (schemes && typeof schemes === "object" && !Array.isArray(schemes)) {
    for (const value of Object.values(schemes as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        const o = value as Record<string, unknown>;
        extraConcepts.push([o.name, o.year, o.objective, o.status].filter(Boolean).join(" — "));
      }
    }
  }
  if (Array.isArray(raw.issues_challenges)) {
    extraConcepts.push(...(raw.issues_challenges as string[]).map((x) => `Issue: ${x}`));
  }
  if (Array.isArray(raw.reforms_needed)) {
    extraConcepts.push(...(raw.reforms_needed as string[]).map((x) => `Reform: ${x}`));
  }
  if (Array.isArray(raw.mains_answer_angles)) {
    extraConcepts.push(...(raw.mains_answer_angles as string[]).map((x) => `Mains angle: ${x}`));
  }
  const existing = (raw.key_concepts as string[] | undefined) ?? [];
  return {
    topic_id: String(raw.topic_id ?? ""),
    topic_name: String(raw.topic_name ?? ""),
    primary_book: typeof raw.primary_source === "string" ? raw.primary_source : undefined,
    key_concepts: extraConcepts.length > 0 ? [...existing, ...extraConcepts] : existing,
    pyq_frequency: raw.pyq_frequency as string | number | undefined,
    mains_importance: raw.mains_importance as string | number | undefined,
    daily_target_hours: raw.daily_target_hours as number | undefined,
  };
}

const societyModules = (
  (((societyData as unknown) as { modules?: Record<string, unknown>[] }).modules ?? []).map((m, index) => {
    const raw = m as Record<string, unknown>;
    const topics = ((raw.topics as unknown[]) ?? []).map((t) =>
      normalizeSocietyTopic(t as Record<string, unknown>),
    );
    const order = Number(raw.module_order) || index + 1;
    const estHours =
      Number(raw.estimated_study_hours) ||
      Math.round(topics.reduce((sum, t) => sum + (t.daily_target_hours ?? 0), 0) * 10) / 10;
    return {
      module_id: String(raw.module_id ?? ""),
      module_name: String(raw.module_name ?? ""),
      sequence: order,
      module_number: order,
      estimated_hours: estHours,
      estimated_days: Math.max(1, Math.ceil(estHours / 3)),
      importance: "high",
      topics,
    } as PolityModule;
  })
).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

const governanceModules = (
  (((governanceData as unknown) as { modules?: PolityModule[] }).modules ?? []).map((m, index) => {
    const topics = (m.topics ?? []).map((t) => normalizeGovernanceTopic(t as unknown as Record<string, unknown>));
    const estimatedHours = Math.round(topics.reduce((sum, t) => sum + (t.daily_target_hours ?? 0), 0) * 10) / 10;
    const moduleNum = Number(String(m.module_id).replace(/\D/g, "")) || index + 1;
    return {
      ...m,
      sequence: m.sequence ?? moduleNum,
      module_number: m.module_number ?? moduleNum,
      estimated_hours: m.estimated_hours ?? estimatedHours,
      estimated_days: m.estimated_days ?? Math.max(1, Math.ceil(estimatedHours / 3)),
      importance: m.importance ?? "critical",
      topics,
    };
  }) as PolityModule[]
).sort((a, b) =>
  String(a.module_id).localeCompare(String(b.module_id), undefined, { numeric: true, sensitivity: "base" }),
);

function normalizeEthicsTopic(raw: Record<string, unknown>): PolityTopic {
  const extraConcepts: string[] = [];
  if (typeof raw.case_study_link === "string") {
    extraConcepts.push(`Case study: ${raw.case_study_link}`);
  }
  if (Array.isArray(raw.mains_answer_angles)) {
    extraConcepts.push(...(raw.mains_answer_angles as string[]).map((x) => `Mains angle: ${x}`));
  }
  const existing = (raw.key_concepts as string[] | undefined) ?? [];
  const ncertLines =
    typeof raw.ncert_reference === "string"
      ? [raw.ncert_reference]
      : flattenSocietyNcert(raw.ncert_reference);
  return {
    topic_id: String(raw.topic_id ?? ""),
    topic_name: String(raw.topic_name ?? ""),
    primary_book: typeof raw.primary_source === "string" ? raw.primary_source : undefined,
    ncert_reference: ncertLines.length > 0 ? ncertLines : undefined,
    key_concepts: extraConcepts.length > 0 ? [...existing, ...extraConcepts] : existing,
    pyq_frequency: raw.pyq_frequency as string | number | undefined,
    prelims_importance: raw.prelims_importance as string | number | undefined,
    mains_importance: raw.mains_importance as string | number | undefined,
    daily_target_hours: raw.daily_target_hours as number | undefined,
  };
}

const ethicsModules = (
  (((ethicsData as unknown) as { modules?: Record<string, unknown>[] }).modules ?? []).map((m, index) => {
    const raw = m as Record<string, unknown>;
    const topics = ((raw.topics as unknown[]) ?? []).map((t) =>
      normalizeEthicsTopic(t as Record<string, unknown>),
    );
    const durationDays = raw.duration_days as { standard?: number; fast?: number; extended?: number } | undefined;
    const estDays =
      durationDays?.standard ??
      Math.max(1, Math.ceil((topics.reduce((sum, t) => sum + (t.daily_target_hours ?? 0), 0) || 18) / 3));
    const estHours =
      Math.round(topics.reduce((sum, t) => sum + (t.daily_target_hours ?? 0), 0) * 10) / 10 ||
      estDays * (Number(raw.daily_target_hours) || 3);
    const moduleNum = Number(String(raw.module_id).replace(/\D/g, "")) || index + 1;
    return {
      module_id: String(raw.module_id ?? ""),
      module_name: String(raw.module_name ?? ""),
      sequence: moduleNum,
      module_number: moduleNum,
      estimated_hours: estHours,
      estimated_days: estDays,
      importance: "critical",
      upsc_prelims_weightage: "Mains GS IV only",
      topics,
    } as PolityModule;
  })
).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

function normalizeIRTopic(raw: Record<string, unknown>): PolityTopic {
  const extraConcepts: string[] = [];
  if (typeof raw.india_position === "string") {
    extraConcepts.push(`India position: ${raw.india_position}`);
  }
  if (typeof raw.recent_developments === "string") {
    extraConcepts.push(`Recent: ${raw.recent_developments}`);
  }
  if (Array.isArray(raw.mains_answer_angles)) {
    extraConcepts.push(...(raw.mains_answer_angles as string[]).map((x) => `Mains angle: ${x}`));
  }
  const existing = (raw.key_concepts as string[] | undefined) ?? [];
  return {
    topic_id: String(raw.topic_id ?? ""),
    topic_name: String(raw.topic_name ?? ""),
    primary_book: typeof raw.primary_book === "string" ? raw.primary_book : undefined,
    key_concepts: extraConcepts.length > 0 ? [...existing, ...extraConcepts] : existing,
    pyq_frequency: raw.pyq_frequency as string | number | undefined,
    mains_importance: raw.mains_importance as string | number | undefined,
  };
}

function buildInternationalRelationsModules(raw: Record<string, unknown>): PolityModule[] {
  const moduleKeys = Object.keys(raw)
    .filter((k) => /^module_\d+$/.test(k))
    .sort(
      (a, b) =>
        parseInt(a.replace("module_", ""), 10) - parseInt(b.replace("module_", ""), 10),
    );
  return moduleKeys.map((key, index) => {
    const m = raw[key] as Record<string, unknown>;
    const topics = ((m.topics as unknown[]) ?? []).map((t) =>
      normalizeIRTopic(t as Record<string, unknown>),
    );
    const moduleNum = parseInt(key.replace("module_", ""), 10) || index + 1;
    const estHours =
      Number(m.daily_target_hours) ||
      Math.round(topics.reduce((sum, t) => sum + (t.daily_target_hours ?? 1.5), 0) * 10) / 10;
    return {
      module_id: String(m.module_id ?? `M${moduleNum}`),
      module_name: String(m.module_name ?? ""),
      sequence: moduleNum,
      module_number: moduleNum,
      estimated_hours: estHours,
      estimated_days: Math.max(1, Math.ceil(estHours / 3)),
      importance: "critical",
      upsc_prelims_weightage: "Prelims: 2-3 questions",
      topics,
    } as PolityModule;
  });
}

const internationalRelationsModules = buildInternationalRelationsModules(
  internationalRelationsData as unknown as Record<string, unknown>,
);

type HistoryPart = "ancient_history" | "medieval_history" | "modern_history" | "world_history";

type GeographyPart = "geography_physical" | "geography_india" | "geography_world";

type Segment =
  | "prelims"
  | "mains"
  | "optionals"
  | "polity"
  | "history"
  | "geography"
  | "economy"
  | "agriculture"
  | "environment"
  | "science_tech"
  | "society"
  | "governance"
  | "ethics"
  | "international_relations";

const HISTORY_PERIOD_TABS: readonly { id: HistoryPart; label: string }[] = [
  { id: "ancient_history", label: "Ancient" },
  { id: "medieval_history", label: "Medieval" },
  { id: "modern_history", label: "Modern" },
  { id: "world_history", label: "World" },
] as const;

const GEOGRAPHY_SCOPE_TABS: readonly { id: GeographyPart; label: string }[] = [
  { id: "geography_physical", label: "Geo Physical" },
  { id: "geography_india", label: "Geo India" },
  { id: "geography_world", label: "Geo World" },
] as const;

type StudentProfile = {
  targetYear?: string;
  prepStartDate?: string;
  dailyStudyHours?: string;
  educationBackground?: string;
};

function estimatePrelimsDate(targetYear?: string) {
  const numericYear = Number(targetYear);
  const year = Number.isFinite(numericYear) && numericYear > 2000 ? numericYear : new Date().getFullYear() + 1;
  const d = new Date(year, 4, 31);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
  return d;
}

function parseDailyHours(value?: string) {
  if (!value) return 3;
  const normalized = value.toLowerCase();
  const numbers = normalized.match(/\d+/g)?.map(Number) ?? [];
  if (normalized.includes("<")) return 2;
  if (normalized.includes("+") && numbers.length) return numbers[0];
  if (numbers.length >= 2) return (numbers[0] + numbers[1]) / 2;
  if (numbers.length === 1) return numbers[0];
  return 3;
}

function recommendedSegmentByBackground(background?: string): Segment {
  const normalized = (background || "").toLowerCase();
  if (normalized.includes("arts")) return "history";
  if (normalized.includes("engineering")) return "polity";
  if (normalized.includes("science")) return "geography";
  if (normalized.includes("medical")) return "geography";
  if (normalized.includes("commerce")) return "prelims";
  if (normalized.includes("law")) return "mains";
  return "prelims";
}

function defaultHistoryPartForProfile(background?: string): HistoryPart {
  const normalized = (background || "").toLowerCase();
  if (normalized.includes("arts")) return "modern_history";
  return "ancient_history";
}

function defaultGeographyPartForProfile(background?: string): GeographyPart {
  const normalized = (background || "").toLowerCase();
  if (normalized.includes("medical")) return "geography_india";
  if (normalized.includes("science")) return "geography_physical";
  return "geography_physical";
}

function historySubtitle(part: HistoryPart): string {
  if (part === "ancient_history") return "Ancient History — module-wise full syllabus view";
  if (part === "medieval_history") return "Medieval History — module-wise full syllabus view";
  if (part === "modern_history") return "Modern History — module-wise full syllabus view";
  return "World History — module-wise full syllabus view";
}

function historyMetaSnippet(
  part: HistoryPart,
  ancientMeta: { version?: string },
  medievalMeta: { version?: string; last_updated?: string },
  modernMeta: { version?: string; last_updated?: string },
  worldMeta: { version?: string },
): string {
  if (part === "ancient_history") return `Ancient v${ancientMeta.version ?? "1.x"}`;
  if (part === "medieval_history")
      return `Medieval v${medievalMeta.version ?? "1.x"}${medievalMeta.last_updated ? ` · ${medievalMeta.last_updated}` : ""}`;
  if (part === "modern_history")
    return `Modern v${modernMeta.version ?? "1.x"}${modernMeta.last_updated ? ` · ${modernMeta.last_updated}` : ""}`;
  return `World v${worldMeta.version ?? "1.x"}`;
}

function geographySubtitle(part: GeographyPart): string {
  if (part === "geography_physical") return "Physical Geography — module-wise full syllabus view";
  if (part === "geography_india") return "Indian Geography — module-wise full syllabus view";
  return "World Geography — module-wise full syllabus view";
}

function geographyMetaSnippet(
  part: GeographyPart,
  physicalMeta: { version?: string; created_date?: string },
  indiaMeta: { created_date?: string },
  worldMeta: { version?: string; last_updated?: string },
): string {
  if (part === "geography_physical")
    return `Physical Geography v${physicalMeta.version ?? "1.x"}${physicalMeta.created_date ? ` · ${physicalMeta.created_date}` : ""}`;
  if (part === "geography_india")
    return `Indian Geography v1.x${indiaMeta.created_date ? ` · ${indiaMeta.created_date}` : ""}`;
  return `World Geography v${worldMeta.version ?? "1.x"}${worldMeta.last_updated ? ` · ${worldMeta.last_updated}` : ""}`;
}

function daysUntil(date: Date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function TaskRow(props: { title: string; subtitle: string; showActions?: boolean }) {
  const navigate = useNavigate();
  const { title, subtitle, showActions = true } = props;
  return (
    <div className="sd-task">
      <h4>{title}</h4>
      <p>{subtitle}</p>
      {showActions ? (
        <div className="sd-btns">
          <button type="button" onClick={() => navigate("/prelims-test")}>
            Prelims MCQ
          </button>
          <button type="button" onClick={() => navigate("/copy-evaluation")}>
            Mains Answer
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PrelimsSection() {
  return (
    <div className="sd-syll-scroll">
      {Object.entries(prelims).map(([paperKey, paper]) => {
        if (!paper || typeof paper !== "object" || !paper.name) return null;

        if (Array.isArray(paper.subjects)) {
          return (
            <details key={paperKey} className="sd-syll-block">
              <summary>{paper.name}</summary>
              <div className="sd-syll-nested">
                {paper.subjects.map((subject) => (
                  <details key={subject.id} className="sd-syll-block sd-syll-inner">
                    <summary>{subject.name}</summary>
                    <div className="sd-syll-nested">
                      {(subject.topics ?? []).map((topic) => (
                        <details key={topic.id} className="sd-syll-block sd-syll-inner">
                          <summary>
                            {topic.name}
                            {topic.estimated_hours != null ? (
                              <span className="sd-syll-meta"> ~{topic.estimated_hours}h</span>
                            ) : null}
                          </summary>
                          <div className="sd-syll-leaves">
                            {(topic.subtopics ?? []).map((st) => (
                              <TaskRow
                                key={st.id}
                                title={st.name}
                                subtitle={[subject.name, topic.name].filter(Boolean).join(" • ")}
                              />
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          );
        }

        if (Array.isArray(paper.topics)) {
          return (
            <details key={paperKey} className="sd-syll-block">
              <summary>{paper.name}</summary>
              <div className="sd-syll-nested">
                {paper.topics.map((topic) => (
                  <details key={topic.id} className="sd-syll-block sd-syll-inner">
                    <summary>
                      {topic.name}
                      {topic.estimated_hours != null ? (
                        <span className="sd-syll-meta"> ~{topic.estimated_hours}h</span>
                      ) : null}
                    </summary>
                    <div className="sd-syll-leaves">
                      {(topic.subtopics ?? []).map((st) => (
                        <TaskRow
                          key={st.id}
                          title={st.name}
                          subtitle={["CSAT", topic.name].join(" • ")}
                        />
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          );
        }

        return null;
      })}
    </div>
  );
}

function MainsSection() {
  return (
    <div className="sd-syll-scroll">
      {Object.entries(mains).map(([key, block]) => {
        if (!block || typeof block !== "object") return null;
        const b = block as { name?: string; subjects?: Subject[]; topics?: Topic[] };
        if (typeof b.name !== "string") return null;
        const mainsPaperName = b.name;

        if (key === "essay" && Array.isArray(b.topics)) {
          return (
            <details key={key} className="sd-syll-block">
              <summary>{b.name}</summary>
              <div className="sd-syll-leaves">
                {b.topics.map((t) => (
                  <TaskRow key={t.id} title={t.name} subtitle="Essay • Mains" />
                ))}
              </div>
            </details>
          );
        }

        if (!Array.isArray(b.subjects)) return null;

        return (
          <details key={key} className="sd-syll-block">
            <summary>{b.name}</summary>
            <div className="sd-syll-nested">
              {b.subjects.map((subject) => (
                <details key={subject.id} className="sd-syll-block sd-syll-inner">
                  <summary>{subject.name}</summary>
                  <div className="sd-syll-leaves">
                    {(subject.topics ?? []).map((t) => (
                      <TaskRow
                        key={t.id}
                        title={t.name}
                        subtitle={[mainsPaperName.replace(/—.*/, "").trim(), subject.name].join(" • ")}
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

type OptionalPaper = { id: string; name: string; topics?: Topic[] };
type OptionalRoot = { id: string; name: string; papers?: OptionalPaper[] };

function OptionalsSection() {
  return (
    <div className="sd-syll-scroll">
      {Object.entries(optionals).map(([key, raw]) => {
        if (key === "note" || !raw || typeof raw !== "object") return null;
        const opt = raw as OptionalRoot;
        if (!opt.name || !Array.isArray(opt.papers)) return null;

        return (
          <details key={key} className="sd-syll-block">
            <summary>{opt.name}</summary>
            <div className="sd-syll-nested">
              {opt.papers.map((paper) => (
                <details key={paper.id} className="sd-syll-block sd-syll-inner">
                  <summary>{paper.name}</summary>
                  <div className="sd-syll-leaves">
                    {(paper.topics ?? []).map((t) => (
                      <TaskRow
                        key={t.id}
                        title={t.name}
                        subtitle={[opt.name, paper.name].join(" • ")}
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function getTopicSubtitle(topic: PolityTopic, fallback: string) {
  if (topic.laxmikanth_chapter) return topic.laxmikanth_chapter;
  if (topic.rs_sharma_reference) return topic.rs_sharma_reference;
  if (typeof topic.primary_book === "string") return topic.primary_book;
  if (topic.primary_book_reference?.chapters) return topic.primary_book_reference.chapters;
  if (topic.primary_book_reference?.chapter_name) return topic.primary_book_reference.chapter_name;
  if (typeof topic.primary_book === "object") {
    if (topic.primary_book.chapter_name) return topic.primary_book.chapter_name;
    if (topic.primary_book.name) {
      const ch = topic.primary_book.chapter;
      return ch != null ? `Ch ${ch} — ${topic.primary_book.name}` : topic.primary_book.name;
    }
    if (topic.primary_book.title) return topic.primary_book.title;
  }
  return fallback;
}

function GenericSyllabusSection(props: { modules: PolityModule[] }) {
  const { modules } = props;
  return (
    <div className="sd-syll-scroll">
      {modules.map((module) => (
        <details key={String(module.module_id)} className="sd-syll-block">
          <summary>
            <div className="sd-p-module-summary">
              <span className="sd-p-module-title">
                {module.module_name}
                {module.estimated_hours != null ? <span className="sd-syll-meta"> ~{module.estimated_hours}h</span> : null}
              </span>
              <span className="sd-p-module-pills">
                {(module.sequence ?? module.module_number) != null ? (
                  <span className="sd-p-pill">Module #{module.sequence ?? module.module_number}</span>
                ) : null}
                {module.period ? <span className="sd-p-pill">{module.period}</span> : null}
                {(module.estimated_days_standard ?? module.estimated_days) != null ? (
                  <span className="sd-p-pill">{module.estimated_days_standard ?? module.estimated_days} days</span>
                ) : null}
                {module.estimated_hours != null ? <span className="sd-p-pill">{module.estimated_hours} hrs</span> : null}
                {module.importance ? <span className="sd-p-pill">Importance: {module.importance}</span> : null}
                {module.upsc_prelims_weightage ? <span className="sd-p-pill">Prelims: {module.upsc_prelims_weightage}</span> : null}
              </span>
            </div>
          </summary>
          <div className="sd-syll-nested">
            {module.module_overview ? (
              <div className="sd-p-section">
                <h5>Module Overview</h5>
                <ul>
                  <li>{module.module_overview}</li>
                </ul>
              </div>
            ) : null}
            {(module.topics ?? []).map((topic) => (
              <details key={String(topic.topic_id)} className="sd-syll-block sd-syll-inner">
                <summary>{topic.topic_name}</summary>
                <div className="sd-syll-leaves">
                  <TaskRow title={topic.topic_name} subtitle={getTopicSubtitle(topic, module.module_name)} showActions={false} />

                  {(() => {
                    const ncertItems = Array.isArray(topic.ncert_reference)
                      ? topic.ncert_reference
                      : topic.ncert_reference
                        ? [topic.ncert_reference]
                        : [];
                    return ncertItems.length > 0 ? (
                    <div className="sd-p-section">
                      <h5>NCERT Reference</h5>
                      <ul>
                        {ncertItems.map((ref, index) => (
                          <li key={`${String(topic.topic_id)}-ncert-${index}`}>
                            {typeof ref === "string"
                              ? ref
                              : [ref.book_name ?? ref.book, ref.chapter_name ?? ref.chapters ?? ref.chapter, ref.class != null ? `Class ${ref.class}` : null]
                                  .filter(Boolean)
                                  .join(" • ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                    ) : null;
                  })()}

                  {(topic.key_concepts ?? []).length > 0 ? (
                    <div className="sd-p-section">
                      <h5>Key Concepts</h5>
                      <ul>
                        {(topic.key_concepts ?? []).map((concept, index) => (
                          <li key={`${String(topic.topic_id)}-concept-${index}`}>{concept}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {(topic.important_cases ?? []).length > 0 ? (
                    <div className="sd-p-section">
                      <h5>Important Cases</h5>
                      <ul>
                        {(topic.important_cases ?? []).map((item, index) => (
                          <li key={`${String(topic.topic_id)}-case-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {topic.sources_borrowed && Object.keys(topic.sources_borrowed).length > 0 ? (
                    <div className="sd-p-section">
                      <h5>Sources Borrowed</h5>
                      <ul>
                        {Object.entries(topic.sources_borrowed).map(([key, value]) => (
                          <li key={`${String(topic.topic_id)}-src-${key}`}>
                            <strong>{key}:</strong> {value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {topic.important_facts && Object.keys(topic.important_facts).length > 0 ? (
                    <div className="sd-p-section">
                      <h5>Important Facts</h5>
                      <ul>
                        {Object.entries(topic.important_facts).map(([key, value]) => (
                          <li key={`${String(topic.topic_id)}-fact-${key}`}>
                            <strong>{key.replace(/_/g, " ")}:</strong>{" "}
                            {Array.isArray(value) ? value.join(" | ") : String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {topic.map_work ? (
                    <div className="sd-p-section">
                      <h5>Map Work</h5>
                      <ul>
                        {typeof topic.map_work === "string" ? (
                          <li>{topic.map_work}</li>
                        ) : Array.isArray(topic.map_work) ? (
                          topic.map_work.map((item, index) => <li key={`${String(topic.topic_id)}-map-${index}`}>{item}</li>)
                        ) : (
                          <>
                            {(topic.map_work.regions ?? []).map((item, index) => (
                              <li key={`${String(topic.topic_id)}-regions-${index}`}>{item}</li>
                            ))}
                            {(topic.map_work.routes ?? []).map((item, index) => (
                              <li key={`${String(topic.topic_id)}-routes-${index}`}>{item}</li>
                            ))}
                            {topic.map_work.significance ? <li>{topic.map_work.significance}</li> : null}
                          </>
                        )}
                      </ul>
                    </div>
                  ) : null}

                  <div className="sd-p-meta-wrap">
                    {topic.pyq_frequency != null ? <span className="sd-p-pill">PYQ: {String(topic.pyq_frequency)}</span> : null}
                    {topic.prelims_importance != null ? (
                      <span className="sd-p-pill">Prelims: {String(topic.prelims_importance)}</span>
                    ) : null}
                    {topic.mains_importance != null ? (
                      <span className="sd-p-pill">Mains: {String(topic.mains_importance)}</span>
                    ) : null}
                    {topic.daily_target_hours != null ? (
                      <span className="sd-p-pill">Daily Target: {topic.daily_target_hours}h</span>
                    ) : null}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function PolitySection() {
  return <GenericSyllabusSection modules={polityModules} />;
}

function AncientHistorySection() {
  return <GenericSyllabusSection modules={ancientHistoryModules} />;
}

function MedievalHistorySection() {
  return <GenericSyllabusSection modules={medievalHistoryModules} />;
}

function ModernHistorySection() {
  return <GenericSyllabusSection modules={modernHistoryModules} />;
}

function WorldHistorySection() {
  return <GenericSyllabusSection modules={worldHistoryModules} />;
}

function GeographyPhysicalSection() {
  return <GenericSyllabusSection modules={geographyPhysicalModules} />;
}

function GeographyIndiaSection() {
  return <GenericSyllabusSection modules={geographyIndiaModules} />;
}

function GeographyWorldSection() {
  return <GenericSyllabusSection modules={geographyWorldModules} />;
}

function EconomySection() {
  return <GenericSyllabusSection modules={economyModules} />;
}

function AgricultureSection() {
  return <GenericSyllabusSection modules={agricultureModules} />;
}

function EnvironmentSection() {
  return <GenericSyllabusSection modules={environmentModules} />;
}

function ScienceTechSection() {
  return <GenericSyllabusSection modules={scienceTechModules} />;
}

function SocietySection() {
  return <GenericSyllabusSection modules={societyModules} />;
}

function GovernanceSection() {
  return <GenericSyllabusSection modules={governanceModules} />;
}

function EthicsSection() {
  return <GenericSyllabusSection modules={ethicsModules} />;
}

function InternationalRelationsSection() {
  return <GenericSyllabusSection modules={internationalRelationsModules} />;
}

type Props = { todayLabel: string };

export function SyllabusTargetsPanel({ todayLabel, studentProfile }: Props & { studentProfile?: StudentProfile }) {
  const [segment, setSegment] = useState<Segment>(recommendedSegmentByBackground(studentProfile?.educationBackground));
  const [historyPart, setHistoryPart] = useState<HistoryPart>(() => defaultHistoryPartForProfile(studentProfile?.educationBackground));
  const [geographyPart, setGeographyPart] = useState<GeographyPart>(() =>
    defaultGeographyPartForProfile(studentProfile?.educationBackground),
  );
  const meta = syllabusData.meta as { description?: string; last_updated?: string; version?: string };
  const polityMeta = polityData.meta as { version?: string };
  const ancientMeta = ancientHistoryData.meta as { version?: string };
  const medievalMeta = medievalHistoryData.meta as { version?: string; last_updated?: string };
  const modernMeta = modernHistoryData.meta as { version?: string; last_updated?: string };
  const worldMeta = worldHistoryData.meta as { version?: string };
  const geographyPhysicalMeta = geographyPhysicalData.metadata as { version?: string; created_date?: string };
  const geographyIndiaMeta = geographyIndiaData.metadata as { created_date?: string };
  const geographyWorldMeta = geographyWorldData.meta as { version?: string; last_updated?: string };
  const economyMeta = economyData.metadata as { last_updated?: string; subject?: string };
  const agricultureMeta = agricultureData.meta as { version?: string; creation_date?: string; subject?: string };
  const environmentMeta = environmentData.metadata as {
    subject?: string;
    creation_date?: string;
    total_modules?: number;
  };
  const scienceTechMeta = scienceTechData.metadata as {
    subject?: string;
    creation_date?: string;
    last_updated?: string;
    total_modules?: number;
  };
  const societyMeta = societyData.syllabus_metadata as {
    topic?: string;
    subject?: string;
    marks_weightage?: string;
    last_updated?: string;
    total_modules?: number;
    total_topics?: number;
  };
  const governanceMeta = governanceData.metadata as {
    title?: string;
    creation_date?: string;
    total_modules?: number;
    gs2_weightage_marks?: string;
    estimated_preparation_hours?: number;
  };
  const ethicsMeta = ethicsData.metadata as {
    title?: string;
    paper?: string;
    creation_date?: string;
    total_modules?: number;
    estimated_preparation_hours?: number;
    total_marks?: number;
  };
  const irMeta = (internationalRelationsData as { syllabus_metadata?: Record<string, unknown> })
    .syllabus_metadata as {
    subject?: string;
    paper?: string;
    weightage_marks?: string;
    prelims_questions?: string;
    total_modules?: number;
    target_study_hours?: number;
    last_updated?: string;
  };
  const dailyHours = parseDailyHours(studentProfile?.dailyStudyHours);
  const prelimsDate = estimatePrelimsDate(studentProfile?.targetYear);
  const daysLeft = daysUntil(prelimsDate);
  const preparationMode = daysLeft <= 120 ? "revision-heavy" : daysLeft <= 240 ? "balanced coverage" : "foundation-heavy";
  const dailyTargetsCount = Math.max(2, Math.min(6, Math.round(dailyHours)));

  const subtitle = useMemo(() => {
    if (segment === "prelims") return "Prelims — GS Paper I & CSAT (full topic tree)";
    if (segment === "mains") return "Mains — GS I–IV & Essay (official-style modules)";
    if (segment === "polity") return "Polity — Prelims + GS II mapped for quick access";
    if (segment === "history") return historySubtitle(historyPart);
    if (segment === "geography") return geographySubtitle(geographyPart);
    if (segment === "economy") return "Indian Economy — module-wise full syllabus view";
    if (segment === "agriculture") return "Agriculture (GS 3) — module-wise full syllabus view";
    if (segment === "environment") return "Environment & Ecology (GS 3) — module-wise full syllabus view";
    if (segment === "science_tech") return "Science & Technology (GS 3) — module-wise full syllabus view";
    if (segment === "society") return "Indian Society (GS 1) — NCERT Sociology mapped module-wise";
    if (segment === "governance") return "Governance & Social Justice (GS 2) — 2nd ARC & schemes module-wise";
    if (segment === "ethics") return "Ethics, Integrity & Aptitude (GS 4) — theory + case studies module-wise";
    if (segment === "international_relations")
      return "International Relations (GS 2) — Pavneet Singh & NCERT Contemporary World Politics";
    return "Popular optionals — Paper I & II outlines";
  }, [segment, historyPart, geographyPart]);

  const planHint = useMemo(() => {
    return `Plan: ${dailyTargetsCount} focus targets/day (${dailyHours.toFixed(1)}h) • ${preparationMode}`;
  }, [dailyTargetsCount, dailyHours, preparationMode]);

  return (
    <>
      <div className="sd-card-hd">
        <div>
          <h3>Today&apos;s Targets</h3>
          <p className="sd-syll-deck">{subtitle}</p>
          <p className="sd-syll-deck">{planHint}</p>
        </div>
        <small>{todayLabel}</small>
      </div>

      <div className="sd-syll-meta-bar">
        <span>
          {segment === "polity"
            ? `Polity v${polityMeta.version ?? "1.x"}`
            : segment === "history"
              ? historyMetaSnippet(historyPart, ancientMeta, medievalMeta, modernMeta, worldMeta)
              : segment === "geography"
                ? geographyMetaSnippet(geographyPart, geographyPhysicalMeta, geographyIndiaMeta, geographyWorldMeta)
                : segment === "economy"
                      ? `${economyMeta.subject ?? "Indian Economy"}${economyMeta.last_updated ? ` · ${economyMeta.last_updated}` : ""}`
                      : segment === "agriculture"
                        ? `${agricultureMeta.subject ?? "Agriculture"} v${agricultureMeta.version ?? "1.x"}${agricultureMeta.creation_date ? ` · ${agricultureMeta.creation_date}` : ""}`
                        : segment === "environment"
                          ? `${environmentMeta.subject ?? "Environment & Ecology"}${environmentMeta.creation_date ? ` · ${environmentMeta.creation_date}` : ""}${environmentMeta.total_modules ? ` · ${environmentMeta.total_modules} modules` : ""}`
                          : segment === "science_tech"
                            ? `${scienceTechMeta.subject ?? "Science & Technology"}${scienceTechMeta.last_updated ? ` · ${scienceTechMeta.last_updated}` : scienceTechMeta.creation_date ? ` · ${scienceTechMeta.creation_date}` : ""}${scienceTechMeta.total_modules ? ` · ${scienceTechMeta.total_modules} modules` : ""}`
                            : segment === "society"
                              ? `${societyMeta.topic ?? societyMeta.subject ?? "Indian Society"}${societyMeta.marks_weightage ? ` · ${societyMeta.marks_weightage}` : ""}${societyMeta.last_updated ? ` · ${societyMeta.last_updated}` : ""}${societyMeta.total_modules ? ` · ${societyMeta.total_modules} modules` : ""}`
                              : segment === "governance"
                                ? `Governance & Social Justice${governanceMeta.creation_date ? ` · ${governanceMeta.creation_date}` : ""}${governanceMeta.total_modules ? ` · ${governanceMeta.total_modules} modules` : ""}${governanceMeta.gs2_weightage_marks ? ` · ${governanceMeta.gs2_weightage_marks}` : ""}`
                                : segment === "ethics"
                                  ? `${ethicsMeta.paper ?? "GS Paper 4"}${ethicsMeta.creation_date ? ` · ${ethicsMeta.creation_date}` : ""}${ethicsMeta.total_modules ? ` · ${ethicsMeta.total_modules} modules` : ""}${ethicsMeta.total_marks ? ` · ${ethicsMeta.total_marks} marks` : ""}`
                                  : segment === "international_relations"
                                    ? `${irMeta.subject ?? "International Relations"}${irMeta.weightage_marks ? ` · ${irMeta.weightage_marks}` : ""}${irMeta.prelims_questions ? ` · Prelims ${irMeta.prelims_questions}` : ""}${irMeta.total_modules ? ` · ${irMeta.total_modules} modules` : ""}`
                                    : `Syllabus v${meta.version ?? "1.x"}${meta.last_updated ? ` · ${meta.last_updated}` : ""}`}
        </span>
        <span>
          {" "}• UPSC Prelims {studentProfile?.targetYear || new Date().getFullYear() + 1}:{" "}
          {prelimsDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          {" "}({daysLeft} days left)
        </span>
      </div>

      <div className="sd-syll-tabs" role="tablist" aria-label="Syllabus section">
        {(
          [
            ["prelims", "Prelims"],
            ["mains", "Mains"],
            ["optionals", "Optionals"],
            ["polity", "Polity"],
            ["history", "History"],
            ["geography", "Geography"],
            ["economy", "Economy"],
            ["agriculture", "Agriculture"],
            ["environment", "Environment"],
            ["science_tech", "S&T"],
            ["society", "Society"],
            ["governance", "Governance"],
            ["ethics", "Ethics"],
            ["international_relations", "IR"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={segment === id}
            className={segment === id ? "active" : ""}
            onClick={() => setSegment(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {segment === "history" ? (
        <div className="sd-syll-history-group">
          <div className="sd-syll-history-label" id="history-period-label">
            History — pick a period (all four below)
          </div>
          <div
            className="sd-syll-history-pills"
            role="tablist"
            aria-labelledby="history-period-label"
            aria-label="History period"
          >
            {HISTORY_PERIOD_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={historyPart === id}
                className={historyPart === id ? "active" : ""}
                onClick={() => setHistoryPart(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {segment === "geography" ? (
        <div className="sd-syll-history-group">
          <div className="sd-syll-history-label" id="geography-scope-label">
            Geography — choose scope (all three below)
          </div>
          <div
            className="sd-syll-history-pills"
            role="tablist"
            aria-labelledby="geography-scope-label"
            aria-label="Geography scope"
          >
            {GEOGRAPHY_SCOPE_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={geographyPart === id}
                className={geographyPart === id ? "active" : ""}
                onClick={() => setGeographyPart(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {segment === "prelims" ? <PrelimsSection /> : null}
      {segment === "mains" ? <MainsSection /> : null}
      {segment === "optionals" ? <OptionalsSection /> : null}
      {segment === "polity" ? <PolitySection /> : null}
      {segment === "history" && historyPart === "ancient_history" ? <AncientHistorySection /> : null}
      {segment === "history" && historyPart === "medieval_history" ? <MedievalHistorySection /> : null}
      {segment === "history" && historyPart === "modern_history" ? <ModernHistorySection /> : null}
      {segment === "history" && historyPart === "world_history" ? <WorldHistorySection /> : null}
      {segment === "geography" && geographyPart === "geography_physical" ? <GeographyPhysicalSection /> : null}
      {segment === "geography" && geographyPart === "geography_india" ? <GeographyIndiaSection /> : null}
      {segment === "geography" && geographyPart === "geography_world" ? <GeographyWorldSection /> : null}
      {segment === "economy" ? <EconomySection /> : null}
      {segment === "agriculture" ? <AgricultureSection /> : null}
      {segment === "environment" ? <EnvironmentSection /> : null}
      {segment === "science_tech" ? <ScienceTechSection /> : null}
      {segment === "society" ? <SocietySection /> : null}
      {segment === "governance" ? <GovernanceSection /> : null}
      {segment === "ethics" ? <EthicsSection /> : null}
      {segment === "international_relations" ? <InternationalRelationsSection /> : null}
    </>
  );
}
