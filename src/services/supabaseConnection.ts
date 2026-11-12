export function isLocalSupabase(url: string) {
  return /^http:\/\/(?:127\.0\.0\.1|localhost):54321\/?$/.test(url)
}

export function isPublicSupabaseConnection(url: string, key: string) {
  if (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) return key.startsWith('sb_publishable_')
  if (!isLocalSupabase(url)) return false
  if (key.startsWith('sb_publishable_')) return true

  // The local CLI may expose a legacy anon JWT. Never accept service_role.
  try {
    const parts = key.split('.')
    if (parts.length !== 3) return false
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'
  } catch {
    return false
  }
}
