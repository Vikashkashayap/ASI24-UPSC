import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Focus } from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

const WORK = 25 * 60;
const BREAK = 5 * 60;

interface Props {
  focusMode?: boolean;
  onFocusModeChange?: (on: boolean) => void;
}

export function PomodoroTimer({ focusMode, onFocusModeChange }: Props) {
  const { theme } = useTheme();
  const [seconds, setSeconds] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          setIsBreak((b) => !b);
          return isBreak ? WORK : BREAK;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, isBreak]);

  const reset = useCallback(() => {
    setRunning(false);
    setIsBreak(false);
    setSeconds(WORK);
  }, []);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const progress = isBreak ? 1 - seconds / BREAK : 1 - seconds / WORK;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "rounded-2xl p-4 border",
        focusMode ? "ring-2 ring-blue-500 shadow-xl shadow-blue-500/20" : "",
        theme === "dark" ? "bg-slate-900/80 border-slate-700" : "bg-white border-slate-200"
      )}
    >
      <motion.div
        className="flex items-center justify-between mb-3"
        animate={focusMode ? { opacity: [1, 0.85, 1] } : {}}
        transition={{ repeat: focusMode ? Infinity : 0, duration: 2 }}
      >
        <span className="text-sm font-semibold flex items-center gap-1">
          <Focus className="w-4 h-4 text-blue-500" />
          Pomodoro
        </span>
        <span className="text-xs opacity-60">{isBreak ? "Break" : "Focus"}</span>
      </motion.div>
      <div className="relative w-28 h-28 mx-auto mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="#2563eb"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 42}
            animate={{ strokeDashoffset: (1 - progress) * 2 * Math.PI * 42 }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        <motion.span
          className="absolute inset-0 flex items-center justify-center text-2xl font-mono font-bold tabular-nums"
          key={seconds}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
        >
          {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </motion.span>
      </div>
      <div className="flex justify-center gap-2">
        <Button type="button" variant="outline" className="!min-h-9 !px-3" onClick={() => setRunning(!running)}>
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button type="button" variant="ghost" className="!min-h-9 !px-3" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        {onFocusModeChange && (
          <Button
            type="button"
            variant={focusMode ? "primary" : "outline"}
            className={cn("!min-h-9 !px-3", focusMode ? "bg-blue-600" : "")}
            onClick={() => onFocusModeChange(!focusMode)}
          >
            Focus
          </Button>
        )}
      </div>
    </motion.div>
  );
}
