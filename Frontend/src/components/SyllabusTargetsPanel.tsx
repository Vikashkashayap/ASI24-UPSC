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
  primary_book?: string | { chapter_name?: string; title?: string; book_title?: string };
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

type Segment =
  | "prelims"
  | "mains"
  | "optionals"
  | "polity"
  | "ancient_history"
  | "medieval_history"
  | "modern_history"
  | "world_history"
  | "geography_physical"
  | "geography_india";

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
  if (normalized.includes("arts")) return "modern_history";
  if (normalized.includes("engineering")) return "polity";
  if (normalized.includes("science")) return "geography_physical";
  if (normalized.includes("medical")) return "geography_india";
  if (normalized.includes("commerce")) return "prelims";
  if (normalized.includes("law")) return "mains";
  return "prelims";
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
  if (typeof topic.primary_book === "object" && topic.primary_book?.chapter_name) return topic.primary_book.chapter_name;
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

type Props = { todayLabel: string };

export function SyllabusTargetsPanel({ todayLabel, studentProfile }: Props & { studentProfile?: StudentProfile }) {
  const [segment, setSegment] = useState<Segment>(recommendedSegmentByBackground(studentProfile?.educationBackground));
  const meta = syllabusData.meta as { description?: string; last_updated?: string; version?: string };
  const polityMeta = polityData.meta as { version?: string };
  const ancientMeta = ancientHistoryData.meta as { version?: string };
  const medievalMeta = medievalHistoryData.meta as { version?: string; last_updated?: string };
  const modernMeta = modernHistoryData.meta as { version?: string; last_updated?: string };
  const worldMeta = worldHistoryData.meta as { version?: string };
  const geographyPhysicalMeta = geographyPhysicalData.metadata as { version?: string; created_date?: string };
  const geographyIndiaMeta = geographyIndiaData.metadata as { created_date?: string };
  const dailyHours = parseDailyHours(studentProfile?.dailyStudyHours);
  const prelimsDate = estimatePrelimsDate(studentProfile?.targetYear);
  const daysLeft = daysUntil(prelimsDate);
  const preparationMode = daysLeft <= 120 ? "revision-heavy" : daysLeft <= 240 ? "balanced coverage" : "foundation-heavy";
  const dailyTargetsCount = Math.max(2, Math.min(6, Math.round(dailyHours)));

  const subtitle = useMemo(() => {
    if (segment === "prelims") return "Prelims — GS Paper I & CSAT (full topic tree)";
    if (segment === "mains") return "Mains — GS I–IV & Essay (official-style modules)";
    if (segment === "polity") return "Polity — Prelims + GS II mapped for quick access";
    if (segment === "ancient_history") return "Ancient History — module-wise full syllabus view";
    if (segment === "medieval_history") return "Medieval History — module-wise full syllabus view";
    if (segment === "modern_history") return "Modern History — module-wise full syllabus view";
    if (segment === "world_history") return "World History — module-wise full syllabus view";
    if (segment === "geography_physical") return "Physical Geography — module-wise full syllabus view";
    if (segment === "geography_india") return "Indian Geography — module-wise full syllabus view";
    return "Popular optionals — Paper I & II outlines";
  }, [segment]);

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
            : segment === "ancient_history"
              ? `Ancient v${ancientMeta.version ?? "1.x"}`
              : segment === "medieval_history"
                ? `Medieval v${medievalMeta.version ?? "1.x"}${medievalMeta.last_updated ? ` · ${medievalMeta.last_updated}` : ""}`
                : segment === "modern_history"
                  ? `Modern v${modernMeta.version ?? "1.x"}${modernMeta.last_updated ? ` · ${modernMeta.last_updated}` : ""}`
                  : segment === "world_history"
                    ? `World v${worldMeta.version ?? "1.x"}`
                    : segment === "geography_physical"
                      ? `Physical Geography v${geographyPhysicalMeta.version ?? "1.x"}${geographyPhysicalMeta.created_date ? ` · ${geographyPhysicalMeta.created_date}` : ""}`
                      : segment === "geography_india"
                        ? `Indian Geography v1.x${geographyIndiaMeta.created_date ? ` · ${geographyIndiaMeta.created_date}` : ""}`
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
            ["ancient_history", "Ancient"],
            ["medieval_history", "Medieval"],
            ["modern_history", "Modern"],
            ["world_history", "World"],
            ["geography_physical", "Geo Physical"],
            ["geography_india", "Geo India"],
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

      {segment === "prelims" ? <PrelimsSection /> : null}
      {segment === "mains" ? <MainsSection /> : null}
      {segment === "optionals" ? <OptionalsSection /> : null}
      {segment === "polity" ? <PolitySection /> : null}
      {segment === "ancient_history" ? <AncientHistorySection /> : null}
      {segment === "medieval_history" ? <MedievalHistorySection /> : null}
      {segment === "modern_history" ? <ModernHistorySection /> : null}
      {segment === "world_history" ? <WorldHistorySection /> : null}
      {segment === "geography_physical" ? <GeographyPhysicalSection /> : null}
      {segment === "geography_india" ? <GeographyIndiaSection /> : null}
    </>
  );
}
