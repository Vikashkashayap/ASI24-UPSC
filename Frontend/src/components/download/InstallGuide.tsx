import {
  Download,
  ShieldCheck,
  PackageOpen,
  Sparkles,
} from "lucide-react";

const steps = [
  {
    icon: Download,
    title: "Download APK",
    desc: "Tap Download APK or scan the QR code. Save the file to your phone.",
  },
  {
    icon: ShieldCheck,
    title: "Allow Unknown Sources",
    desc: "Open Settings → Security (or Apps) and allow install from this browser/files app.",
  },
  {
    icon: PackageOpen,
    title: "Install",
    desc: "Open the downloaded APK and tap Install. Confirm any Android prompts.",
  },
  {
    icon: Sparkles,
    title: "Open MentorsDaily",
    desc: "Launch MentorsDaily Student Portal and sign in with your account.",
  },
];

interface InstallGuideProps {
  dark?: boolean;
}

export function InstallGuide({ dark = false }: InstallGuideProps) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <li
            key={step.title}
            className={`relative rounded-2xl border p-5 backdrop-blur-md ${
              dark
                ? "border-white/10 bg-white/5"
                : "border-slate-200 bg-white/80 shadow-sm"
            }`}
          >
            <span
              className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                dark
                  ? "bg-amber-400/20 text-amber-300"
                  : "bg-blue-50 text-[#2563eb]"
              }`}
            >
              {i + 1}
            </span>
            <div
              className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${
                dark ? "bg-[#2563eb]/25 text-blue-300" : "bg-[#2563eb]/10 text-[#2563eb]"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h3
              className={`text-sm font-semibold ${
                dark ? "text-white" : "text-slate-900"
              }`}
            >
              {step.title}
            </h3>
            <p
              className={`mt-1.5 text-xs leading-relaxed ${
                dark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {step.desc}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
