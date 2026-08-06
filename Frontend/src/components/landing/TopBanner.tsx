import { ArrowRight } from "lucide-react";

const BANNER_LINK = "https://www.mentorsdaily.com/";

export const TopBanner = () => {
  return (
    <a
      href={BANNER_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-full min-h-[2.75rem] md:min-h-[3.5rem] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent banner-strip shrink-0"
      aria-label="Book your free mentorship session at MentorsDaily"
    >
      <div className="relative flex h-full w-full max-w-full items-center overflow-hidden">
        {/* pointer-events-none: wide marquee must not steal page touch/scroll */}
        <div className="pointer-events-none flex w-max max-w-none animate-marquee items-center whitespace-nowrap">
          {[1, 2, 3].map((i) => (
            <span key={i} className="mx-4 inline-flex flex-shrink-0 items-center gap-2 md:mx-10 md:gap-8">
              <span className="text-xs font-semibold md:text-base">
                Book Your Free Mentorship Session Today!
              </span>
              <span className="hidden text-xs text-white/90 sm:inline md:text-sm">
                + One Conversation Can Change Your Journey!
              </span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-amber-400 px-2 py-1 text-xs font-bold text-slate-900 shadow-sm md:px-3 md:py-1.5 md:text-sm">
                Book Now
                <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
              </span>
            </span>
          ))}
        </div>
      </div>
    </a>
  );
};
