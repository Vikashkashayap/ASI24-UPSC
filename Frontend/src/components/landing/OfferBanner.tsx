import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { offersAPI, type OfferType } from "../../services/api";

const STORAGE_KEY = "offer_banner_dismissed";

export const OfferBanner = () => {
  const [offer, setOffer] = useState<OfferType | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadOffer = async () => {
      try {
        // Check if user has dismissed an offer
        let dismissedId: string | null = null;

        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
          try {
            const parsed = JSON.parse(stored);

            if (
              parsed?.id &&
              parsed?.until &&
              new Date(parsed.until) > new Date()
            ) {
              dismissedId = parsed.id;
            } else {
              // Dismissal expired
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        // Get ONLY admin-created active offer
        const res = await offersAPI.getActive();

        if (!mounted) return;

        /*
         * IMPORTANT:
         * No fallback/default offer.
         *
         * If admin has not created an active offer,
         * banner will not be displayed.
         */
        if (!res.data.success || !res.data.data) {
          setOffer(null);
          setVisible(false);
          return;
        }

        const activeOffer = res.data.data;

        // Don't show an offer that user has dismissed
        if (activeOffer._id === dismissedId) {
          setOffer(null);
          setVisible(false);
          return;
        }

        // Admin-created active offer
        setOffer(activeOffer);
        setVisible(true);
      } catch (error) {
        /*
         * API failed.
         *
         * Do NOT show any hardcoded offer.
         */
        console.error("Failed to load active offer:", error);

        if (mounted) {
          setOffer(null);
          setVisible(false);
        }
      }
    };

    loadOffer();

    return () => {
      mounted = false;
    };
  }, []);

  // Close / dismiss current offer
  const handleClose = () => {
    if (!offer) return;

    const until = new Date(offer.endDate);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: offer._id,
        until: until.toISOString(),
      })
    );

    setVisible(false);
  };

  // CTA action
  const handleCta = () => {
    if (!offer?.redirectUrl) return;

    if (offer.redirectUrl.startsWith("/")) {
      window.location.href = offer.redirectUrl;
    } else {
      window.open(
        offer.redirectUrl,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  // Nothing to show
  if (!offer || !visible) {
    return null;
  }

  const MarqueeSegment = () => (
    <span className="mx-6 inline-flex flex-shrink-0 items-center gap-3 md:mx-8 md:gap-4">
      {/* Offer title */}
      <span className="whitespace-nowrap text-sm font-bold md:text-base">
        {offer.title}
      </span>

      {/* Offer description */}
      {offer.description && (
        <span className="whitespace-nowrap text-xs text-white/95 md:text-sm">
          {offer.description}
        </span>
      )}

      {/* Discount */}
      {offer.discount > 0 && (
        <span className="inline-flex whitespace-nowrap items-center rounded bg-amber-400 px-2 py-1 text-xs font-bold text-slate-900 md:text-sm">
          {offer.discount}% OFF
        </span>
      )}
    </span>
  );

  return (
    <div
      className="relative w-full flex-shrink-0 overflow-hidden animate-in slide-in-from-top duration-300"
      role="banner"
      aria-label="Offer"
    >
      <div className="banner-strip flex items-center overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 text-white">
        {/* =====================================================
            SCROLLING MARQUEE
        ===================================================== */}
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          <div className="pointer-events-none flex h-full w-max items-center whitespace-nowrap animate-marquee-right">
            {[1, 2, 3].map((i) => (
              <MarqueeSegment key={i} />
            ))}
          </div>
        </div>

        {/* =====================================================
            FIXED CTA + CLOSE
        ===================================================== */}
        <div className="flex h-full shrink-0 items-center gap-1.5 bg-gradient-to-l from-blue-700/90 to-transparent pl-2 pr-1.5 sm:gap-2 sm:pl-4 sm:pr-2">
          {/* CTA */}
          {offer.redirectUrl && (
            <button
              type="button"
              onClick={handleCta}
              className="whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 sm:px-3 sm:py-1.5 sm:text-xs md:text-sm"
            >
              {offer.ctaText || "Claim Offer"}
            </button>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 transition-colors hover:bg-white/20"
            aria-label="Close offer banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};