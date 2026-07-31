import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { HelpCircle, MessageSquare, LifeBuoy, BookOpen, Shield } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const WHATSAPP_DISPLAY = "+91 87662 33193";
const WHATSAPP_SUPPORT_URL = `https://wa.me/918766233193?text=${encodeURIComponent(
  "Hi! I have a question about MentorsDaily and need support."
)}`;

export default function HelpSupportPage() {
  const { theme } = useTheme();
  
  return (
    <div className="max-w-4xl mx-auto py-4 md:py-10 space-y-4 md:space-y-8 px-3 md:px-4 overflow-x-hidden">
      {/* Enhanced Header - compact on mobile */}
      <div className={`relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-8 border-2 transition-all duration-300 ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 via-blue-900/20 to-slate-900/90 border-blue-500/20 shadow-xl shadow-blue-500/10" 
          : "bg-gradient-to-br from-white via-blue-50/30 to-white border-blue-200/50 shadow-xl shadow-blue-100/30"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-2 md:gap-4">
          <div className={`p-2 md:p-3 rounded-lg md:rounded-xl shrink-0 ${
            theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
          }`}>
            <LifeBuoy className={`w-6 h-6 md:w-8 md:h-8 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
          </div>
          <div className="min-w-0">
            <h1 className={`text-xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
              theme === "dark" 
                ? "from-blue-200 via-blue-300 to-blue-400 bg-clip-text text-transparent" 
                : "from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent"
            }`}>
              Help & Support
            </h1>
            <p className={`text-xs md:text-base mt-0.5 md:mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              We're here to help you succeed in your UPSC journey
            </p>
          </div>
        </div>
      </div>

      <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-blue-500/20 shadow-lg" 
          : "bg-gradient-to-br from-white to-blue-50/20 border-blue-200/50 shadow-lg"
      }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
            }`}>
              <LifeBuoy className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div>
              <CardTitle className={`text-lg md:text-xl font-bold ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                Support Options
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <ul className="list-none space-y-4 md:space-y-5 pb-1">
            <li className={`flex gap-4 items-start p-4 rounded-xl transition-all hover:scale-[1.01] ${
              theme === "dark" ? "bg-slate-800/50 hover:bg-slate-800/70" : "bg-slate-50 hover:bg-slate-100"
            }`}>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
              }`}>
                <HelpCircle className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              </div>
              <div>
                <span className={`font-bold text-base ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                  Knowledge Base:
                </span>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  Check our extensive docs for common questions about exams, dashboards, and features.
                </p>
              </div>
            </li>
            <li className={`flex gap-4 items-start p-4 rounded-xl transition-all hover:scale-[1.01] ${
              theme === "dark" ? "bg-slate-800/50 hover:bg-slate-800/70" : "bg-slate-50 hover:bg-slate-100"
            }`}>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-100"
              }`}>
                <MessageSquare className={`w-5 h-5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
              </div>
              <div>
                <span className={`font-bold text-base ${theme === "dark" ? "text-cyan-300" : "text-cyan-700"}`}>
                  Live Chat:
                </span>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  For urgent issues, use the in-app chat support (bottom-right icon).
                </p>
              </div>
            </li>
            <li className={`flex gap-4 items-start p-4 rounded-xl transition-all hover:scale-[1.01] ring-1 ${
              theme === "dark"
                ? "bg-emerald-500/10 hover:bg-emerald-500/15 ring-emerald-500/25"
                : "bg-emerald-50 hover:bg-emerald-100/80 ring-emerald-200/80"
            }`}>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-emerald-500/25" : "bg-emerald-100"
              }`}>
                <svg
                  viewBox="0 0 24 24"
                  className={`w-5 h-5 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className={`font-bold text-base ${theme === "dark" ? "text-emerald-300" : "text-emerald-700"}`}>
                  WhatsApp:
                </span>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  Ask any question on WhatsApp —{" "}
                  <a
                    className={`underline font-medium hover:opacity-80 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                    href={WHATSAPP_SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {WHATSAPP_DISPLAY}
                  </a>
                </p>
                <a
                  href={WHATSAPP_SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    theme === "dark"
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  Chat on WhatsApp
                </a>
              </div>
            </li>
            <li className={`flex gap-4 items-start p-4 rounded-xl transition-all hover:scale-[1.01] ${
              theme === "dark" ? "bg-slate-800/50 hover:bg-slate-800/70" : "bg-slate-50 hover:bg-slate-100"
            }`}>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-indigo-500/20" : "bg-indigo-100"
              }`}>
                <BookOpen className={`w-5 h-5 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
              </div>
              <div>
                <span className={`font-bold text-base ${theme === "dark" ? "text-indigo-300" : "text-indigo-700"}`}>
                  Student Guide:
                </span>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  <a className={`underline hover:opacity-80 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} href="/guide" target="_blank" rel="noopener">
                    Read the Quick Start Guide
                  </a>
                </p>
              </div>
            </li>
            <li className={`flex gap-4 items-start p-4 rounded-xl transition-all hover:scale-[1.01] ${
              theme === "dark" ? "bg-slate-800/50 hover:bg-slate-800/70" : "bg-slate-50 hover:bg-slate-100"
            }`}>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
              }`}>
                <Shield className={`w-5 h-5 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`} />
              </div>
              <div>
                <span className={`font-bold text-base ${theme === "dark" ? "text-emerald-300" : "text-emerald-700"}`}>
                  Account & Security:
                </span>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  Having login/trust issues? <a href="/profile" className={`underline hover:opacity-80 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>Go to profile settings</a> or contact support for help.
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

