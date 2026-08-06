import { QRCodeSVG } from "qrcode.react";

interface ApkQrCodeProps {
  apkUrl: string;
  size?: number;
}

export function ApkQrCode({ apkUrl, size = 180 }: ApkQrCodeProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-white/20 bg-white/95 p-4 shadow-xl backdrop-blur-md">
        <QRCodeSVG
          value={apkUrl}
          size={size}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#0f1e3d"
        />
      </div>
      <p className="text-sm font-medium tracking-wide text-slate-200">
        Scan to Download
      </p>
    </div>
  );
}
