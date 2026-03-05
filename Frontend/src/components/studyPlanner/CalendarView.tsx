import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils/cn";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface CalendarViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  taskCountByDate: Record<string, { total: number; completed: number }>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

/** YYYY-MM-DD in local time so calendar shows correct date in all timezones. */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarView({
  selectedDate,
  onSelectDate,
  taskCountByDate,
  currentMonth,
  onMonthChange,
}: CalendarViewProps) {
  const { theme } = useTheme();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();

  const prevMonth = () => {
    onMonthChange(new Date(year, month - 1));
  };
  const nextMonth = () => {
    onMonthChange(new Date(year, month + 1));
  };

  const today = toDateString(new Date());
  const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, -startPad + i + 1);
    days.push({ date: d, dateStr: toDateString(d), isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, dateStr: toDateString(d), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: d, dateStr: toDateString(d), isCurrentMonth: false });
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        theme === "dark" ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            theme === "dark" ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"
          )}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span
          className={cn(
            "text-sm font-semibold",
            theme === "dark" ? "text-slate-100" : "text-slate-800"
          )}
        >
          {currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            theme === "dark" ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"
          )}
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className={cn(
              "text-xs font-medium py-1",
              theme === "dark" ? "text-slate-500" : "text-slate-500"
            )}
          >
            {day}
          </div>
        ))}
        {days.map(({ dateStr, isCurrentMonth }) => {
          const stats = taskCountByDate[dateStr];
          const total = stats?.total ?? 0;
          const completed = stats?.completed ?? 0;
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === today;
          const allDone = total > 0 && completed === total;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "relative flex flex-col items-center justify-center min-h-[44px] rounded-lg text-sm transition-colors",
                !isCurrentMonth && (theme === "dark" ? "text-slate-600" : "text-slate-400"),
                isCurrentMonth && (theme === "dark" ? "text-slate-200" : "text-slate-800"),
                isSelected &&
                  (theme === "dark"
                    ? "bg-blue-600 text-white ring-2 ring-blue-400"
                    : "bg-blue-500 text-white ring-2 ring-blue-300"),
                !isSelected &&
                  isCurrentMonth &&
                  (theme === "dark" ? "hover:bg-slate-700" : "hover:bg-slate-100"),
                isToday && !isSelected && "ring-1 ring-slate-400"
              )}
            >
              <span>{parseInt(dateStr.slice(8, 10), 10)}</span>
              {total > 0 && (
                <span
                  className={cn(
                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                    allDone ? "bg-emerald-500" : "bg-slate-400"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
