import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { authAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { GenderAvatar } from "../components/GenderAvatar";
import {
  Mail,
  Phone,
  MapPin,
  Target,
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  User,
  Pencil,
  X,
  Save,
  Users,
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

const FieldRow = ({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  theme: "light" | "dark";
}) => (
  <div
    className={`flex items-start gap-3 rounded-lg border p-3 ${
      theme === "dark" ? "border-slate-200/20 bg-slate-900/20" : "border-slate-200 bg-slate-50"
    }`}
  >
    <div className="mt-0.5">{icon}</div>
    <div>
      <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
      <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
        {value?.trim() ? value : "Not provided"}
      </p>
    </div>
  </div>
);

const EditField = ({
  icon,
  label,
  theme,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  theme: "light" | "dark";
  children: React.ReactNode;
}) => (
  <div
    className={`flex items-start gap-3 rounded-lg border p-3 ${
      theme === "dark" ? "border-slate-200/20 bg-slate-900/20" : "border-slate-200 bg-slate-50"
    }`}
  >
    <div className="mt-2.5">{icon}</div>
    <div className="min-w-0 flex-1 space-y-1.5">
      <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
      {children}
    </div>
  </div>
);

const selectClass = (theme: "light" | "dark") =>
  `flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
    theme === "dark"
      ? "border-slate-600 bg-slate-900/60 text-slate-100"
      : "border-slate-200 bg-white text-slate-900"
  }`;

const inputClass = (theme: "light" | "dark") =>
  theme === "dark"
    ? "border-slate-600 bg-slate-900/60 text-slate-100 placeholder:text-slate-500"
    : "";

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  const iconCls = theme === "dark" ? "text-blue-300" : "text-blue-600";
  const displayName = editing ? form.name : user?.name;
  const displayGender = editing ? form.gender : user?.gender;

  useEffect(() => {
    if (!user) return;
    setForm(formFromUser(user));
  }, [user]);

  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startEdit = () => {
    if (!user) return;
    setForm(formFromUser(user));
    setEditing(true);
  };

  const cancelEdit = () => {
    if (!user) return;
    setForm(formFromUser(user));
    setEditing(false);
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div
        className={`rounded-2xl border p-6 ${
          theme === "dark"
            ? "border-blue-500/20 bg-gradient-to-r from-[#0b1a3b] to-[#0b1530]"
            : "border-blue-200 bg-gradient-to-r from-white to-blue-50"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <GenderAvatar gender={displayGender} name={displayName} size="md" />
            <div>
              <h1 className="text-2xl font-bold">{displayName || "Student Profile"}</h1>
              <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!editing ? (
              <Button type="button" variant="outline" onClick={startEdit} className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={theme === "dark" ? "border-blue-500/20 bg-[#09162f]" : ""}>
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
            <CardDescription>
              {editing ? "Update your basic account details." : "Basic details from your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <EditField icon={<User className={`h-4 w-4 ${iconCls}`} />} label="Full Name" theme={theme}>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className={inputClass(theme)}
                    placeholder="Your full name"
                  />
                </EditField>
                <EditField icon={<Mail className={`h-4 w-4 ${iconCls}`} />} label="Email" theme={theme}>
                  <Input value={user?.email || ""} disabled className={inputClass(theme)} />
                  <p className={`text-[11px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
                    Email cannot be changed
                  </p>
                </EditField>
                <EditField icon={<Users className={`h-4 w-4 ${iconCls}`} />} label="Gender" theme={theme}>
                  <select
                    className={selectClass(theme)}
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </EditField>
                <EditField icon={<Phone className={`h-4 w-4 ${iconCls}`} />} label="Phone" theme={theme}>
                  <Input
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    className={inputClass(theme)}
                    placeholder="Phone number"
                  />
                </EditField>
                <EditField icon={<MapPin className={`h-4 w-4 ${iconCls}`} />} label="City" theme={theme}>
                  <Input
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    className={inputClass(theme)}
                    placeholder="City"
                  />
                </EditField>
              </>
            ) : (
              <>
                <FieldRow icon={<User className={`h-4 w-4 ${iconCls}`} />} label="Full Name" value={user?.name} theme={theme} />
                <FieldRow icon={<Mail className={`h-4 w-4 ${iconCls}`} />} label="Email" value={user?.email} theme={theme} />
                <FieldRow icon={<Users className={`h-4 w-4 ${iconCls}`} />} label="Gender" value={user?.gender} theme={theme} />
                <FieldRow icon={<Phone className={`h-4 w-4 ${iconCls}`} />} label="Phone" value={user?.phone} theme={theme} />
                <FieldRow icon={<MapPin className={`h-4 w-4 ${iconCls}`} />} label="City" value={user?.city} theme={theme} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className={theme === "dark" ? "border-blue-500/20 bg-[#09162f]" : ""}>
          <CardHeader>
            <CardTitle className="text-lg">UPSC Registration Details</CardTitle>
            <CardDescription>
              {editing ? "Update your UPSC prep preferences." : "Data captured during signup."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <EditField icon={<Target className={`h-4 w-4 ${iconCls}`} />} label="Attempt" theme={theme}>
                  <select
                    className={selectClass(theme)}
                    value={form.attempt}
                    onChange={(e) => setField("attempt", e.target.value)}
                  >
                    <option value="">Select attempt</option>
                    {ATTEMPTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </EditField>
                <EditField icon={<BookOpen className={`h-4 w-4 ${iconCls}`} />} label="Target Year" theme={theme}>
                  <select
                    className={selectClass(theme)}
                    value={form.targetYear}
                    onChange={(e) => setField("targetYear", e.target.value)}
                  >
                    <option value="">Select year</option>
                    {yearOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </EditField>
                <EditField icon={<CalendarDays className={`h-4 w-4 ${iconCls}`} />} label="Prep Start Date" theme={theme}>
                  <Input
                    type="date"
                    value={form.prepStartDate}
                    onChange={(e) => setField("prepStartDate", e.target.value)}
                    className={inputClass(theme)}
                  />
                </EditField>
                <EditField icon={<Clock3 className={`h-4 w-4 ${iconCls}`} />} label="Daily Study Hours" theme={theme}>
                  <select
                    className={selectClass(theme)}
                    value={form.dailyStudyHours}
                    onChange={(e) => setField("dailyStudyHours", e.target.value)}
                  >
                    <option value="">Select hours</option>
                    {DAILY_HOURS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </EditField>
                <EditField icon={<GraduationCap className={`h-4 w-4 ${iconCls}`} />} label="Education Background" theme={theme}>
                  <select
                    className={selectClass(theme)}
                    value={form.educationBackground}
                    onChange={(e) => setField("educationBackground", e.target.value)}
                  >
                    <option value="">Select background</option>
                    {EDUCATION_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </EditField>
              </>
            ) : (
              <>
                <FieldRow icon={<Target className={`h-4 w-4 ${iconCls}`} />} label="Attempt" value={user?.attempt} theme={theme} />
                <FieldRow icon={<BookOpen className={`h-4 w-4 ${iconCls}`} />} label="Target Year" value={user?.targetYear} theme={theme} />
                <FieldRow icon={<CalendarDays className={`h-4 w-4 ${iconCls}`} />} label="Prep Start Date" value={user?.prepStartDate} theme={theme} />
                <FieldRow icon={<Clock3 className={`h-4 w-4 ${iconCls}`} />} label="Daily Study Hours" value={user?.dailyStudyHours} theme={theme} />
                <FieldRow icon={<GraduationCap className={`h-4 w-4 ${iconCls}`} />} label="Education Background" value={user?.educationBackground} theme={theme} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
