import nodemailer from "nodemailer";

let transporter = null;

const asBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = asBool(process.env.SMTP_SECURE, false);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
};

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const sendOtpEmail = async ({ toEmail, otp, ttlMinutes }) => {
  const mailer = getTransporter();
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || "MentorsDaily";

  const html = `
    <div style="font-family:Arial,sans-serif;background:#060b24;color:#e2e8f0;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:24px;">
        <h2 style="margin:0 0 10px;color:#60a5fa;">Verify your MentorsDaily account</h2>
        <p style="margin:0 0 16px;color:#cbd5e1;">Use this OTP to complete your registration.</p>
        <div style="font-size:28px;letter-spacing:8px;font-weight:700;background:#1e293b;color:#f8fafc;padding:12px 16px;border-radius:10px;display:inline-block;">
          ${otp}
        </div>
        <p style="margin:16px 0 0;color:#94a3b8;">This OTP is valid for ${ttlMinutes} minutes.</p>
        <p style="margin:8px 0 0;color:#64748b;font-size:12px;">If you did not request this, you can ignore this email.</p>
      </div>
    </div>
  `;

  await mailer.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: "Your MentorsDaily OTP",
    html,
  });
};

export const sendPaymentReceiptEmail = async (user, plan) => {
  const mailer = getTransporter();
  if (!user?.email) return;

  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || "MentorsDaily";
  const supportEmail = process.env.SUPPORT_EMAIL || fromEmail || "support@mentorsdaily.com";

  const planName = plan?.name || "MentorsDaily Pro Plan";
  const price = plan?.price ?? 0;
  const duration = plan?.duration || "";
  const transactionId = plan?.transactionId || "-";
  const startDate = formatDate(user.subscriptionStartDate);
  const endDate = formatDate(user.subscriptionEndDate);

  const priceDisplay = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

  const html = `
    <div style="font-family:Arial,sans-serif;background:#060b24;color:#e2e8f0;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:24px;">
        <h2 style="margin:0 0 10px;color:#60a5fa;">Subscription Activated</h2>
        <p style="margin:0 0 10px;color:#cbd5e1;">Hi ${user.name || "Aspirant"}, your plan is active.</p>
        <p style="margin:0 0 6px;color:#94a3b8;"><strong>Plan:</strong> ${planName} (${duration})</p>
        <p style="margin:0 0 6px;color:#94a3b8;"><strong>Amount:</strong> ${priceDisplay}</p>
        <p style="margin:0 0 6px;color:#94a3b8;"><strong>Start:</strong> ${startDate}</p>
        <p style="margin:0 0 6px;color:#94a3b8;"><strong>End:</strong> ${endDate}</p>
        <p style="margin:0 0 6px;color:#94a3b8;"><strong>Transaction ID:</strong> ${transactionId}</p>
        <p style="margin:14px 0 0;color:#64748b;font-size:12px;">Need help? Write to ${supportEmail}</p>
      </div>
    </div>
  `;

  await mailer.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: user.email,
    subject: "MentorsDaily Subscription Activated",
    html,
  });
};
