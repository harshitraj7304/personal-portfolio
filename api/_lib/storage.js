/**
 * Storage adapter — signed URLs and upload targets.
 *
 * All Supabase Storage knowledge is confined to this file. `files.bucket` and
 * `files.storage_path` are provider-agnostic columns, so moving to GCS or S3
 * later means reimplementing the three functions below, not touching the schema
 * or any handler.
 */

import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from './supabase.js'

export const PUBLIC_BUCKET = 'public-assets'
export const PRIVATE_BUCKET = 'private-vault'

/** Short by design: long enough to follow a redirect, too short to share. */
export const SIGNED_URL_TTL_SECONDS = 60

/**
 * Resolve a `files` row to a URL the browser can fetch.
 *
 * Authorization is the CALLER's responsibility — this function assumes the
 * decision has already been made. It is named to make that obvious, and the
 * only caller is /api/files/:id, which authorizes first.
 */
export async function resolveFileUrl(file, { download = false } = {}) {
  if (!file) return null

  // Already committed under public/ and served by the CDN. This is why the 29
  // existing certificate images need not move for the vault to exist.
  if (file.storage_scope === 'static') {
    return { url: file.public_path, kind: 'static' }
  }

  if (file.storage_scope === 'public') {
    const { data } = supabaseAdmin().storage.from(file.bucket).getPublicUrl(file.storage_path)
    return { url: data?.publicUrl ?? null, kind: 'public' }
  }

  // Private: a fresh, short-lived signed URL every time. The bucket path is
  // never returned to the client — only this URL, and only via a 302.
  const { data, error } = await supabaseAdmin()
    .storage.from(file.bucket)
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS, {
      ...(download ? { download: file.original_name || true } : {}),
    })

  if (error) {
    console.error('[storage] failed to sign URL:', error.message)
    return null
  }

  return { url: data?.signedUrl ?? null, kind: 'signed', expiresIn: SIGNED_URL_TTL_SECONDS }
}

/**
 * Create a signed upload URL so the browser uploads straight to storage.
 *
 * Two reasons this beats proxying bytes through a function: Vercel caps request
 * bodies at 4.5 MB, and streaming a 100 MB ZIP through a serverless function
 * burns execution time for no benefit. The storage credential still never
 * leaves the server — only a scoped, expiring upload URL does.
 */
export async function createUploadTarget({ scope, originalName, prefix = '' }) {
  const bucket = scope === 'public' ? PUBLIC_BUCKET : PRIVATE_BUCKET
  const storagePath = buildStoragePath({ originalName, prefix })

  const { data, error } = await supabaseAdmin()
    .storage.from(bucket)
    .createSignedUploadUrl(storagePath)

  if (error) {
    console.error('[storage] failed to create upload URL:', error.message)
    return null
  }

  return {
    bucket,
    storagePath,
    uploadUrl: data?.signedUrl ?? null,
    token: data?.token ?? null,
  }
}

/** Remove an object. Called only after the `files` row is soft-deleted. */
export async function deleteStorageObject(file) {
  if (!file || file.storage_scope === 'static') return { ok: true, skipped: true }

  const { error } = await supabaseAdmin().storage.from(file.bucket).remove([file.storage_path])
  if (error) {
    console.error('[storage] failed to delete object:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Build a storage path.
 *
 * A UUID prefix guarantees uniqueness, and the sanitised original name is kept
 * only as a readable suffix. Never trust the client-supplied filename for the
 * path itself: '../' segments and control characters are exactly how path
 * traversal happens.
 */
function buildStoragePath({ originalName, prefix }) {
  const safeName = String(originalName ?? 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '')
    .slice(-80)

  const now = new Date()
  const datePart = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const cleanPrefix = String(prefix ?? '')
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '')

  return [cleanPrefix, datePart, `${randomUUID()}-${safeName || 'file'}`]
    .filter(Boolean)
    .join('/')
}

/** Register an uploaded object in the `files` table. */
export async function registerFile({
  scope,
  bucket,
  storagePath,
  publicPath = null,
  originalName,
  mimeType = null,
  sizeBytes = null,
  checksum = null,
  visibility = null,
  uploadedBy = null,
  metadata = {},
}) {
  // Private objects default to private visibility. The DB CHECK constraint
  // files_private_bucket_not_public would reject anything else anyway; defaulting
  // correctly here means the error never has to happen.
  const resolvedVisibility = visibility ?? (scope === 'private' ? 'private' : 'public')

  const { data, error } = await supabaseAdmin()
    .from('files')
    .insert({
      storage_scope: scope,
      bucket: scope === 'static' ? null : bucket,
      storage_path: scope === 'static' ? null : storagePath,
      public_path: scope === 'static' ? publicPath : null,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      checksum_sha256: checksum,
      visibility: resolvedVisibility,
      uploaded_by: uploadedBy,
      metadata,
    })
    .select('*')
    .single()

  if (error) {
    const err = new Error(`Failed to register file: ${error.message}`)
    err.cause = error
    throw err
  }
  return data
}
