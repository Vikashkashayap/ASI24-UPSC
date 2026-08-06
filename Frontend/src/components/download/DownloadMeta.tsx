import {
  Calendar,
  HardDrive,
  Smartphone,
  Tag,
} from "lucide-react";
import type { ApkVersionInfo } from "../../types/download";

interface DownloadMetaProps {
  info: ApkVersionInfo;
}

const items = (info: ApkVersionInfo) => [
  { icon: Tag, label: "Version", value: `v${info.version}` },
  { icon: HardDrive, label: "Size", value: info.size },
  { icon: Smartphone, label: "Requires", value: info.minimumAndroid },
  {
    icon: Calendar,
    label: "Released",
    value: new Date(info.releaseDate + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  },
];

export function DownloadMeta({ info }: DownloadMetaProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
      {items(info).map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="min-w-0 rounded-2xl border border-white/15 bg-white/10 px-2.5 py-2.5 backdrop-blur-md sm:px-4 sm:py-3"
        >
          <div className="mb-1 flex min-w-0 items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-300 sm:gap-1.5 sm:text-[11px]">
            <Icon className="h-3 w-3 shrink-0 text-amber-400 sm:h-3.5 sm:w-3.5" aria-hidden />
            <span className="truncate">{label}</span>
          </div>
          <p className="truncate text-sm font-semibold text-white sm:text-base">{value}</p>
        </div>
      ))}
    </div>
  );
}
