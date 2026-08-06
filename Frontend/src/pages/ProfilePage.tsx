import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { authAPI, advancedStudyPlannerAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  ProfileHeader,
  SettingsCard,
  SettingsRow,
  ToggleSwitch,
  AchievementCard,
  BadgeCard,
  RewardCard,
  SecurityCard,
  DeviceCard,
  BookmarkCard,
  DownloadCard,
  SupportCard,
  ThemeSelector,
  LanguageSelector,
  AccentSelector,
  profilePrefs,
  NOTIFY_LABELS,
  scanSyllabusBookmarks,
  estimateCacheMb,
  type AppearancePrefs,
  type NotifyPrefs,
  type SecurityPrefs,
  type PersonalizationPrefs,
} from "../components/profileExperience";
import {
  Award,
  Bell,
  BookMarked,
  Download,
  Fingerprint,
  HelpCircle,
  Languages,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MonitorSmartphone,
  Palette,
  Pencil,
  Phone,
  Save,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trophy,
  User,
  Users,
  X,
  Zap,
  CalendarDays,
  Clock3,
  GraduationCap,
  BookOpen,
  KeyRound,
  Trash2,
  Info,
} from "lucide-react";

const ATTEMPTS = ["1st", "2nd", "3rd", "4th+"];
const YEAR_OPTIONS = ["2025", "2026", "2027", "2028", "2029", "2030"];
const DAILY_HOURS = ["<2 Hours", "2-3 Hours", "4-6 Hours", "7+ Hours"];
const EDUCATION_OPTIONS = ["Engineering", "Medical", "Arts", "Commerce", "Science", "Law"];
const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

type ProfileForm = {
  name: string;
  phone: string;
  city: string;
  gender: string;
  attempt: string;
  targetYear: string;
  prepStartDate: string;
  dailyStudyHours: string;
  educationBackground: string;
};

type TabId =
  | "overview"
  | "edit"
  | "settings"
  | "notifications"
  | "gamification"
  | "security"
  | "account"
  | "bookmarks"
  | "downloads"
  | "about";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "gamification", label: "Rewards", icon: Trophy },
  { id: "security", label: "Security", icon: Shield },
  { id: "account", label: "Account", icon: KeyRound },
  { id: "bookmarks", label: "Saved", icon: BookMarked },
  { id: "downloads", label: "Offline", icon: Download },
  { id: "about", label: "About", icon: Info },
];

const emptyForm = (): ProfileForm => ({
  name: "",
  phone: "",
  city: "",
  gender: "",
  attempt: "",
  targetYear: "",
  prepStartDate: "",
  dailyStudyHours: "",
  educationBackground: "",
});

const formFromUser = (user: {
  name?: string;
  phone?: string;
  city?: string;
  gender?: string;
  attempt?: string;
  targetYear?: string;
  prepStartDate?: string;
  dailyStudyHours?: string;
  educationBackground?: string;
}): ProfileForm => ({
  name: user.name || "",
  phone: user.phone || "",
  city: user.city || "",
  gender: user.gender || "",
  attempt: user.attempt || "",
  targetYear: user.targetYear || "",
  prepStartDate: user.prepStartDate || "",
  dailyStudyHours: user.dailyStudyHours || "",
  educationBackground: user.educationBackground || "",
});

const selectClass =
  "flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";

const ProfilePage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : "overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const [readiness, setReadiness] = useState<number | undefined>();
  const [badges, setBadges] = useState<{ name: string }[]>([]);

  const [appearance, setAppearance] = useState<AppearancePrefs>(() => profilePrefs.getAppearance());
  const [notify, setNotify] = useState<NotifyPrefs>(() => profilePrefs.getNotify());
  const [security, setSecurity] = useState<SecurityPrefs>(() => profilePrefs.getSecurity());
  const [personal, setPersonal] = useState<PersonalizationPrefs>(() => profilePrefs.getPersonal());
  const [bookmarks, setBookmarks] = useState(() => scanSyllabusBookmarks());
  const [cacheMb, setCacheMb] = useState(() => estimateCacheMb());

  useEffect(() => {
    if (!user) return;
    setForm(formFromUser(user));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await advancedStudyPlannerAPI.getDashboard();
        const data = res.data as {
          plan?: {
            xpPoints?: number;
            currentStreak?: number;
            longestStreak?: number;
            readinessScore?: number;
            badges?: { name: string }[];
          };
          progress?: { streak?: number; longestStreak?: number };
        };
        if (cancelled || !data?.plan) return;
        setXp(data.plan.xpPoints ?? 0);
        setStreak(data.progress?.streak ?? data.plan.currentStreak ?? 0);
        setLongest(data.progress?.longestStreak ?? data.plan.longestStreak ?? 0);
        setReadiness(data.plan.readinessScore);
        setBadges(data.plan.badges || []);
      } catch {
        /* soft-fail — profile still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const goTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === "overview" ? {} : { tab: id }, { replace: true });
    if (id === "edit") {
      if (user) setForm(formFromUser(user));
      setEditing(true);
    } else {
      setEditing(false);
    }
    if (id === "bookmarks") setBookmarks(scanSyllabusBookmarks());
    if (id === "downloads") setCacheMb(estimateCacheMb());
  };

  const cancelEdit = () => {
    if (!user) return;
    setForm(formFromUser(user));
    setEditing(false);
    goTab("overview");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    setSaving(true);
    try {
      await authAPI.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        gender: form.gender,
        attempt: form.attempt,
        targetYear: form.targetYear,
        prepStartDate: form.prepStartDate,
        dailyStudyHours: form.dailyStudyHours,
        educationBackground: form.educationBackground,
      });
      await refreshUser();
      setEditing(false);
      toast.success("Profile updated successfully");
      goTab("overview");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const yearOptions =
    form.targetYear && !YEAR_OPTIONS.includes(form.targetYear)
      ? [form.targetYear, ...YEAR_OPTIONS]
      : YEAR_OPTIONS;

  const level = Math.max(1, Math.floor(xp / 100) + 1);
  const examLabel = `UPSC CSE ${user?.targetYear || "2027"}`;
  const joinedSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : undefined;
  const subscription =
    user?.subscriptionStatus === "active"
      ? user.subscriptionPlan?.name || "Active"
      : "Free";

  const achievements = useMemo(
    () => [
      {
        title: "Daily Login",
        description: "Open the app every day",
        unlocked: streak >= 1,
        progress: Math.min(100, streak * 20),
        icon: CalendarDays,
      },
      {
        title: "Study Streak",
        description: "Maintain a 7-day streak",
        unlocked: streak >= 7,
        progress: Math.min(100, (streak / 7) * 100),
        icon: Zap,
      },
      {
        title: "Fast Learner",
        description: "Earn 100 XP",
        unlocked: xp >= 100,
        progress: Math.min(100, xp),
        icon: Sparkles,
      },
      {
        title: "Century Club",
        description: "Reach Level 2+",
        unlocked: level >= 2,
        progress: Math.min(100, (level / 2) * 100),
        icon: Trophy,
      },
      {
        title: "Perfect Accuracy",
        description: "Score 100% on a practice set",
        unlocked: false,
        progress: 20,
        icon: Target,
      },
      {
        title: "100 Tests",
        description: "Complete 100 practice tests",
        unlocked: false,
        progress: 8,
        icon: Award,
      },
    ],
    [streak, xp, level]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:space-y-5">
      <ProfileHeader
        name={editing ? form.name : user?.name}
        email={user?.email}
        gender={editing ? form.gender : user?.gender}
        examLabel={examLabel}
        level={level}
        xp={xp}
        streak={streak}
        studyHours={user?.dailyStudyHours}
        joinedSince={joinedSince}
        subscription={subscription}
        readiness={readiness}
        actions={
          tab === "edit" || editing ? (
            <>
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving} className="min-h-[44px] gap-2 rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/20">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving} className="min-h-[44px] gap-2 rounded-2xl bg-white text-slate-900 hover:bg-blue-50">
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => goTab("edit")}
              className="min-h-[44px] gap-2 rounded-2xl bg-white text-slate-900 hover:bg-blue-50"
            >
              <Pencil className="h-4 w-4" /> Edit Profile
            </Button>
          )
        }
      />

      {/* Section tabs */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-20 -mx-1 overflow-x-auto scrollbar-hide md:top-0">
        <div className="flex min-w-max gap-1.5 rounded-[20px] border border-slate-200/80 bg-white/95 p-1.5 shadow-soft backdrop-blur-md">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => goTab(t.id)}
                className={`app-chrome-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3 text-[12px] font-bold transition-colors ${
                  active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {tab === "overview" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <RewardCard title="XP" value={String(xp)} icon={Zap} tone="bg-amber-50 text-amber-600" />
                <RewardCard title="Best streak" value={`${longest}d`} icon={Trophy} tone="bg-orange-50 text-orange-600" />
                <RewardCard title="Badges" value={String(badges.length)} icon={Award} tone="bg-violet-50 text-violet-600" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <SettingsCard title="Personal information" description="Name, contact, city" icon={User} onClick={() => goTab("edit")} tone="bg-blue-50 text-blue-600" />
                <SettingsCard title="Academic & exam" description="Attempt, year, study hours" icon={GraduationCap} onClick={() => goTab("edit")} tone="bg-indigo-50 text-indigo-600" />
                <SettingsCard title="Settings" description="Appearance, language, privacy" icon={Settings} onClick={() => goTab("settings")} tone="bg-slate-100 text-slate-600" />
                <SettingsCard title="Notifications" description="Reminders & mute controls" icon={Bell} onClick={() => goTab("notifications")} tone="bg-sky-50 text-sky-600" />
                <SettingsCard title="Achievements" description="XP, badges, missions" icon={Trophy} onClick={() => goTab("gamification")} tone="bg-amber-50 text-amber-600" />
                <SettingsCard title="Security" description="App lock & trusted devices" icon={Shield} onClick={() => goTab("security")} tone="bg-emerald-50 text-emerald-600" />
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Quick facts</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Fact label="Email" value={user?.email} icon={Mail} />
                  <Fact label="Phone" value={user?.phone} icon={Phone} />
                  <Fact label="City" value={user?.city} icon={MapPin} />
                  <Fact label="Gender" value={user?.gender} icon={Users} />
                  <Fact label="Attempt" value={user?.attempt} icon={Target} />
                  <Fact label="Education" value={user?.educationBackground} icon={BookOpen} />
                </div>
              </div>
            </>
          ) : null}

          {tab === "edit" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <EditPanel title="Personal information">
                <EditField label="Full name" icon={User}>
                  <Input value={form.name} onChange={(e) => setField("name", e.target.value)} className="h-11 rounded-2xl" placeholder="Your full name" />
                </EditField>
                <EditField label="Email" icon={Mail}>
                  <Input value={user?.email || ""} disabled className="h-11 rounded-2xl" />
                  <p className="text-[11px] text-slate-400">Email cannot be changed</p>
                </EditField>
                <EditField label="Gender" icon={Users}>
                  <select className={selectClass} value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Phone" icon={Phone}>
                  <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="h-11 rounded-2xl" placeholder="Phone number" />
                </EditField>
                <EditField label="State / City" icon={MapPin}>
                  <Input value={form.city} onChange={(e) => setField("city", e.target.value)} className="h-11 rounded-2xl" placeholder="City" />
                </EditField>
              </EditPanel>
              <EditPanel title="Exam preferences">
                <EditField label="Attempt" icon={Target}>
                  <select className={selectClass} value={form.attempt} onChange={(e) => setField("attempt", e.target.value)}>
                    <option value="">Select attempt</option>
                    {ATTEMPTS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Target year" icon={BookOpen}>
                  <select className={selectClass} value={form.targetYear} onChange={(e) => setField("targetYear", e.target.value)}>
                    <option value="">Select year</option>
                    {yearOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Prep start date" icon={CalendarDays}>
                  <Input type="date" value={form.prepStartDate} onChange={(e) => setField("prepStartDate", e.target.value)} className="h-11 rounded-2xl" />
                </EditField>
                <EditField label="Daily study goal" icon={Clock3}>
                  <select className={selectClass} value={form.dailyStudyHours} onChange={(e) => setField("dailyStudyHours", e.target.value)}>
                    <option value="">Select hours</option>
                    {DAILY_HOURS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </EditField>
                <EditField label="Education" icon={GraduationCap}>
                  <select className={selectClass} value={form.educationBackground} onChange={(e) => setField("educationBackground", e.target.value)}>
                    <option value="">Select background</option>
                    {EDUCATION_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </EditField>
              </EditPanel>
            </div>
          ) : null}

          {tab === "settings" ? (
            <div className="space-y-3">
              <SettingsCard title="Appearance" description="Theme, accent, density" icon={Palette} tone="bg-violet-50 text-violet-600">
                <SettingsRow label="Theme" hint="Preference saved on this device">
                  <div className="w-[200px]">
                    <ThemeSelector
                      value={appearance.theme}
                      onChange={(theme) => {
                        const next = { ...appearance, theme };
                        setAppearance(next);
                        profilePrefs.setAppearance(next);
                        if (theme === "system") {
                          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                          setTheme(prefersDark ? "dark" : "light");
                        } else {
                          setTheme(theme);
                        }
                        toast.success("Appearance preference saved");
                      }}
                    />
                  </div>
                </SettingsRow>
                <SettingsRow label="Accent color">
                  <AccentSelector
                    value={appearance.accent}
                    onChange={(accent) => {
                      const next = { ...appearance, accent };
                      setAppearance(next);
                      profilePrefs.setAppearance(next);
                    }}
                  />
                </SettingsRow>
                <SettingsRow label="Font size">
                  <Segmented
                    value={appearance.fontSize}
                    options={[
                      { id: "sm", label: "S" },
                      { id: "md", label: "M" },
                      { id: "lg", label: "L" },
                    ]}
                    onChange={(fontSize) => {
                      const next = { ...appearance, fontSize: fontSize as AppearancePrefs["fontSize"] };
                      setAppearance(next);
                      profilePrefs.setAppearance(next);
                    }}
                  />
                </SettingsRow>
                <SettingsRow label="Animations">
                  <ToggleSwitch
                    label="Animations"
                    checked={appearance.animations}
                    onChange={(animations) => {
                      const next = { ...appearance, animations };
                      setAppearance(next);
                      profilePrefs.setAppearance(next);
                    }}
                  />
                </SettingsRow>
                <SettingsRow label="Compact mode">
                  <ToggleSwitch
                    label="Compact mode"
                    checked={appearance.compact}
                    onChange={(compact) => {
                      const next = { ...appearance, compact };
                      setAppearance(next);
                      profilePrefs.setAppearance(next);
                    }}
                  />
                </SettingsRow>
              </SettingsCard>

              <SettingsCard title="Language & personalization" description="App language preferences" icon={Languages} tone="bg-indigo-50 text-indigo-600">
                <LanguageSelector
                  value={personal.language}
                  onChange={(language) => {
                    const next = { ...personal, language };
                    setPersonal(next);
                    profilePrefs.setPersonal(next);
                    toast.success("Language preference saved");
                  }}
                />
                <p className="mt-2 text-[11px] font-medium text-slate-500">
                  Exam language still follows per-test controls. This sets your dashboard preference.
                </p>
              </SettingsCard>

              <SettingsCard title="Privacy" description="Control what stays on device" icon={Lock} tone="bg-slate-100 text-slate-600" onClick={() => goTab("security")} />
              <SettingsCard title="Notifications" description="Allow, mute, schedule" icon={Bell} tone="bg-sky-50 text-sky-600" onClick={() => goTab("notifications")} />
              <SettingsCard title="Downloads" description="Offline storage & cache" icon={Download} tone="bg-cyan-50 text-cyan-600" onClick={() => goTab("downloads")} />
              <SettingsCard title="Accessibility" description="Large targets & labels enabled" icon={Sparkles} tone="bg-emerald-50 text-emerald-600">
                <p className="text-[12px] font-medium text-slate-600">
                  Touch targets are 44–48px, ARIA labels on controls, keyboard-friendly tabs.
                </p>
              </SettingsCard>
              <SettingsCard title="Support" description="Help, WhatsApp, feedback" icon={HelpCircle} tone="bg-rose-50 text-rose-600" onClick={() => navigate("/help-support")} />
              <SettingsCard title="About MentorsDaily" description="Version & legal" icon={Info} tone="bg-blue-50 text-blue-600" onClick={() => goTab("about")} />
            </div>
          ) : null}

          {tab === "notifications" ? (
            <div className="space-y-3">
              <div className="rounded-[20px] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-soft">
                <p className="text-[13px] font-bold text-slate-900">Smart notifications</p>
                <p className="mt-1 text-[12px] font-medium text-slate-500">
                  Preferences are stored on this device. Push delivery is ready for Capacitor when enabled.
                </p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-2 shadow-soft">
                {NOTIFY_LABELS.map((n) => (
                  <SettingsRow key={n.key} label={n.label} hint={n.hint}>
                    <ToggleSwitch
                      label={n.label}
                      checked={!!notify[n.key]}
                      onChange={(checked) => {
                        const next = { ...notify, [n.key]: checked };
                        setNotify(next);
                        profilePrefs.setNotify(next);
                      }}
                    />
                  </SettingsRow>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "gamification" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <RewardCard title="XP" value={String(xp)} icon={Zap} tone="bg-amber-50 text-amber-600" />
                <RewardCard title="Level" value={`Lv ${level}`} icon={Trophy} tone="bg-blue-50 text-blue-600" />
                <RewardCard title="Streak" value={`${streak}d`} icon={Zap} tone="bg-orange-50 text-orange-600" />
                <RewardCard title="Coins" value="—" icon={Award} tone="bg-violet-50 text-violet-600" />
              </div>
              <div>
                <h2 className="mb-2 text-[13px] font-extrabold text-slate-900">Achievements</h2>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {achievements.map((a) => (
                    <AchievementCard key={a.title} {...a} />
                  ))}
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-[13px] font-extrabold text-slate-900">Badges</h2>
                {badges.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {badges.map((b, i) => (
                      <BadgeCard key={`${b.name}-${i}`} name={b.name} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No badges yet" body="Complete planner tasks to unlock badges." />
                )}
              </div>
              <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="text-[12px] font-bold text-slate-700">Daily · Weekly · Monthly missions</p>
                <p className="mt-1 text-[12px] font-medium text-slate-500">
                  Missions sync with your Study Planner progress. Open Planner to complete today’s tasks.
                </p>
                <Button type="button" className="mt-3 min-h-[44px] rounded-2xl" onClick={() => navigate("/planner")}>
                  Open Study Planner
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "security" ? (
            <div className="space-y-3">
              <SecurityCard
                title="App lock"
                description="Require unlock when returning to the app."
                ready={security.appLock}
                icon={Lock}
                action={
                  <ToggleSwitch
                    label="App lock"
                    checked={security.appLock}
                    onChange={(appLock) => {
                      const next = { ...security, appLock };
                      setSecurity(next);
                      profilePrefs.setSecurity(next);
                      toast.message(appLock ? "App lock preference enabled (device-ready)" : "App lock off");
                    }}
                  />
                }
              />
              <SecurityCard
                title="PIN"
                description="Local PIN preference for Capacitor App Lock."
                ready={security.pinReady}
                icon={KeyRound}
                action={
                  <ToggleSwitch
                    label="PIN ready"
                    checked={security.pinReady}
                    onChange={(pinReady) => {
                      const next = { ...security, pinReady };
                      setSecurity(next);
                      profilePrefs.setSecurity(next);
                    }}
                  />
                }
              />
              <SecurityCard
                title="Biometric / Face / Fingerprint"
                description="Architecture ready for Capacitor Biometric Auth — no credentials leave the device."
                ready={security.biometricReady}
                icon={Fingerprint}
                action={
                  <ToggleSwitch
                    label="Biometric ready"
                    checked={security.biometricReady}
                    onChange={(biometricReady) => {
                      const next = { ...security, biometricReady };
                      setSecurity(next);
                      profilePrefs.setSecurity(next);
                      void import("../security/secureStorage").then(({ biometricReady: bio }) =>
                        bio.setEnabled(biometricReady)
                      );
                    }}
                  />
                }
              />
              <div>
                <h2 className="mb-2 text-[13px] font-extrabold text-slate-900">Trusted devices</h2>
                <div className="space-y-2">
                  <DeviceCard name="This browser / device" detail="Active session · MentorsDaily" current />
                  <DeviceCard name="Linked devices" detail="Full device list arrives with session API" />
                </div>
              </div>
            </div>
          ) : null}

          {tab === "account" ? (
            <div className="space-y-3">
              <SettingsCard title="Email" description={user?.email || "—"} icon={Mail} tone="bg-blue-50 text-blue-600" />
              <SettingsCard title="Phone" description={user?.phone || "Not provided"} icon={Phone} tone="bg-sky-50 text-sky-600" onClick={() => goTab("edit")} />
              <SettingsCard
                title="Password"
                description="Change your account password"
                icon={KeyRound}
                tone="bg-amber-50 text-amber-600"
                onClick={() => navigate("/change-password")}
              />
              <SettingsCard title="Sessions" description="Manage signed-in sessions" icon={MonitorSmartphone} tone="bg-slate-100 text-slate-600" onClick={() => goTab("security")} />
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px] w-full gap-2 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  logout();
                }}
              >
                <LogOut className="h-4 w-4" /> Log out
              </Button>
              <button
                type="button"
                className="app-chrome-btn flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-bold text-slate-500"
                onClick={() => toast.message("Contact support to delete your account securely.")}
              >
                <Trash2 className="h-4 w-4" /> Delete account
              </button>
            </div>
          ) : null}

          {tab === "bookmarks" ? (
            <div className="space-y-3">
              <p className="text-[12px] font-medium text-slate-500">
                Syllabus bookmarks saved on this device. Notes / CA / tests bookmarks expand as you save them in-app.
              </p>
              {bookmarks.length === 0 ? (
                <EmptyState title="No bookmarks yet" body="Star topics in Syllabus to see them here." />
              ) : (
                bookmarks.map((b) => (
                  <BookmarkCard
                    key={b.key}
                    title={b.title}
                    type="Syllabus topic"
                    onOpen={() => navigate("/syllabus")}
                    onRemove={() => {
                      localStorage.removeItem(b.key);
                      setBookmarks(scanSyllabusBookmarks());
                      toast.success("Bookmark removed");
                    }}
                  />
                ))
              )}
            </div>
          ) : null}

          {tab === "downloads" ? (
            <div className="space-y-3">
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Storage</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">~{cacheMb} MB</p>
                <p className="text-[12px] font-medium text-slate-500">Estimated local cache (prefs, bookmarks)</p>
              </div>
              <DownloadCard title="Offline notes" status="Architecture ready" />
              <DownloadCard title="Offline videos" status="Architecture ready" />
              <DownloadCard title="Downloaded PDFs" status="Architecture ready" />
              <DownloadCard title="Current Affairs pack" status="Architecture ready" />
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px] w-full rounded-2xl"
                onClick={() => {
                  setCacheMb(estimateCacheMb());
                  toast.success("Cache estimate refreshed");
                }}
              >
                Refresh storage estimate
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px] w-full rounded-2xl text-rose-600"
                onClick={() => {
                  toast.message("App preferences kept. Use device settings to clear full browser cache.");
                }}
              >
                Clear cache guidance
              </Button>
            </div>
          ) : null}

          {tab === "about" ? (
            <div className="space-y-3">
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-soft">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">MentorsDaily</p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900">Student Dashboard</h2>
                <p className="mt-1 text-[13px] font-medium text-slate-500">Version 1.0 · Capacitor ready</p>
              </div>
              <SupportCard title="Help & Support" description="FAQ, WhatsApp, live chat" icon={HelpCircle} onClick={() => navigate("/help-support")} />
              <SupportCard title="WhatsApp Support" description="+91 87662 33193" icon={MessageCircle} href={`https://wa.me/918766233193?text=${encodeURIComponent("Hi! I have a question about MentorsDaily.")}`} />
              <SupportCard title="Terms of use" description="Legal terms" icon={BookOpen} href="/about" />
              <SupportCard title="Privacy" description="How we protect your data" icon={Shield} href="/about" />
              <SupportCard title="Rate the app" description="Share feedback on Play Store (when live)" icon={Trophy} onClick={() => toast.message("Thanks! Rating opens when the Play listing is live.")} />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

function Fact({ label, value, icon: Icon }: { label: string; value?: string; icon: React.ElementType }) {
  return (
    <div className="flex min-h-[48px] items-start gap-2.5 rounded-2xl bg-slate-50 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 text-blue-600" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-[13px] font-semibold text-slate-800">{value?.trim() ? value : "Not provided"}</p>
      </div>
    </div>
  );
}

function EditPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
      <h2 className="mb-3 text-[14px] font-extrabold text-slate-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EditField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <Icon className="mt-2.5 h-4 w-4 shrink-0 text-blue-600" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-bold text-slate-500">{label}</p>
        {children}
      </div>
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`app-chrome-btn min-h-[36px] min-w-[36px] rounded-xl px-2.5 text-[12px] font-bold ${
            value === o.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-[12px] font-medium text-slate-500">{body}</p>
    </div>
  );
}

export default ProfilePage;
