#!/usr/bin/env node
/**
 * Create the first super-admin account.
 *
 * Run once, locally, after the migrations:
 *
 *     npm run bootstrap:admin
 *
 * There is deliberately NO public signup endpoint anywhere in this system. The
 * only way an admin account comes into existence is this script, run by someone
 * holding the service-role key on their own machine. That removes the entire
 * class of "attacker registers themselves an admin account" problems.
 *
 * Idempotent: re-running it promotes and reactivates an existing account rather
 * than failing or creating a duplicate.
 */

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";

const say = (msg = "") => console.log(msg);
const ok = (msg) => console.log(`${GREEN}✓${RESET} ${msg}`);
const warn = (msg) => console.log(`${YELLOW}!${RESET} ${msg}`);
const fail = (msg) => console.error(`${RED}✗${RESET} ${msg}`);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    fail(`Missing ${BOLD}${name}${RESET}`);
    say();
    say(`  Run with your local env file loaded:`);
    say(
      `    ${DIM}node --env-file=.env.local scripts/bootstrap-admin.mjs${RESET}`,
    );
    say(`  (that is what ${BOLD}npm run bootstrap:admin${RESET} does)`);
    say();
    process.exit(1);
  }
  return value;
}

/** Same rules as api/_lib/crypto.js — duplicated because this runs standalone. */
function validatePassword(password) {
  const errors = [];
  if (password.length < 12) errors.push("at least 12 characters");
  if (!/[a-z]/.test(password)) errors.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("an uppercase letter");
  if (!/[0-9]/.test(password)) errors.push("a number");
  return errors;
}

async function prompt(question, { secret = false } = {}) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  try {
    if (!secret) return (await rl.question(question)).trim();

    // Suppress echo so the password is not left visible in the terminal
    // scrollback (or in a screen recording).
    const onData = (char) => {
      if (["\n", "\r", ""].includes(char.toString())) return;
      stdout.write("\x1b[2K\x1b[200D" + question + "*".repeat(rl.line.length));
    };
    stdin.on("data", onData);
    const answer = await rl.question(question);
    stdin.off("data", onData);
    stdout.write("\n");
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function main() {
  say();
  say(`${BOLD}Bootstrap portfolio admin account${RESET}`);
  say(`${DIM}Creates the first super_admin. Safe to re-run.${RESET}`);
  say();

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify the migrations have run before touching auth, so the failure mode is
  // a clear message rather than a half-created user with no admin_users row.
  const { error: schemaError } = await supabase
    .from("admin_users")
    .select("id", { head: true, count: "exact" });

  if (schemaError) {
    fail("Could not read the admin_users table.");
    say();
    say("  Have the migrations been run? In the Supabase SQL editor, run the");
    say("  files in db/migrations/ in order (0001 → 0008).");
    say();
    say(`  ${DIM}${schemaError.message}${RESET}`);
    process.exit(1);
  }
  ok("Database schema found");

  const email = (
    process.env.ADMIN_BOOTSTRAP_EMAIL || (await prompt("Admin email: "))
  ).toLowerCase();
  if (!email.includes("@")) {
    fail("That does not look like an email address.");
    process.exit(1);
  }

  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!password) {
    password = await prompt("Password (min 12 chars): ", { secret: true });
    const confirm = await prompt("Confirm password:      ", { secret: true });
    if (password !== confirm) {
      fail("Passwords do not match.");
      process.exit(1);
    }
  }

  const problems = validatePassword(password);
  if (problems.length > 0) {
    fail(`Password needs ${problems.join(", ")}.`);
    process.exit(1);
  }

  const fullName =
    process.env.ADMIN_BOOTSTRAP_NAME ||
    (await prompt("Full name: ")) ||
    "Admin";

  say();

  // ── Create or update the auth user ──────────────────────────────────────
  let userId;
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no verification email — you are creating this yourself
      user_metadata: { full_name: fullName },
    });

  if (createError) {
    const alreadyExists =
      createError.message?.toLowerCase().includes("already") ||
      createError.status === 422;

    if (!alreadyExists) {
      fail(`Could not create the auth user: ${createError.message}`);
      process.exit(1);
    }

    warn("An auth user with that email already exists — updating its password");

    const { data: list, error: listError } =
      await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      fail(`Could not look up the existing user: ${listError.message}`);
      process.exit(1);
    }

    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!existing) {
      fail(
        "The user exists but could not be found. Check the Supabase Auth dashboard.",
      );
      process.exit(1);
    }

    userId = existing.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password },
    );
    if (updateError) {
      fail(`Could not update the password: ${updateError.message}`);
      process.exit(1);
    }
    ok("Password updated");
  } else {
    userId = created.user.id;
    ok("Auth user created");
  }

  // ── Add to the admin allowlist ──────────────────────────────────────────
  // Being in auth.users is not enough to reach /admin — this row is the gate.
  const { error: upsertError } = await supabase.from("admin_users").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role: "super_admin",
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    fail(`Could not add the admin record: ${upsertError.message}`);
    say();
    say("  The auth user exists but is NOT an admin. Re-run this script.");
    process.exit(1);
  }
  ok("Admin allowlist record created (role: super_admin)");

  await supabase.from("activity_logs").insert({
    actor_id: userId,
    actor_label: email,
    action: "admin.bootstrap",
    summary: "Super admin account created via bootstrap script",
  });

  say();
  say(`${GREEN}${BOLD}Done.${RESET}`);
  say();
  say(`  Email: ${BOLD}${email}${RESET}`);
  say(`  Role:  super_admin`);
  say();
  say(`${YELLOW}Next:${RESET}`);
  say(`  1. Remove ADMIN_BOOTSTRAP_EMAIL / _PASSWORD from .env.local`);
  say(`  2. Never set those variables in Vercel`);
  say(`  3. Verify: ${DIM}curl http://localhost:3000/api/health${RESET}`);
  say();
}

main().catch((err) => {
  fail(`Unexpected failure: ${err.message}`);
  console.error(err);
  process.exit(1);
});
