/**
 * Environment access + secret-exposure guard.
 *
 * Every other module reads configuration through here rather than touching
 * `process.env` directly, so there is exactly one place that knows which
 * variables exist and which are mandatory.
 *
 * The guard at the bottom is the mechanical enforcement of requirement 6
 * ("do not expose secrets or API keys in frontend code").
 */

/** Names that must NEVER appear with a VITE_ prefix. */
const NEVER_PUBLIC = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "ANTHROPIC_API_KEY",
  "ADMIN_BOOTSTRAP_PASSWORD",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_VERIFY_TOKEN",
];

/**
 * Vite inlines every VITE_-prefixed variable into the browser bundle as plain
 * text. A secret carrying that prefix is a published secret — and it would be
 * published silently, with nothing at build time complaining.
 *
 * So we fail loudly at boot instead. This runs on module load, meaning a
 * misconfigured deployment breaks its API immediately and visibly rather than
 * leaking a service-role key to every visitor.
 */
function assertNoLeakedSecrets() {
  const leaked = NEVER_PUBLIC.filter((name) => {
    const v = process.env[`VITE_${name}`];
    return typeof v === "string" && v.length > 0;
  });

  if (leaked.length > 0) {
    throw new Error(
      `FATAL: secret(s) exposed with a VITE_ prefix: ${leaked
        .map((n) => `VITE_${n}`)
        .join(", ")}. ` +
        "Vite inlines VITE_* variables into the browser bundle in plain text. " +
        "Remove the VITE_ prefix and redeploy. See .env.example.",
    );
  }
}

assertNoLeakedSecrets();

/** Read an optional variable. */
export function env(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

/** Read a required variable, throwing a message that says how to fix it. */
export function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        "Add it to .env.local for local development, or to the Vercel project " +
        "settings for a deployment. See .env.example.",
    );
  }
  return v;
}

export function envInt(name, fallback) {
  const raw = env(name);
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function envBool(name, fallback = false) {
  const raw = env(name);
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export const isProduction = () =>
  env("VERCEL_ENV", env("NODE_ENV", "development")) === "production";

export const isDevelopment = () => !isProduction();

/**
 * Configuration snapshot. Read lazily via a getter so importing this module is
 * side-effect free beyond the leak assertion — handlers that never touch
 * Supabase should not fail because a Supabase variable is unset.
 */
export const config = {
  get supabaseUrl() {
    return requireEnv("SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return requireEnv("SUPABASE_ANON_KEY");
  },
  get supabaseServiceKey() {
    return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get authSecret() {
    const secret = requireEnv("AUTH_SECRET");
    if (secret.length < 32) {
      throw new Error(
        "AUTH_SECRET must be at least 32 characters. Generate one with: " +
          "node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
      );
    }
    return secret;
  },
  get siteUrl() {
    return env("PUBLIC_SITE_URL", "http://localhost:5173").replace(/\/+$/, "");
  },
  get cookieDomain() {
    return env("SESSION_COOKIE_DOMAIN"); // undefined ⇒ host-only cookies
  },
  get sessionTtl() {
    return envInt("SESSION_TTL_SECONDS", 3600);
  },
  get refreshTtl() {
    return envInt("REFRESH_TTL_SECONDS", 2592000);
  },
  get resendApiKey() {
    return env("RESEND_API_KEY");
  },
  get resendFrom() {
    return env("RESEND_FROM_EMAIL", "noreply@example.com");
  },
  get contactNotifyEmail() {
    return env("CONTACT_NOTIFY_EMAIL");
  },
  get anthropicApiKey() {
    return env("ANTHROPIC_API_KEY");
  },
  get anthropicModel() {
    return env("ANTHROPIC_MODEL", "claude-opus-5");
  },
  get otpTtlSeconds() {
    return envInt("OTP_TTL_SECONDS", 600);
  },
  get otpMaxAttempts() {
    return envInt("OTP_MAX_ATTEMPTS", 5);
  },
};
