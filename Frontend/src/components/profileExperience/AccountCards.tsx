import React, { memo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bookmark,
  Download,
  Fingerprint,
  HardDrive,
  LifeBuoy,
  MessageCircle,
  MonitorSmartphone,
  Shield,
  Smartphone,
} from "lucide-react";

interface NotificationCardProps {
  title: string;
  body: string;
  time?: string;
  unread?: boolean;
  icon?: LucideIcon;
  onClick?: () => void;
}

export const NotificationCard = memo(function NotificationCard({
  title,
  body,
  time,
  unread,
  icon: Icon = Bell,
  onClick,
}: NotificationCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`app-chrome-btn flex w-full min-h-[56px] items-start gap-3 rounded-[16px] border p-3 text-left ${
        unread ? "border-blue-100 bg-blue-50/60" : "border-slate-200/80 bg-white"
      }`}
    >
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-bold text-slate-900">{title}</span>
          {unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden /> : null}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[12px] font-medium text-slate-500">{body}</span>
        {time ? <span className="mt-1 block text-[10px] font-semibold text-slate-400">{time}</span> : null}
      </span>
    </motion.button>
  );
});

interface SecurityCardProps {
  title: string;
  description: string;
  ready?: boolean;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export const SecurityCard = memo(function SecurityCard({
  title,
  description,
  ready,
  icon: Icon = Shield,
  action,
}: SecurityCardProps) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
            {ready ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                Ready
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                Coming soon
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] font-medium text-slate-500">{description}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
});

interface DeviceCardProps {
  name: string;
  detail: string;
  current?: boolean;
}

export const DeviceCard = memo(function DeviceCard({ name, detail, current }: DeviceCardProps) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
        {current ? <Smartphone className="h-5 w-5" /> : <MonitorSmartphone className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-slate-900">
          {name}
          {current ? (
            <span className="ml-2 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-700">
              This device
            </span>
          ) : null}
        </p>
        <p className="text-[11px] font-medium text-slate-500">{detail}</p>
      </div>
    </div>
  );
});

interface BookmarkCardProps {
  title: string;
  type?: string;
  onOpen?: () => void;
  onRemove?: () => void;
}

export const BookmarkCard = memo(function BookmarkCard({ title, type = "Syllabus", onOpen, onRemove }: BookmarkCardProps) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <Bookmark className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-slate-900">{title}</p>
        <p className="text-[11px] font-medium text-slate-500">{type}</p>
      </div>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="app-chrome-btn rounded-xl px-2 py-1.5 text-[11px] font-bold text-blue-600">
          Open
        </button>
      ) : null}
      {onRemove ? (
        <button type="button" onClick={onRemove} className="app-chrome-btn rounded-xl px-2 py-1.5 text-[11px] font-bold text-rose-500">
          Remove
        </button>
      ) : null}
    </div>
  );
});

interface DownloadCardProps {
  title: string;
  size?: string;
  status?: string;
}

export const DownloadCard = memo(function DownloadCard({ title, size, status = "Offline ready" }: DownloadCardProps) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <Download className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-slate-900">{title}</p>
        <p className="text-[11px] font-medium text-slate-500">
          {status}
          {size ? ` · ${size}` : ""}
        </p>
      </div>
      <HardDrive className="h-4 w-4 text-slate-300" />
    </div>
  );
});

interface SupportCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
}

export const SupportCard = memo(function SupportCard({
  title,
  description,
  icon: Icon = LifeBuoy,
  href,
  onClick,
}: SupportCardProps) {
  const className =
    "app-chrome-btn flex min-h-[72px] w-full items-start gap-3 rounded-[20px] border border-slate-200/80 bg-white p-4 text-left shadow-soft";
  const inner = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-[12px] font-medium text-slate-500">{description}</span>
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
});

export const SecurityIcons = { Fingerprint, Shield, MessageCircle };
