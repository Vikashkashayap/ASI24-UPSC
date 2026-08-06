import { CheckCircle2 } from "lucide-react";

interface FeatureListProps {
  features: string[];
  dark?: boolean;
}

export function FeatureList({ features, dark = false }: FeatureListProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {features.map((feature) => (
        <li
          key={feature}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm backdrop-blur-sm ${
            dark
              ? "border-white/10 bg-white/5 text-slate-200"
              : "border-slate-200/80 bg-white/70 text-slate-700 shadow-sm"
          }`}
        >
          <CheckCircle2
            className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? "text-amber-400" : "text-[#2563eb]"}`}
            aria-hidden
          />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}
