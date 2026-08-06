import React, { memo, useMemo } from "react";
import { Bell, CalendarDays, Newspaper, Sparkles, Target, Trophy } from "lucide-react";
import { BottomSheet } from "../study/BottomSheet";
import { NotificationCard } from "./AccountCards";

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  kind: "ca" | "ai" | "targets" | "test" | "achieve" | "planner";
};

const DEMO_INBOX: InboxItem[] = [
  {
    id: "1",
    title: "Current Affairs ready",
    body: "Today’s AI-curated UPSC brief is available.",
    time: "Just now",
    unread: true,
    kind: "ca",
  },
  {
    id: "2",
    title: "AI Mentor reminder",
    body: "Ask your mentor one doubt before tonight’s revision.",
    time: "1h ago",
    unread: true,
    kind: "ai",
  },
  {
    id: "3",
    title: "Daily targets",
    body: "2 tasks left for today in your study plan.",
    time: "3h ago",
    kind: "targets",
  },
  {
    id: "4",
    title: "Practice test",
    body: "Modular practice is waiting — keep your streak alive.",
    time: "Yesterday",
    kind: "test",
  },
  {
    id: "5",
    title: "Streak milestone",
    body: "Nice work — you’re building consistency like a topper.",
    time: "2d ago",
    kind: "achieve",
  },
];

const iconFor = (kind: InboxItem["kind"]) => {
  switch (kind) {
    case "ca":
      return Newspaper;
    case "ai":
      return Sparkles;
    case "targets":
      return Target;
    case "test":
      return Trophy;
    case "planner":
      return CalendarDays;
    default:
      return Bell;
  }
};

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const NotificationCenter = memo(function NotificationCenter({
  open,
  onClose,
  onOpenSettings,
}: NotificationCenterProps) {
  const items = useMemo(() => DEMO_INBOX, []);

  return (
    <BottomSheet open={open} title="Notifications" onClose={onClose}>
      <div className="max-h-[70vh] space-y-2 overflow-y-auto px-4 pb-4">
        {items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">You’re all caught up</p>
          </div>
        ) : (
          items.map((n) => (
            <NotificationCard
              key={n.id}
              title={n.title}
              body={n.body}
              time={n.time}
              unread={n.unread}
              icon={iconFor(n.kind)}
            />
          ))
        )}
        {onOpenSettings ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="app-chrome-btn mt-2 w-full min-h-[48px] rounded-2xl border border-slate-200 text-[13px] font-bold text-slate-700"
          >
            Notification settings
          </button>
        ) : null}
      </div>
    </BottomSheet>
  );
});
