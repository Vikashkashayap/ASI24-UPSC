import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error("Email transport not configured. Set EMAIL_USER and EMAIL_PASS in .env");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
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

export const sendPaymentReceiptEmail = async (user, plan) => {
  const mailer = getTransporter();
  if (!mailer) return;

  if (!user?.email) {
    console.error("Cannot send payment receipt email – user email is missing");
    return;
  }

  const emailUser = process.env.EMAIL_USER;
  const supportEmail =
    process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@upscrh.com";

  const planName = plan?.name || "UPSCRH Pro Plan";
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
  <div style="background-color:#0b021f;padding:24px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:linear-gradient(135deg,#1f093d,#020617);border-radius:24px;overflow:hidden;border:1px solid rgba(129,140,248,0.3);box-shadow:0 25px 60px rgba(15,23,42,0.7);">
            <tr>
              <td style="padding:28px 32px 20px;background:radial-gradient(circle at top left,rgba(244,114,182,0.22),transparent 55%),radial-gradient(circle at bottom right,rgba(56,189,248,0.18),transparent 55%);border-bottom:1px solid rgba(148,163,184,0.25);">
                <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#a855f7;font-weight:700;margin-bottom:8px;">
                  UPSCRH • SUBSCRIPTION
                </div>
                <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;background:linear-gradient(90deg,#f97316,#e879f9,#38bdf8);-webkit-background-clip:text;color:transparent;">
                  Subscription Activated 🎉
                </h1>
                <p style="margin:8px 0 0;font-size:13px;color:#cbd5f5;">
                  Hi ${user.name || "Aspirant"}, your UPSCRH workspace is now upgraded. Here are your plan details.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px;background:radial-gradient(circle at top right,rgba(129,140,248,0.18),transparent 55%);">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
                  <tr>
                    <td style="padding:0 0 16px;">
                      <div style="font-size:12px;font-weight:600;letter-spacing:0.16em;color:#9ca3af;text-transform:uppercase;margin-bottom:8px;">
                        Plan Summary
                      </div>
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                        <div>
                          <div style="font-size:16px;font-weight:700;color:#f9fafb;">${planName}</div>
                          <div style="font-size:13px;color:#9ca3af;">${duration}</div>
                        </div>
                        <div style="text-align:right;">
                          <div style="font-size:18px;font-weight:800;color:#f9fafb;">${priceDisplay}</div>
                          <div style="font-size:11px;color:#9ca3af;">One-time charge</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:16px;background:rgba(15,23,42,0.8);border:1px solid rgba(148,163,184,0.35);">
                        <tr>
                          <td style="padding:14px 16px;border-bottom:1px solid rgba(51,65,85,0.9);">
                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                              <tr>
                                <td style="font-size:12px;color:#9ca3af;">Subscription Start</td>
                                <td style="font-size:12px;color:#9ca3af;text-align:right;">Subscription End</td>
                              </tr>
                              <tr>
                                <td style="font-size:14px;font-weight:600;color:#e5e7eb;">${startDate}</td>
                                <td style="font-size:14px;font-weight:600;color:#e5e7eb;text-align:right;">${endDate}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:14px 16px;">
                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                              <tr>
                                <td style="font-size:12px;color:#9ca3af;">Transaction ID</td>
                                <td style="font-size:12px;color:#9ca3af;text-align:right;">Registered Email</td>
                              </tr>
                              <tr>
                                <td style="font-size:13px;font-weight:600;color:#e5e7eb;">${transactionId}</td>
                                <td style="font-size:13px;font-weight:600;color:#e5e7eb;text-align:right;">${user.email}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <div style="border-radius:16px;border:1px dashed rgba(129,140,248,0.5);padding:14px 16px;background:rgba(15,23,42,0.9);margin-bottom:16px;">
                  <div style="font-size:12px;font-weight:600;color:#e5e7eb;margin-bottom:4px;">
                    What you unlocked
                  </div>
                  <ul style="margin:0;padding-left:18px;font-size:12px;color:#9ca3af;line-height:1.7;">
                    <li>AI mentor &amp; chat for GS, Essay and strategy</li>
                    <li>Prelims practice tests, mocks and performance analytics</li>
                    <li>Dashboard to track your preparation momentum over time</li>
                  </ul>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 20px;border-top:1px solid rgba(51,65,85,0.9);background-color:#020617;">
                <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">
                  Need help with your subscription? Reach us at
                  <a href="mailto:${supportEmail}" style="color:#e879f9;text-decoration:none;">${supportEmail}</a>.
                </p>
                <p style="margin:0;font-size:10px;color:#6b7280;">
                  © ${new Date().getFullYear()} UPSCRH. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;

  await mailer.sendMail({
    from: `"UPSCRH" <${emailUser}>`,
    to: user.email,
    subject: "UPSCRH Subscription Activated 🎉",
    html,
  });
};

