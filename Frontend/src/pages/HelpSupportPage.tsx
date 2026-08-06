import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HelpCircle, MessageSquare, LifeBuoy, BookOpen, Shield, Sparkles } from "lucide-react";
import { SupportCard } from "../components/profileExperience";

const WHATSAPP_DISPLAY = "+91 87662 33193";
const WHATSAPP_SUPPORT_URL = `https://wa.me/918766233193?text=${encodeURIComponent(
  "Hi! I have a question about MentorsDaily and need support."
)}`;

export default function HelpSupportPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-4 overflow-x-hidden px-1 pb-[max(1rem,env(safe-area-inset-bottom))] md:space-y-6 md:py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-5 text-white shadow-[0_16px_40px_rgba(37,99,235,0.25)] md:p-7"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">Help & Support</h1>
            <p className="mt-0.5 text-sm font-medium text-blue-50/90">
              We are here to help you succeed in your UPSC journey
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SupportCard
          title="Knowledge Base"
          description="Docs for exams, dashboards, and features."
          icon={HelpCircle}
          href="/guide"
        />
        <SupportCard
          title="Live Chat"
          description="Use in-app chat for urgent issues."
          icon={MessageSquare}
        />
        <SupportCard
          title="WhatsApp Support"
          description={`${WHATSAPP_DISPLAY} — ask anything`}
          icon={Sparkles}
          href={WHATSAPP_SUPPORT_URL}
        />
        <SupportCard
          title="Student Guide"
          description="Quick start for MentorsDaily"
          icon={BookOpen}
          href="/guide"
        />
        <SupportCard
          title="Account & Security"
          description="Profile settings, password, devices"
          icon={Shield}
          onClick={() => navigate("/profile?tab=security")}
        />
        <SupportCard
          title="Report a bug / Suggest"
          description="Tell us what to improve"
          icon={LifeBuoy}
          href={WHATSAPP_SUPPORT_URL}
        />
      </div>
    </div>
  );
}
