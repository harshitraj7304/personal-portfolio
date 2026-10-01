/**
 * Transactional email via Resend.
 *
 * Uses Resend's REST API through `fetch` rather than the `resend` npm package:
 * it is two HTTP calls in total, so a dependency would add supply-chain surface
 * to the code path that carries login codes for no functional gain.
 *
 * The API key lives only in the server environment. It is never sent to, or
 * referenced by, the browser bundle.
 */

import { config, isProduction } from "./env.js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Send an email.
 *
 * Behaviour when RESEND_API_KEY is unset:
 *   development → log to the console and report success, so OTP login is
 *                 testable before any email provider is configured (the code
 *                 appears in the `vercel dev` output).
 *   production   → return a failure the caller surfaces as 503. Silently
 *                 dropping a password-reset email is worse than a clear error.
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!config.resendApiKey) {
    if (isProduction()) {
      console.error(
        "[mailer] RESEND_API_KEY is not configured; cannot send email",
      );
      return { ok: false, reason: "not_configured" };
    }

    console.info(
      [
        "",
        "─── EMAIL (dev mode — not actually sent) ─────────────────────",
        `To:      ${to}`,
        `Subject: ${subject}`,
        "",
        text || stripHtml(html),
        "──────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { ok: true, dev: true };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.resendFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || stripHtml(html),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[mailer] Resend returned ${response.status}: ${detail}`);
      return { ok: false, reason: "send_failed", status: response.status };
    }

    const data = await response.json().catch(() => ({}));
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[mailer] request failed:", err.message);
    return { ok: false, reason: "network_error" };
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  Templates
//
//  Inline styles only — email clients strip <style> blocks and support no
//  custom properties, so the site's design tokens cannot be reused here.
// ───────────────────────────────────────────────────────────────────────────

function layout(bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
    <tr><td style="padding:28px 28px 8px;">
      <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">Harshit Raj · Portfolio</p>
    </td></tr>
    <tr><td style="padding:8px 28px 28px;">${bodyHtml}</td></tr>
    <tr><td style="padding:0 28px 24px;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
        Automated message from the portfolio system. If you did not expect it, you can ignore it safely.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

export function otpEmail({ code, purpose, ttlMinutes }) {
  const heading =
    purpose === "password_reset" ? "Reset your password" : "Your sign-in code";

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:650;color:#111827;">${heading}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563;">
      Enter this code to continue. It expires in ${ttlMinutes} minutes and can be used once.
    </p>
    <div style="margin:0 0 20px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;text-align:center;">
      <span style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:30px;font-weight:700;letter-spacing:0.22em;color:#111827;">${code}</span>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
      If you did not request this code, no action is needed — but if you receive several,
      someone may be trying to sign in. Consider changing your password.
    </p>
  `);

  return {
    subject: `${code} is your ${purpose === "password_reset" ? "password reset" : "sign-in"} code`,
    html,
    text: `${heading}\n\nCode: ${code}\n\nExpires in ${ttlMinutes} minutes. Single use.\nIf you did not request this, you can ignore this email.`,
  };
}

export function contactNotificationEmail({
  name,
  email,
  subject,
  message,
  receivedAt,
}) {
  const safe = (v) => escapeHtml(String(v ?? ""));

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:650;color:#111827;">New contact message</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#374151;">
      <tr><td style="padding:4px 0;width:78px;color:#6b7280;">From</td><td style="padding:4px 0;font-weight:600;">${safe(name)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;"><a href="mailto:${safe(email)}" style="color:#2563eb;">${safe(email)}</a></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Subject</td><td style="padding:4px 0;">${safe(subject) || "—"}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Received</td><td style="padding:4px 0;">${safe(receivedAt)}</td></tr>
    </table>
    <div style="margin:18px 0 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
      <p style="margin:0;font-size:14px;line-height:1.7;color:#111827;white-space:pre-wrap;">${safe(message)}</p>
    </div>
    <p style="margin:18px 0 0;font-size:13px;color:#6b7280;">
      Reply directly to this email to respond, or open the admin inbox.
    </p>
  `);

  return {
    subject: `Contact: ${subject || "New message"} — ${name}`,
    html,
    text: `New contact message\n\nFrom: ${name}\nEmail: ${email}\nSubject: ${subject || "—"}\nReceived: ${receivedAt}\n\n${message}`,
    // Lets you reply straight from your mail client; the reply reaches the sender.
    replyTo: email,
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
