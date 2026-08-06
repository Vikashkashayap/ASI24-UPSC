import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Browser } from "@capacitor/browser";
import { isNativePlatform } from "../native/platform";

/** Download / open PDF or image — native share when available. */
export async function downloadAndShareFile(opts: {
  url: string;
  fileName: string;
  mimeType?: string;
  title?: string;
}): Promise<"shared" | "opened" | "downloaded"> {
  const mime = opts.mimeType || "application/pdf";

  if (isNativePlatform()) {
    try {
      const res = await fetch(opts.url);
      const blob = await res.blob();
      const base64 = await blobToBase64(blob);
      const saved = await Filesystem.writeFile({
        path: opts.fileName,
        data: base64,
        directory: Directory.Cache,
      });
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: opts.title || opts.fileName,
          url: saved.uri,
          dialogTitle: "Share file",
        });
        return "shared";
      }
      await Browser.open({ url: opts.url });
      return "opened";
    } catch {
      await Browser.open({ url: opts.url });
      return "opened";
    }
  }

  // Web fallback
  const a = document.createElement("a");
  a.href = opts.url;
  a.download = opts.fileName;
  a.rel = "noopener";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return "downloaded";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function isNativeFileShareAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
