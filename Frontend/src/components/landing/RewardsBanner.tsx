import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

export const RewardsBanner = () => {
  const { theme } = useTheme();
  
  return (
    <section className={`py-14 transition-colors ${
      theme === "dark" ? "bg-[#030712]" : "bg-slate-50"
    }`}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Card className={`overflow-hidden rounded-3xl ${
          theme === "dark"
            ? "border-slate-700/50 bg-slate-900/80 text-slate-50 shadow-xl"
            : "border-slate-200 bg-white text-slate-900 shadow-lg"
        }`}>
          <CardContent className="grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:px-10 md:py-10">
            <div className="space-y-4">
              <p className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                theme === "dark"
                  ? "bg-[#2563eb]/20 text-blue-200"
                  : "bg-[#2563eb]/10 text-[#2563eb]"
              }`}>
                Limited offer
              </p>
              <div className="space-y-2">
                <h2 className={`text-2xl font-semibold tracking-tight md:text-3xl ${
                  theme === "dark" ? "text-slate-50" : "text-slate-900"
                }`}>
                  Achieve{" "}
                  <span className="text-[#2563eb]">
                    greatness.
                  </span>
                  <br />
                  Get rewarded.
                </h2>
                <p className={`max-w-md text-xs md:text-sm ${
                  theme === "dark" ? "text-slate-200/90" : "text-slate-600"
                }`}>
                  Commit to consistent preparation with MentorsDaily. If you hit a top rank in CSE, we&apos;ll celebrate
                  with you.
                </p>
              </div>
              <ul className={`space-y-2 text-xs ${
                theme === "dark" ? "text-slate-100" : "text-slate-700"
              }`}>
                <li className="flex items-center gap-2">
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    theme === "dark"
                      ? "bg-[#2563eb] text-white"
                      : "bg-[#2563eb] text-white"
                  }`}>
                    ✓
                  </span>
                  <span>Top rank in UPSC CSE (as per UPSC final list).</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    theme === "dark"
                      ? "bg-[#2563eb] text-white"
                      : "bg-[#2563eb] text-white"
                  }`}>
                    ✓
                  </span>
                  <span>Active MentorsDaily Pro subscription for 4+ months.</span>
                </li>
              </ul>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/pricing">
                  <Button className="h-9 rounded-lg px-5 text-xs font-semibold md:h-10 md:px-6 md:text-sm">
                    View Pro plans
                  </Button>
                </Link>
                <span className={`text-[11px] ${
                  theme === "dark" ? "text-slate-200/80" : "text-slate-600"
                }`}>Transparent terms • No lottery • Pure reward.</span>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className={`absolute inset-6 rounded-[32px] blur-2xl ${
                theme === "dark"
                  ? "bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.2),_transparent_70%)]"
                  : "bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.08),_transparent_70%)]"
              }`} />
              <div className={`relative w-full max-w-xs rounded-2xl p-4 shadow-lg border ${
                theme === "dark"
                  ? "border-slate-700/60 bg-slate-800/50"
                  : "border-slate-200 bg-white"
              }`}>
                <div className={`flex items-center gap-2 text-[11px] ${theme === "dark" ? "text-slate-100" : "text-slate-900/90"}`}>
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                    theme === "dark" ? "bg-[#2563eb]/30 text-blue-300" : "bg-[#2563eb]/10 text-[#2563eb]"
                  }`}>
                    <Gift className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">MentorsDaily Pro Reward</span>
                </div>
                <p className={`mt-3 text-[11px] leading-relaxed ${theme === "dark" ? "text-slate-300" : "text-slate-900/85"}`}>
                  Stay consistent with your mains practice. If you make it to the UPSC rank list, we&apos;ll send a
                  special gift to celebrate your journey.
                </p>
                <div className={`mt-4 flex flex-wrap gap-2 text-[10px] ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  <span className={`rounded-full px-2 py-0.5 ${theme === "dark" ? "bg-slate-700/60" : "bg-slate-100"}`}>Rank-linked reward</span>
                  <span className={`rounded-full px-2 py-0.5 ${theme === "dark" ? "bg-slate-700/60" : "bg-slate-100"}`}>No hidden conditions</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

