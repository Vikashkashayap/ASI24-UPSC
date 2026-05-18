import { FormEvent, useState } from "react";
import { LandingFooter } from "../components/landing/LandingFooter";
import { useTheme } from "../hooks/useTheme";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";

const WHATSAPP_ENQUIRY = "https://wa.me/918766233193?text=";
const ENQUIRY_TEXT = encodeURIComponent(
  "Hi! I would like to enquire about MentorsDaily."
);
const PHONE_DISPLAY = "+91 87662 33193";
const PHONE_TEL = "+918766233193";

/**
 * Contact Us — MentorsDaily Student Portal
 * Route: /contact-us
 */
export const ContactUsPage = () => {
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const muted = theme === "dark" ? "text-slate-400" : "text-slate-600";
  const heading = theme === "dark" ? "text-slate-50" : "text-slate-900";
  const sub = theme === "dark" ? "text-slate-200" : "text-slate-800";
  const body = theme === "dark" ? "text-slate-300" : "text-slate-700";
  const card =
    theme === "dark"
      ? "border-slate-700/80 bg-[#12121a]"
      : "border-slate-200 bg-white";
  const sectionBg =
    theme === "dark" ? "border-slate-800 bg-[#070313]" : "border-slate-200 bg-slate-100";
  const inputClass = `mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500/30 ${
    theme === "dark"
      ? "border-slate-600 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
  }`;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `[MentorsDaily] Contact from ${name || "User"}`
    );
    const bodyText = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    );
    window.location.href = `mailto:hr@mentorsdaily.com?subject=${subject}&body=${bodyText}`;
    setSubmitted(true);
  };

  return (
    <>
      <section
        className={`min-h-[60vh] border-b py-10 md:py-14 transition-colors ${sectionBg}`}
      >
        <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6">
          <article
            className={`rounded-2xl border p-6 shadow-lg sm:p-8 md:p-10 ${card}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${muted}`}>
              Support · MentorsDaily
            </p>
            <h1 className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-[1.75rem] ${heading}`}>
              Contact Us
            </h1>
            <p className={`mt-3 max-w-2xl text-sm leading-relaxed md:text-[15px] ${body}`}>
              We&apos;re here to help with courses, test series, accounts, and payments. Call,
              WhatsApp, or email — or use the form below.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-stretch">
              <a
                href={`${WHATSAPP_ENQUIRY}${ENQUIRY_TEXT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20BD5A] sm:min-w-[200px] sm:flex-initial"
              >
                <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                Enquire on WhatsApp
              </a>
              <a
                href={`tel:${PHONE_TEL}`}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition hover:bg-emerald-500/10 sm:min-w-[200px] sm:flex-initial ${
                  theme === "dark"
                    ? "border-slate-600 text-slate-100"
                    : "border-slate-200 text-slate-800"
                }`}
              >
                <Phone className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {PHONE_DISPLAY}
              </a>
              <a
                href="mailto:hr@mentorsdaily.com"
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition hover:bg-emerald-500/10 sm:flex-initial ${
                  theme === "dark"
                    ? "border-slate-600 text-emerald-400"
                    : "border-slate-200 text-emerald-700"
                }`}
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                hr@mentorsdaily.com
              </a>
            </div>
            <p className={`mt-3 text-xs ${muted}`}>
              WhatsApp opens a chat with {PHONE_DISPLAY} for enquiries.
            </p>

            <div className="mt-6 text-sm">
              <span className={muted}>Website: </span>
              <a
                href="https://studentportal.mentorsdaily.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
              >
                studentportal.mentorsdaily.com
              </a>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-10 dark:border-slate-700">
              <h2 className={`text-lg font-semibold ${sub}`}>Send a message</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                Opens your email app with your message to hr@mentorsdaily.com.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                <div>
                  <label htmlFor="contact-name" className={`text-sm font-medium ${sub}`}>
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className={`text-sm font-medium ${sub}`}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className={`text-sm font-medium ${sub}`}>
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`${inputClass} min-h-[140px] resize-y`}
                    placeholder="How can we help? Include course or order details if relevant."
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <Send className="h-4 w-4" aria-hidden />
                  Submit
                </button>
              </form>

              {submitted && (
                <p
                  className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                    theme === "dark"
                      ? "border-emerald-800 bg-emerald-950/40 text-emerald-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                  role="status"
                >
                  If your mail app opened, send the email to complete your request. For a quick
                  reply, use{" "}
                  <a
                    href={`${WHATSAPP_ENQUIRY}${ENQUIRY_TEXT}`}
                    className="font-semibold underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp ({PHONE_DISPLAY})
                  </a>
                  .
                </p>
              )}
            </div>

            <section
              className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-700"
              aria-labelledby="org-heading"
            >
              <h2 id="org-heading" className={`text-base font-semibold ${sub}`}>
                MentorsDaily
              </h2>
              <p className={`mt-2 text-sm leading-relaxed ${body}`}>
                UPSC preparation: courses, test series, study materials, and student accounts —
                all in one place.
              </p>
            </section>
          </article>
        </div>
      </section>
      <LandingFooter />
    </>
  );
};
