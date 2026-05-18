import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Mail, Phone, MapPin, Target, BookOpen, CalendarDays, Clock3, GraduationCap, User } from "lucide-react";

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

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div
        className={`rounded-2xl border p-6 ${
          theme === "dark"
            ? "border-blue-500/20 bg-gradient-to-r from-[#0b1a3b] to-[#0b1530]"
            : "border-blue-200 bg-gradient-to-r from-white to-blue-50"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20 text-xl font-bold text-blue-300">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.name || "Student Profile"}</h1>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={theme === "dark" ? "border-blue-500/20 bg-[#09162f]" : ""}>
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
            <CardDescription>Basic details from your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldRow icon={<User className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="Full Name" value={user?.name} theme={theme} />
            <FieldRow icon={<Mail className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="Email" value={user?.email} theme={theme} />
            <FieldRow icon={<Phone className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="Phone" value={user?.phone} theme={theme} />
            <FieldRow icon={<MapPin className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="City" value={user?.city} theme={theme} />
          </CardContent>
        </Card>

        <Card className={theme === "dark" ? "border-blue-500/20 bg-[#09162f]" : ""}>
          <CardHeader>
            <CardTitle className="text-lg">UPSC Registration Details</CardTitle>
            <CardDescription>Data captured during signup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldRow icon={<Target className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="Attempt" value={user?.attempt} theme={theme} />
            <FieldRow icon={<BookOpen className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="Target Year" value={user?.targetYear} theme={theme} />
            <FieldRow icon={<CalendarDays className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="Prep Start Date" value={user?.prepStartDate} theme={theme} />
            <FieldRow icon={<Clock3 className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="Daily Study Hours" value={user?.dailyStudyHours} theme={theme} />
            <FieldRow icon={<GraduationCap className={`h-4 w-4 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`} />} label="Education Background" value={user?.educationBackground} theme={theme} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
