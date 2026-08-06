import { QRCodeSVG } from "qrcode.react";

interface ApkQrCodeProps {
  apkUrl: string;
  size?: number;
}

export function ApkQrCode({ apkUrl, size = 180 }: ApkQrCodeProps) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <div className="max-w-full rounded-2xl border border-white/20 bg-white/95 p-3 shadow-xl backdrop-blur-md sm:p-4">
        <QRCodeSVG
          value={apkUrl}
          size={size}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#0f1e3d"
          className="h-auto max-w-full"
        />
      </div>
      <p className="text-sm font-medium tracking-wide text-slate-200">
        Scan to Download
      </p>
    </div>
  );
}
