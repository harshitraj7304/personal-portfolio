/**
 * Audit logging and login-attempt recording.
 *
 * Written with the service-role client so an audit entry lands even when the
 * actor's own permissions are the thing that failed. A log that only records
 * successful, authorized actions is not an audit trail.
 *
 * Every function here swallows its own errors: logging must never be the reason
 * a request fails. A lost log line is a nuisance; a 500 on a successful login
 * because the log write failed is a bug.
 */

import { clientIp, userAgent } from './http.js'
import { supabaseAdmin } from './supabase.js'

/**
 * Record an auditable action.
 *
 * `actorLabel` duplicates the actor's email deliberately: activity_logs.actor_id
 * is ON DELETE SET NULL, so without the denormalised label, deleting an account
 * would anonymise its entire history — precisely when you most want to read it.
 */
export async function logActivity({
  req,
  actorId = null,
  actorLabel = null,
  action,
  entityType = null,
  entityId = null,
  summary = null,
  diff = null,
}) {
  try {
    await supabaseAdmin()
      .from('activity_logs')
      .insert({
        actor_id: actorId,
        actor_label: actorLabel,
        action,
        entity_type: entityType,
        entity_id: entityId,
        summary,
        diff,
        ip: req ? clientIp(req) : null,
        user_agent: req ? userAgent(req) : null,
      })
  } catch (err) {
    console.error('[audit] failed to write activity log:', err.message)
  }
}

/**
 * Record a login attempt, successful or not.
 *
 * Separate from rate limiting on purpose: rate limits answer "may this proceed"
 * and get pruned aggressively, while this answers "what happened, from where"
 * and is retained. `reason` holds an internal code, never the client-facing
 * message, so the log stays precise even where the response is deliberately vague.
 */
export async function logLoginAttempt({ req, identifier, successful, reason = null }) {
  try {
    await supabaseAdmin()
      .from('login_attempts')
      .insert({
        identifier: String(identifier ?? 'unknown')
          .toLowerCase()
          .slice(0, 160),
        ip: req ? clientIp(req) : null,
        user_agent: req ? userAgent(req) : null,
        successful,
        reason,
      })
  } catch (err) {
    console.error('[audit] failed to write login attempt:', err.message)
  }
}

/** Convenience wrapper for authenticated actions. */
export function logAdminAction(session, req, action, extra = {}) {
  return logActivity({
    req,
    actorId: session?.admin?.id ?? null,
    actorLabel: session?.admin?.email ?? null,
    action,
    ...extra,
  })
}
