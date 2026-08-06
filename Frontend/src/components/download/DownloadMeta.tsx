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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items(info).map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md"
        >
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-300">
            <Icon className="h-3.5 w-3.5 text-amber-400" aria-hidden />
            {label}
          </div>
          <p className="text-sm font-semibold text-white sm:text-base">{value}</p>
        </div>
      ))}
    </div>
  );
}
