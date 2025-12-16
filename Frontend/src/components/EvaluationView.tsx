import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { useTheme } from "../hooks/useTheme";

export type Evaluation = {
  score: number;
  feedback: {
    introduction: string;
    content: string;
    structure: string;
    conclusion: string;
  };
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  modelAnswer: string;
};

export const EvaluationView: React.FC<{ evaluation: Evaluation }> = ({ evaluation }) => {
  const { theme } = useTheme();
  const [showModel, setShowModel] = useState(false);

  return (
    <div className="space-y-3 md:space-y-4 mt-3 md:mt-4">
      <Card>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle className="text-sm md:text-base">Evaluation overview</CardTitle>
          <CardDescription className="text-xs md:text-sm">Your answer evaluated like a UPSC examiner.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2 md:gap-3">
            <div className={`text-2xl md:text-3xl font-semibold ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>{evaluation.score}</div>
            <div className={`text-[10px] md:text-xs uppercase tracking-wide ${theme === "dark" ? "text-slate-500" : "text-slate-600"}`}>/ 100 marks</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Section-wise feedback</CardTitle>
          </CardHeader>
          <CardContent className={`space-y-2 md:space-y-3 text-[10px] md:text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            <div>
              <div className={`text-xs md:text-sm font-semibold mb-0.5 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>Introduction</div>
              <p className="leading-relaxed">{evaluation.feedback.introduction}</p>
            </div>
            <div>
              <div className={`text-xs md:text-sm font-semibold mb-0.5 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>Content</div>
              <p className="leading-relaxed">{evaluation.feedback.content}</p>
            </div>
            <div>
              <div className={`text-xs md:text-sm font-semibold mb-0.5 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>Structure</div>
              <p className="leading-relaxed">{evaluation.feedback.structure}</p>
            </div>
            <div>
              <div className={`text-xs md:text-sm font-semibold mb-0.5 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>Conclusion</div>
              <p className="leading-relaxed">{evaluation.feedback.conclusion}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Strengths & gaps</CardTitle>
          </CardHeader>
          <CardContent className={`grid grid-cols-1 xs:grid-cols-2 gap-3 text-[10px] md:text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            <div>
              <div className={`text-xs md:text-sm font-semibold mb-1 ${theme === "dark" ? "text-emerald-300" : "text-emerald-600"}`}>Strengths</div>
              <ul className="space-y-0.5 md:space-y-1 list-disc list-inside">
                {evaluation.strengths.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className={`text-xs md:text-sm font-semibold mb-1 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>Weaknesses</div>
              <ul className="space-y-0.5 md:space-y-1 list-disc list-inside">
                {evaluation.weaknesses.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="col-span-1 xs:col-span-2 mt-1 md:mt-2">
              <div className={`text-xs md:text-sm font-semibold mb-1 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>Improvements</div>
              <ul className="space-y-0.5 md:space-y-1 list-disc list-inside">
                {evaluation.improvements.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 pb-2 md:pb-3">
          <div className="flex-1">
            <CardTitle className="text-sm md:text-base">Model answer</CardTitle>
            <CardDescription className="text-xs md:text-sm">Use this as a blueprint, not something to memorize.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowModel((v) => !v)} className="text-xs">
            {showModel ? "Hide" : "Show"}
          </Button>
        </CardHeader>
        {showModel && (
          <CardContent>
            <p className={`text-xs md:text-sm leading-relaxed whitespace-pre-line ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {evaluation.modelAnswer}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
