import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { apiBaseURL, authAPI } from "../../services/api";
import { LandingNavbar } from "../../components/landing/Navbar";

type Step = 1 | 2 | 3;

const stepLabel: Record<Step, string> = {
  1: "Basic info",
  2: "UPSC Details",
  3: "Verify",
};

const yearOptions = ["2025", "2026", "2027", "2028", "2029"];
const attempts = ["1st", "2nd", "3rd", "4th+"];
const dailyHours = ["<2 Hours", "2-3 Hours", "4-6 Hours", "7+ Hours"];
const educationOptions = ["Engineering", "Medical", "Arts", "Commerce", "Science", "Law"];

export const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("planId");
  const { login } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  const [form, setForm] = useState({
    name: "",
    city: "",
    email: "",
    phone: "",
    password: "",
    attempt: "",
    targetYear: "",
    prepStartDate: "",
    dailyStudyHours: "",
    educationBackground: "",
  });

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canProceedStep1 =
    Boolean(form.name.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.phone.trim()) &&
    Boolean(form.password.trim()) &&
    Boolean(form.city.trim());

  const canProceedStep2 =
    Boolean(form.attempt) &&
    Boolean(form.targetYear) &&
    Boolean(form.prepStartDate) &&
    Boolean(form.dailyStudyHours) &&
    Boolean(form.educationBackground);

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.registerSendOtp(form);
      setStep(3);
      setOtpSent(true);
      setCooldown(Number(res?.data?.cooldownSeconds || 60));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Please enter 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyRegisterOtp({
        email: form.email,
        otp,
        password: form.password,
      });
      login(res.data.user, res.data.token);
      if (planId) {
        window.location.href = `/pricing?planId=${encodeURIComponent(planId)}`;
        return;
      }
      window.location.href = "/home";
    } catch (err: any) {
      setError(err?.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (cooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.resendRegisterOtp({ email: form.email });
      setCooldown(Number(res?.data?.cooldownSeconds || 60));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-blue-200/30 bg-[#0a1838] px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/70 focus:border-[#3b82f6]";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50">
      <LandingNavbar />
      <div className="mx-auto max-w-6xl px-4 py-24">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-blue-400/20 bg-[#07142e] shadow-2xl lg:grid-cols-[1.05fr_1.35fr]">
          <div className="hidden border-r border-blue-400/20 bg-gradient-to-b from-[#0b1f45] to-[#081631] p-8 lg:block">
            <h2 className="mb-4 text-4xl font-extrabold leading-tight">Start Your UPSC Journey The Right Way</h2>
            <p className="mb-8 text-sm text-slate-300">
              Join MentorsDaily and build a smart preparation workflow with AI + structured planning.
            </p>
            <ul className="space-y-3 text-sm text-slate-200">
              <li>• Personalized Study Plan</li>
              <li>• Full Performance Analytics</li>
              <li>• Dedicated Mentor</li>
              <li>• 30,000+ Practice Questions</li>
            </ul>
          </div>

          <div className="p-5 sm:p-8">
            <h1 className="text-2xl font-bold">Create Your Account</h1>
            <p className="mt-1 text-sm text-slate-300">
              Already registered?{" "}
              <Link to="/login" className="font-semibold text-blue-400 hover:underline">
                Sign in here
              </Link>
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[1, 2, 3].map((n) => {
                const current = n as Step;
                const active = step >= current;
                return (
                  <div key={n} className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full text-xs font-semibold flex items-center justify-center ${active ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-200"}`}>
                      {n}
                    </div>
                    <div className="hidden text-xs text-slate-300 sm:block">{stepLabel[current]}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-blue-400/20 bg-[#0b1a3b] p-4 sm:p-5">
              <a
                href={`${apiBaseURL}/api/auth/google`}
                className="relative mb-4 inline-flex w-full items-center justify-center rounded-full border border-white/25 bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f2937]"
              >
                <span className="absolute left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
                  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.4 0 6.4 1.2 8.8 3.6l6.5-6.5C35.4 2.9 30.1.5 24 .5 14.8.5 6.9 5.8 3 13.6l7.8 6.1C12.7 13.6 17.9 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8h12.8c-.3 2-1.5 5-4.1 7.1l7.1 5.5c4.3-3.9 6.7-9.7 6.7-16.5z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.8 28.3c-.5-1.3-.8-2.8-.8-4.3s.3-2.9.8-4.3L3 13.6C1.4 16.7.5 20.2.5 24s.9 7.3 2.5 10.4l7.8-6.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 47.5c6.1 0 11.2-2 14.9-5.5l-7.1-5.5c-1.9 1.3-4.4 2.1-7.8 2.1-6.1 0-11.3-4.1-13.2-10.1L3 34.4C6.9 42.2 14.8 47.5 24 47.5z"
                    />
                  </svg>
                </span>
                Continue with Google
              </a>
              <div className="mb-4 flex items-center gap-3 text-xs text-slate-300">
                <div className="h-px flex-1 bg-blue-200/25" />
                <span>or sign in with email</span>
                <div className="h-px flex-1 bg-blue-200/25" />
              </div>

              {step === 1 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input className={inputClass} placeholder="Full Name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
                    <input className={inputClass} placeholder="City" value={form.city} onChange={(e) => setField("city", e.target.value)} />
                  </div>
                  <input className={inputClass} placeholder="Email Address" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                  <input className={inputClass} placeholder="Phone Number" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                  <input className={inputClass} placeholder="Password" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} />
                  <button
                    type="button"
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                    className="w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs text-slate-300">Which attempt is this?</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {attempts.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setField("attempt", item)}
                          className={`rounded-lg border px-3 py-2 text-xs ${form.attempt === item ? "border-blue-400 bg-blue-500/20 text-blue-200" : "border-blue-300/30 text-slate-200"}`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-slate-300">Target Year</p>
                    <div className="grid grid-cols-3 gap-2">
                      {yearOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setField("targetYear", item)}
                          className={`rounded-lg border px-3 py-2 text-xs ${form.targetYear === item ? "border-blue-400 bg-blue-500/20 text-blue-200" : "border-blue-300/30 text-slate-200"}`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input className={inputClass} type="date" value={form.prepStartDate} onChange={(e) => setField("prepStartDate", e.target.value)} />
                    <select className={inputClass} value={form.dailyStudyHours} onChange={(e) => setField("dailyStudyHours", e.target.value)}>
                      <option value="">Select daily study hours</option>
                      {dailyHours.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-slate-300">Educational Background</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {educationOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setField("educationBackground", item)}
                          className={`rounded-lg border px-3 py-2 text-xs ${form.educationBackground === item ? "border-blue-400 bg-blue-500/20 text-blue-200" : "border-blue-300/30 text-slate-200"}`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-blue-300/40 px-4 py-2.5 text-sm">
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!canProceedStep2 || loading}
                      onClick={sendOtp}
                      className="rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Sending OTP..." : "Continue"}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    We sent OTP to <span className="font-semibold text-blue-300">{form.email}</span>
                  </p>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`${inputClass} text-center text-2xl tracking-[0.5rem]`}
                    placeholder="------"
                  />
                  <div className="rounded-lg border border-blue-300/20 p-3 text-xs text-slate-300">
                    <p>Name: {form.name}</p>
                    <p>Email: {form.email}</p>
                    <p>Target: {form.targetYear}</p>
                    <p>Background: {form.educationBackground}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setStep(2)} className="rounded-lg border border-blue-300/40 px-4 py-2.5 text-sm">
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={loading || otp.length !== 6}
                      onClick={verifyOtp}
                      className="rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Verifying..." : "Complete Registration"}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={loading || cooldown > 0 || !otpSent}
                    onClick={resendOtp}
                    className="w-full rounded-lg border border-blue-300/40 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                  </button>
                </div>
              )}

              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
