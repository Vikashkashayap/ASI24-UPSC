import { Card, CardContent } from "../ui/card";
import { useTheme } from "../../hooks/useTheme";

const testimonials = [
  {
    name: "Rahul Nair",
    role: "UPSC 2026 Candidate",
    quote:
      "\"UPSC Mentor's analytics made me realise how much time I was wasting on low-yield topics. Now my answer practice is sharply focused.\"",
  },
  {
    name: "Ananya Gupta",
    role: "UPSC CSE Aspirant, Delhi",
    quote:
      "\"The answer-first approach and instant evaluation help me correct mistakes the same day. It feels like having a calm mentor on call.\"",
  },
  {
    name: "Karthik Iyer",
    role: "Working Professional & Aspirant",
    quote:
      "\"As a working aspirant, I only get 2–3 hours a day. UPSC Mentor makes sure those hours go into actual practice, not hunting for resources.\"",
  },
];

export const TestimonialsSection = () => {
  const { theme } = useTheme();
  
  return (
    <section id="testimonials" className={`py-16 transition-colors ${
      theme === "dark" ? "bg-[#030712]" : "bg-slate-50"
    }`}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="text-center">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
            theme === "dark" ? "text-purple-300" : "text-purple-600"
          }`}>
            Testimonials
          </p>
          <h2 className={`mt-2 text-lg font-semibold tracking-tight md:text-xl ${
            theme === "dark" ? "text-slate-50" : "text-slate-900"
          }`}>
            Hear from the aspirants.
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card
              key={t.name}
              className={`h-full rounded-2xl ${
                theme === "dark"
                  ? "border-slate-700/60 bg-slate-900/50 text-slate-50 shadow-xl"
                  : "border-slate-200 bg-white text-slate-900 shadow-md"
              }`}
            >
              <CardContent className="space-y-4 p-6 text-[11px] md:p-7">
                <p className={`leading-relaxed ${
                  theme === "dark" ? "text-slate-200" : "text-slate-600"
                }`}>{t.quote}</p>
                <div className="space-y-0.5 text-[11px]">
                  <p className={`font-semibold ${
                    theme === "dark" ? "text-slate-50" : "text-slate-900"
                  }`}>{t.name}</p>
                  <p className={`text-[10px] uppercase tracking-[0.16em] ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
