import { ArrowRight } from "lucide-react";

const BANNER_LINK = "https://www.mentorsdaily.com/";

export const TopBanner = () => {
  return (
    <a
      href={BANNER_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-gradient-to-r from-blue-600 via-blue-700 to-purple-800 text-white overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent banner-strip"
      aria-label="Book your free mentorship session at MentorsDaily"
    >
      <div className="relative flex items-center h-full">
        {/* Scrolling marquee – moves left */}
        <div className="absolute inset-0 flex items-center animate-marquee whitespace-nowrap w-max">
          {[1, 2, 3].map((i) => (
            <span key={i} className="inline-flex items-center gap-4 md:gap-8 mx-6 md:mx-10 flex-shrink-0">
              <span className="text-sm md:text-base font-semibold">
                Book Your Free Mentorship Session Today!
              </span>
              <span className="text-xs md:text-sm text-white/90">
                + One Conversation Can Change Your Journey!
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm">
                Book Now
                <ArrowRight className="w-4 h-4" />
              </span>
            </span>
          ))}
        </div>
      </div>
    </a>
  );
};
