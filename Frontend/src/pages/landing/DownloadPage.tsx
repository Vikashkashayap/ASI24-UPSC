import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { ApkQrCode } from "../../components/download/ApkQrCode";
import { DownloadButton } from "../../components/download/DownloadButton";
import { DownloadMeta } from "../../components/download/DownloadMeta";
import { FeatureList } from "../../components/download/FeatureList";
import { InstallGuide } from "../../components/download/InstallGuide";
import { DownloadFAQ } from "../../components/download/DownloadFAQ";
import { DEFAULT_APK_VERSION } from "../../config/downloadDefaults";
import { fetchApkVersion } from "../../services/downloadService";
import type { ApkVersionInfo } from "../../types/download";

export const DownloadPage = () => {
  const [info, setInfo] = useState<ApkVersionInfo>(DEFAULT_APK_VERSION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchApkVersion();
      if (!cancelled) {
        setInfo(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Hero — navy glass composition */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#0f1e3d]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(37,99,235,0.45), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 10%, rgba(245,158,11,0.18), transparent 50%), radial-gradient(ellipse 60% 40% at 70% 90%, rgba(99,102,241,0.2), transparent 55%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-md">
                <img
                  src="/brand/app-icon.png"
                  alt="MentorsDaily"
                  className="h-10 w-10 rounded-xl object-cover shadow-md"
                  width={40}
                  height={40}
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
                    Official Android App
                  </p>
                  <p className="text-sm font-medium text-white">MentorsDaily</p>
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                {info.appName}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
                Prepare for UPSC on the go — Answer Lab, prelims practice, analytics,
                planner and AI mentor in one native Android experience.
              </p>

              <div className="mt-8">
                <DownloadMeta info={info} />
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <DownloadButton
                  apkUrl={info.apk}
                  version={info.version}
                  sizeLabel={info.size}
                />
                <Link
                  to="/features"
                  className="text-sm font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
                >
                  Explore features
                </Link>
              </div>

              {loading ? (
                <p className="mt-3 text-xs text-slate-400">Loading latest version…</p>
              ) : null}
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <ApkQrCode apkUrl={info.apk} size={176} />
                <p className="mt-4 text-center text-xs leading-relaxed text-slate-300">
                  Point your phone camera at the QR code to download the APK directly.
                </p>
                <a
                  href={info.apk}
                  className="mt-4 block truncate text-center text-[11px] text-blue-300/90 underline-offset-2 hover:underline"
                  download="MD-Student-Portal.apk"
                >
                  {info.apk.replace(/^https?:\/\//, "")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-center text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            What&apos;s inside the app
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-600">
            Everything from the MentorsDaily student portal, optimized for Android.
          </p>
          <div className="mt-8">
            <FeatureList features={info.features} />
          </div>
          {info.changelog?.length ? (
            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                What&apos;s new in v{info.version}
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {info.changelog.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-[#2563eb]">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* Install guide */}
      <section className="border-b border-slate-200 bg-[#0f1e3d] py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-center text-xl font-bold tracking-tight text-white md:text-2xl">
            Installation guide
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-300">
            Four quick steps to get MentorsDaily on your Android phone.
          </p>
          <div className="mt-8">
            <InstallGuide dark />
          </div>
        </div>
      </section>

      {/* FAQ + legal */}
      <section className="bg-slate-50 py-14 md:py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <h2 className="text-center text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            Frequently asked questions
          </h2>
          <div className="mt-8">
            <DownloadFAQ />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link to="/privacy" className="font-medium text-[#2563eb] hover:underline">
              Privacy Policy
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/terms-conditions"
              className="font-medium text-[#2563eb] hover:underline"
            >
              Terms &amp; Conditions
            </Link>
            <span className="text-slate-300">|</span>
            <Link to="/contact-us" className="font-medium text-[#2563eb] hover:underline">
              Contact Support
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </>
  );
};
