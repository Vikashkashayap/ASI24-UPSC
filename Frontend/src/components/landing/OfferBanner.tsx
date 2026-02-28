import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { offersAPI, type OfferType } from "../../services/api";

const STORAGE_KEY = "offer_banner_dismissed";
const DEFAULT_OFFER_ID = "default_offer";

/** Fallback offer when backend returns no active offer (e.g. API down or no offer in DB). */
const getDefaultOffer = (): OfferType => ({
  _id: DEFAULT_OFFER_ID,
  title: "Limited Time Offer",
  description: "Get exclusive discounts on our courses. One conversation can change your journey!",
  discount: 25,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
  isHidden: false,
  ctaText: "Claim Offer",
  redirectUrl: "/pricing",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const OfferBanner = () => {
  const [offer, setOffer] = useState<OfferType | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let dismissed: string | null = null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { id, until } = JSON.parse(stored);
        if (id && until && new Date(until) > new Date()) {
          dismissed = id;
          setDismissedId(id);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    offersAPI
      .getActive()
      .then((res) => {
        if (!mounted) return;
        if (res.data.success && res.data.data && res.data.data._id !== dismissed) {
          setOffer(res.data.data);
          setVisible(true);
          return;
        }
        // No active offer from API: show default offer if not dismissed
        if (DEFAULT_OFFER_ID !== dismissed) {
          setOffer(getDefaultOffer());
          setVisible(true);
        }
      })
      .catch(() => {
        // API failed: show default offer so banner is always visible
        if (mounted && DEFAULT_OFFER_ID !== dismissed) {
          setOffer(getDefaultOffer());
          setVisible(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleClose = () => {
    if (!offer) return;
    const until = new Date(offer.endDate);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: offer._id, until: until.toISOString() })
    );
    setDismissedId(offer._id);
    setVisible(false);
  };

  const handleCta = () => {
    if (!offer?.redirectUrl) return;
    if (offer.redirectUrl.startsWith("/")) {
      window.location.href = offer.redirectUrl;
    } else {
      window.open(offer.redirectUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!offer || !visible) return null;

  const MarqueeSegment = () => (
    <span className="inline-flex items-center gap-3 md:gap-4 mx-6 md:mx-8 flex-shrink-0">
      <span className="font-bold text-sm md:text-base whitespace-nowrap">
        {offer.title}
      </span>
      {offer.description && (
        <span className="text-white/95 text-xs md:text-sm whitespace-nowrap">
          {offer.description}
        </span>
      )}
      {offer.discount > 0 && (
        <span className="inline-flex items-center rounded bg-amber-400 text-slate-900 font-bold text-xs md:text-sm px-2 py-1 whitespace-nowrap">
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
      <div className="banner-strip bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white flex items-center overflow-hidden">
        {/* Scrolling marquee – moves right */}
        <div className="flex-1 min-w-0 overflow-hidden flex items-center">
          <div className="flex items-center animate-marquee-right whitespace-nowrap w-max h-full">
            {[1, 2, 3].map((i) => (
              <MarqueeSegment key={i} />
            ))}
          </div>
        </div>
        {/* Fixed CTA + close on the right */}
        <div className="flex items-center gap-2 shrink-0 pl-4 pr-2 h-full bg-gradient-to-l from-purple-700/80 to-transparent">
          {offer.redirectUrl && (
            <button
              type="button"
              onClick={handleCta}
              className="rounded-md bg-amber-400 text-slate-900 font-semibold text-xs md:text-sm px-3 py-1.5 hover:bg-amber-300 transition-colors whitespace-nowrap"
            >
              {offer.ctaText || "Claim Offer"}
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Close offer banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
