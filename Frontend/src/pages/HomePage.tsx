import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import { SyllabusTargetsPanel } from "../components/SyllabusTargetsPanel";
import { MentorChatPage } from "./MentorChatPage";
import { useAuth } from "../hooks/useAuth";
import "./homePage.css";

function getGreetingByHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
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

function getPreparationPhase(daysLeft: number) {
  if (daysLeft <= 120) return "revision";
  if (daysLeft <= 240) return "balanced";
  return "foundation";
}

const phaseLabels: Record<string, { label: string; tone: string }> = {
  revision: { label: "Revision Phase", tone: "sd-phase-revision" },
  balanced: { label: "Balanced Phase", tone: "sd-phase-balanced" },
  foundation: { label: "Foundation Phase", tone: "sd-phase-foundation" },
};

export const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState({ days: "000", hours: "00", mins: "00", secs: "00", progress: 0 });
  const [isDartSubmitted, setIsDartSubmitted] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  const targetYear = Number(user?.targetYear) || new Date().getFullYear() + 1;
  const examDate = useMemo(() => new Date(`${targetYear}-05-25T09:00:00`), [targetYear]);
  const joinDate = useMemo(
    () => (user?.createdAt ? new Date(user.createdAt) : new Date()),
    [user?.createdAt],
  );
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const studentName = user?.name || "Student";
  const firstName = studentName.split(" ")[0];
  const daysSinceJoin = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyHours = parseDailyHours(user?.dailyStudyHours);
  const dailyGoal = Math.max(4, Math.round(dailyHours));
  const todayHoursDone = 3.5;
  const hoursProgress = Math.min(100, Math.round((todayHoursDone / dailyGoal) * 100));
  const daysLeftForPrelims = Number(countdown.days) || 0;
  const preparationPhase = getPreparationPhase(daysLeftForPrelims);
  const phaseMeta = phaseLabels[preparationPhase];

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const left = examDate.getTime() - now.getTime();
      const total = examDate.getTime() - joinDate.getTime();

      if (left <= 0) {
        setCountdown({ days: "000", hours: "00", mins: "00", secs: "00", progress: 100 });
        return;
      }

      const days = Math.floor(left / 86400000);
      const hours = Math.floor((left % 86400000) / 3600000);
      const mins = Math.floor((left % 3600000) / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      const progress = total > 0 ? Math.min(100, Number((((total - left) / total) * 100).toFixed(1))) : 0;

      setCountdown({
        days: String(days).padStart(3, "0"),
        hours: String(hours).padStart(2, "0"),
        mins: String(mins).padStart(2, "0"),
        secs: String(secs).padStart(2, "0"),
        progress,                                                                                        
      });
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [examDate, joinDate]);

  useEffect(() => {
    if (!showMentorModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showMentorModal]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentHour(new Date().getHours()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = getGreetingByHour(currentHour);
  const upcomingSession = useMemo(() => {
    const background = (user?.educationBackground || "General Studies").trim();
    const subjectLabel = background === "Arts" ? "History" : background;
    const isFastTrack = dailyHours >= 6;
    const duration = isFastTrack ? 120 : dailyHours >= 4 ? 90 : 60;
    const phaseTopicMap: Record<string, string> = {
      revision: `${subjectLabel} Revision + PYQ Drill`,
      balanced: `${subjectLabel} Concept + MCQ Practice`,
      foundation: `${subjectLabel} Basics Deep Dive`,
    };

    const now = new Date();
    const sessionDate = new Date(now);
    sessionDate.setDate(now.getDate() + 1);
    sessionDate.setHours(isFastTrack ? 6 : 19, 0, 0, 0);

    const dayText = new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(sessionDate);
    const timeText = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(sessionDate);

    return {
      title: phaseTopicMap[preparationPhase],
      meta: `${dayText} · ${timeText} · ${duration} mins`,
    };
  }, [dailyHours, preparationPhase, user?.educationBackground]);

  return (
    <div className="student-dashboard-page">
      <section className="sd-hero-row">
        <div className="sd-hero-text">
          <span className={`sd-phase-badge ${phaseMeta.tone}`}>{phaseMeta.label}</span>
          <h1>
            {greeting},{" "}
            <span className="sd-name-highlight">{firstName}</span>
          </h1>
          <p>
            Day {daysSinceJoin} of your journey · Target UPSC CSE {targetYear}
          </p>
        </div>

        <div className="sd-countdown-card">
          <div className="sd-countdown-top">
            <div>
              <div className="sd-eyebrow">Exam Countdown</div>
              <div className="sd-exam-label">UPSC Prelims {targetYear}</div>
              <div className="sd-exam-date">25 May {targetYear}</div>
            </div>
            <div className="sd-countdown-ring" style={{ "--sd-progress": countdown.progress } as React.CSSProperties}>
              <span>{Math.round(countdown.progress)}%</span>
            </div>
          </div>
          <div className="sd-countdown-grid">
            <div><strong>{countdown.days}</strong><span>Days</span></div>
            <div><strong>{countdown.hours}</strong><span>Hrs</span></div>
            <div><strong>{countdown.mins}</strong><span>Mins</span></div>
            <div><strong>{countdown.secs}</strong><span>Secs</span></div>
          </div>
          <div className="sd-progress">
            <div style={{ width: `${countdown.progress}%` }} />
          </div>
          <p>{Math.round(countdown.progress)}% elapsed · {Number(countdown.days)} days left</p>
        </div>
      </section>

      <section className="sd-stats-grid">
        <article className="sd-stat-card sd-stat-streak">
          <div className="sd-stat-icon"><Flame className="sd-stat-svg" /></div>
          <div>
            <span className="sd-stat-label">Study Streak</span>
            <strong className="sd-stat-value">14 days</strong>
          </div>
        </article>

        <article className="sd-stat-card sd-stat-hours">
          <div className="sd-stat-icon"><Clock className="sd-stat-svg" /></div>
          <div className="sd-stat-body">
            <span className="sd-stat-label">Today&apos;s Hours</span>
            <strong className="sd-stat-value">{todayHoursDone} / {dailyGoal} hrs</strong>
            <div className="sd-stat-bar"><div style={{ width: `${hoursProgress}%` }} /></div>
          </div>
        </article>

        <article className="sd-stat-card sd-stat-date">
          <div className="sd-stat-icon"><CalendarDays className="sd-stat-svg" /></div>
          <div>
            <span className="sd-stat-label">Today</span>
            <strong className="sd-stat-value">{todayLabel}</strong>
          </div>
        </article>

        <article className="sd-stat-card sd-stat-dart">
          {!isDartSubmitted ? (
            <button type="button" className="sd-dart-btn" onClick={() => setIsDartSubmitted(true)}>
              <Target className="sd-stat-svg" />
              <span>Fill Today&apos;s DART</span>
              <ArrowRight className="sd-dart-arrow" />
            </button>
          ) : (
            <div className="sd-dart-done">
              <CheckCircle2 className="sd-stat-svg" />
              <span>DART Submitted</span>
            </div>
          )}
        </article>
      </section>

      <section className="sd-grid">
        <div className="sd-card sd-syllabus-card">
          <SyllabusTargetsPanel
            todayLabel={todayLabel}
            studentProfile={{
              targetYear: user?.targetYear,
              prepStartDate: user?.prepStartDate,
              dailyStudyHours: user?.dailyStudyHours,
              educationBackground: user?.educationBackground,
            }}
          />
        </div>

        <aside className="sd-right">
          <div className="sd-card sd-mentor-card">
            <div className="sd-card-hd">
              <div className="sd-card-title-wrap">
                <span className="sd-card-icon sd-card-icon-ai"><Sparkles className="sd-card-svg" /></span>
                <div>
                  <h3>AI Mentor</h3>
                  <small>Ask doubts anytime</small>
                </div>
              </div>
              <span className="sd-live-badge">Live</span>
            </div>
            <div className="sd-chat">
              <div className="ai">
                <MessageCircle className="sd-chat-icon" />
                <span>Want a quick revision on Repo vs Reverse Repo?</span>
              </div>
              <div className="me">
                <span>Yes, explain inflation impact.</span>
              </div>
            </div>
            <button type="button" className="full sd-mentor-btn" onClick={() => setShowMentorModal(true)}>
              Open Mentor Chat
            </button>
          </div>

          <div className="sd-card sd-eval-card">
            <div className="sd-card-hd">
              <div className="sd-card-title-wrap">
                <span className="sd-card-icon sd-card-icon-eval"><FileText className="sd-card-svg" /></span>
                <div>
                  <h3>Mains Evaluation</h3>
                  <small>Recent submissions</small>
                </div>
              </div>
            </div>
            <ul className="sd-eval-list">
              <li>
                <div>
                  <strong>Ethics Case Study</strong>
                  <span>Evaluated</span>
                </div>
                <b>12.5 / 25</b>
              </li>
              <li>
                <div>
                  <strong>IR Indo-Pacific</strong>
                  <span className="pending">In Review</span>
                </div>
              </li>
            </ul>
            <button type="button" className="full sd-outline-btn" onClick={() => navigate("/evaluation-history")}>
              View All
            </button>
          </div>

          <div className="sd-card session">
            <div className="sd-session-icon"><CalendarClock className="sd-card-svg" /></div>
            <span className="sd-session-label">Upcoming Session</span>
            <h3>{upcomingSession.title}</h3>
            <p>{upcomingSession.meta}</p>
            <span className={`sd-phase-badge ${phaseMeta.tone} sd-phase-badge-light`}>{phaseMeta.label}</span>
          </div>
        </aside>
      </section>

      {showMentorModal ? (
        <div className="sd-mentor-overlay" role="dialog" aria-modal="true" aria-label="AI Mentor Chat">
          <div className="sd-mentor-modal">
            <div className="sd-mentor-modal-hd">
              <h3>AI Mentor</h3>
              <button type="button" className="sd-mentor-close" onClick={() => setShowMentorModal(false)}>
                Close
              </button>
            </div>
            <div className="sd-mentor-modal-body">
              <MentorChatPage />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
