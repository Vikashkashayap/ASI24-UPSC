import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { HelpCircle, Mail, Phone, MessageSquare, LifeBuoy, BookOpen, Shield } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function HelpSupportPage() {
  const { theme } = useTheme();
  
  return (
    <div className="max-w-4xl mx-auto py-4 md:py-10 space-y-4 md:space-y-8 px-3 md:px-4 overflow-x-hidden">
      {/* Enhanced Header - compact on mobile */}
      <div className={`relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-8 border-2 transition-all duration-300 ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 via-purple-900/20 to-slate-900/90 border-purple-500/20 shadow-xl shadow-purple-500/10" 
          : "bg-gradient-to-br from-white via-purple-50/30 to-white border-purple-200/50 shadow-xl shadow-purple-100/30"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-2 md:gap-4">
          <div className={`p-2 md:p-3 rounded-lg md:rounded-xl shrink-0 ${
            theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
          }`}>
            <LifeBuoy className={`w-6 h-6 md:w-8 md:h-8 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <div className="min-w-0">
            <h1 className={`text-xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
              theme === "dark" 
                ? "from-purple-200 via-purple-300 to-purple-400 bg-clip-text text-transparent" 
                : "from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent"
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
          ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-purple-500/20 shadow-lg" 
          : "bg-gradient-to-br from-white to-purple-50/20 border-purple-200/50 shadow-lg"
      }`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
            }`}>
              <LifeBuoy className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
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
                theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
              }`}>
                <HelpCircle className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
              </div>
              <div>
                <span className={`font-bold text-base ${theme === "dark" ? "text-purple-300" : "text-purple-700"}`}>
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
            <li className={`flex gap-4 items-start p-4 rounded-xl transition-all hover:scale-[1.01] ${
              theme === "dark" ? "bg-slate-800/50 hover:bg-slate-800/70" : "bg-slate-50 hover:bg-slate-100"
            }`}>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-teal-500/20" : "bg-teal-100"
              }`}>
                <Mail className={`w-5 h-5 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} />
              </div>
              <div>
                <span className={`font-bold text-base ${theme === "dark" ? "text-teal-300" : "text-teal-700"}`}>
                  Email Us:
                </span>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  <a className={`underline hover:opacity-80 ${theme === "dark" ? "text-teal-400" : "text-teal-600"}`} href="mailto:support@upscmentor.ai">
                    support@upscmentor.ai
                  </a>
                </p>
              </div>
            </li>
            <li className={`flex gap-4 items-start p-4 rounded-xl transition-all hover:scale-[1.01] ${
              theme === "dark" ? "bg-slate-800/50 hover:bg-slate-800/70" : "bg-slate-50 hover:bg-slate-100"
            }`}>
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
              }`}>
                <Phone className={`w-5 h-5 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
              </div>
              <div>
                <span className={`font-bold text-base ${theme === "dark" ? "text-amber-300" : "text-amber-700"}`}>
                  Call:
                </span>
                <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  +91 99999 88888 (Mon-Fri 9am-6pm)
                </p>
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

