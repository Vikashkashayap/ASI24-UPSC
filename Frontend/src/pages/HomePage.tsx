import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState({ days: "000", hours: "00", mins: "00", secs: "00", progress: 0 });
  const [isDartSubmitted, setIsDartSubmitted] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  const targetYear = Number(user?.targetYear) || new Date().getFullYear() + 1;
  const examDate = useMemo(() => new Date(`${targetYear}-05-25T09:00:00`), [targetYear]);
  const joinDate = user?.createdAt ? new Date(user.createdAt) : new Date();
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const studentName = user?.name || "Student";
  const daysSinceJoin = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyHours = parseDailyHours(user?.dailyStudyHours);
  const daysLeftForPrelims = Number(countdown.days) || 0;
  const preparationPhase = getPreparationPhase(daysLeftForPrelims);

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
      meta: `${dayText} • ${timeText} • ${duration} mins`,
      phaseLabel:
        preparationPhase === "revision"
          ? "Revision Phase"
          : preparationPhase === "balanced"
            ? "Balanced Phase"
            : "Foundation Phase",
    };
  }, [dailyHours, preparationPhase, user?.educationBackground]);

  return (
    <div className="student-dashboard-page">
      <div className="sd-hero-row">
        <div className="sd-hero-text">
          <h1>{greeting}, {studentName.split(" ")[0]}</h1>
          <p>You joined {daysSinceJoin} days ago. Target UPSC CSE {targetYear}.</p>
        </div>
        <div className="sd-countdown-card">
          <div className="sd-eyebrow">Exam Countdown</div>
          <div className="sd-exam-label">UPSC Prelims {targetYear} • 25 May {targetYear}</div>
          <div className="sd-countdown-grid">
            <div><strong>{countdown.days}</strong><span>Days</span></div>
            <div><strong>{countdown.hours}</strong><span>Hrs</span></div>
            <div><strong>{countdown.mins}</strong><span>Mins</span></div>
            <div><strong>{countdown.secs}</strong><span>Secs</span></div>
          </div>
          <div className="sd-progress"><div style={{ width: `${countdown.progress}%` }} /></div>
          <p>{Math.round(countdown.progress)}% elapsed • {countdown.days} days left</p>
        </div>
      </div>

      <div className="sd-strip">
        <div className="sd-strip-item"><span>🔥</span><div><b>Study Streak</b><p>14 days</p></div></div>
        <div className="sd-strip-item"><span>⏱️</span><div><b>Today's Hours</b><p>3.5 / 6 hrs</p></div></div>
        <div className="sd-strip-item"><span>📆</span><div><b>Today</b><p>{todayLabel}</p></div></div>
        <div className="sd-strip-item">
          {!isDartSubmitted ? (
            <button onClick={() => setIsDartSubmitted(true)}>Fill Today&apos;s DART</button>
          ) : (
            <span className="sd-done">DART Submitted</span>
          )}
        </div>
      </div>

      <div className="sd-grid">
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

        <div className="sd-right">
          <div className="sd-card">
            <div className="sd-card-hd"><h3>AI Mentor</h3><small>AI Live</small></div>
            <div className="sd-chat">
              <div className="ai">Want a quick revision on Repo vs Reverse Repo?</div>
              <div className="me">Yes, explain inflation impact.</div>
            </div>
            <button className="full" onClick={() => setShowMentorModal(true)}>Open Mentor Chat</button>
          </div>
          <div className="sd-card">
            <div className="sd-card-hd"><h3>Mains Evaluation</h3></div>
            <p>Ethics Case Study — Evaluated 12.5 / 25</p>
            <p>IR Indo-Pacific — In Review</p>
            <button className="full" onClick={() => navigate("/evaluation-history")}>View All</button>
          </div>
          <div className="sd-card session">
            <h3>Upcoming Session</h3>
            <p>{upcomingSession.title}</p>
            <small>{upcomingSession.meta}</small>
            <small>{upcomingSession.phaseLabel}</small>
          </div>
        </div>
      </div>

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

