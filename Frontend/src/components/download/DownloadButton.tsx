import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  detectDeviceLabel,
  trackApkDownload,
} from "../../services/downloadService";

interface DownloadButtonProps {
  apkUrl: string;
  version: string;
  sizeLabel?: string;
  className?: string;
}

export function DownloadButton({
  apkUrl,
  version,
  sizeLabel,
  className = "",
}: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await trackApkDownload({
        version,
        device: detectDeviceLabel(),
        userAgent: navigator.userAgent,
        source: "download_button",
      });
    } finally {
      const a = document.createElement("a");
      a.href = apkUrl;
      a.download = "MD-Student-Portal.apk";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:from-[#3b82f6] hover:to-[#2563eb] hover:shadow-blue-600/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1e3d] disabled:opacity-70 ${className}`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <Download className="h-5 w-5 transition group-hover:-translate-y-0.5" aria-hidden />
      )}
      <span>
        Download APK
        {sizeLabel ? (
          <span className="ml-1 font-normal opacity-90">({sizeLabel})</span>
        ) : null}
      </span>
    </button>
  );
}
