import { Gift } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

export const RewardsBanner = () => {
  const { theme } = useTheme();
  
  return (
    <section id="pricing" className={`border-b py-14 transition-colors ${
      theme === "dark"
        ? "border-purple-900 bg-[#070213]"
        : "border-slate-200 bg-white"
    }`}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Card className={`overflow-hidden rounded-[30px] ${
          theme === "dark"
            ? "border-fuchsia-500/25 bg-gradient-to-r from-[#1e1035] via-[#020617] to-[#022c22] text-slate-50 shadow-[0_22px_90px_rgba(147,51,234,0.6)]"
            : "border-purple-200 bg-gradient-to-r from-purple-50 via-white to-emerald-50 text-slate-900 shadow-xl"
        }`}>
          <CardContent className="grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:px-10 md:py-10">
            <div className="space-y-4">
              <p className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                theme === "dark"
                  ? "bg-fuchsia-500/20 text-fuchsia-200"
                  : "bg-fuchsia-100 text-fuchsia-700"
              }`}>
                Limited offer
              </p>
              <div className="space-y-2">
                <h2 className={`text-2xl font-semibold tracking-tight md:text-3xl ${
                  theme === "dark" ? "text-slate-50" : "text-slate-900"
                }`}>
                  Achieve{" "}
                  <span className="bg-gradient-to-r from-fuchsia-500 via-violet-500 to-emerald-500 bg-clip-text text-transparent">
                    greatness.
                  </span>
                  <br />
                  Get rewarded.
                </h2>
                <p className={`max-w-md text-xs md:text-sm ${
                  theme === "dark" ? "text-slate-200/90" : "text-slate-600"
                }`}>
                  Commit to consistent preparation with UPSCRH. If you hit a top rank in CSE, we&apos;ll celebrate
                  with you.
                </p>
              </div>
              <ul className={`space-y-2 text-xs ${
                theme === "dark" ? "text-slate-100" : "text-slate-700"
              }`}>
                <li className="flex items-center gap-2">
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    theme === "dark"
                      ? "bg-emerald-500 text-black"
                      : "bg-emerald-500 text-white"
                  }`}>
                    ✓
                  </span>
                  <span>Top rank in UPSC CSE (as per UPSC final list).</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    theme === "dark"
                      ? "bg-emerald-500 text-black"
                      : "bg-emerald-500 text-white"
                  }`}>
                    ✓
                  </span>
                  <span>Active UPSCRH Pro subscription for 4+ months.</span>
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button className="h-9 rounded-full bg-gradient-to-r from-fuchsia-500 to-emerald-400 px-5 text-xs font-semibold tracking-tight text-white hover:from-fuchsia-400 hover:to-emerald-300 md:h-10 md:px-6 md:text-sm">
                  View Pro plans
                </Button>
                <span className={`text-[11px] ${
                  theme === "dark" ? "text-slate-200/80" : "text-slate-600"
                }`}>Transparent terms • No lottery • Pure reward.</span>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className={`absolute inset-6 rounded-[32px] blur-2xl ${
                theme === "dark"
                  ? "bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.28),_transparent_70%)]"
                  : "bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.15),_transparent_70%)]"
              }`} />
              <div className="relative w-full max-w-xs rounded-[26px] bg-gradient-to-tr from-fuchsia-400 via-violet-300 to-emerald-300 p-4 shadow-2xl">
                <div className="flex items-center gap-2 text-[11px] text-slate-900/90">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/40 text-fuchsia-700">
                    <Gift className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">UPSCRH Pro Reward</span>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-900/85">
                  Stay consistent with your mains practice. If you make it to the UPSC rank list, we&apos;ll send a
                  special gift to celebrate your journey.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-900/80">
                  <span className="rounded-full bg-white/40 px-2 py-0.5">Rank-linked reward</span>
                  <span className="rounded-full bg-white/40 px-2 py-0.5">No hidden conditions</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

