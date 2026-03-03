import { ArrowRight } from "lucide-react";

const BANNER_LINK = "https://www.mentorsdaily.com/";

export const TopBanner = () => {
  return (
    <a
      href={BANNER_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-full min-h-[2.75rem] md:min-h-[3.5rem] bg-gradient-to-r from-blue-600 via-blue-700 to-purple-800 text-white overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent banner-strip shrink-0"
      aria-label="Book your free mentorship session at MentorsDaily"
    >
      <div className="relative flex items-center justify-center h-full w-full overflow-hidden">
        {/* Desktop: scrolling marquee. Mobile: single visible line with overflow hidden */}
        <div className="absolute inset-0 flex items-center animate-marquee whitespace-nowrap w-max max-w-none">
          {[1, 2, 3].map((i) => (
            <span key={i} className="inline-flex items-center gap-2 md:gap-8 mx-4 md:mx-10 flex-shrink-0">
              <span className="text-xs md:text-base font-semibold">
                Book Your Free Mentorship Session Today!
              </span>
              <span className="hidden sm:inline text-xs md:text-sm text-white/90">
                + One Conversation Can Change Your Journey!
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-bold text-slate-900 shadow-sm whitespace-nowrap">
                Book Now
                <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
              </span>
            </span>
          ))}
        </div>
      </div>
    </a>
  );
};
