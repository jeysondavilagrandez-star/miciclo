import { describe, expect, it } from 'vitest'
import { isPublicSupabaseConnection } from './supabaseConnection'

const jwt = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`

describe('configuración pública de Supabase', () => {
  it('acepta el cliente local con credencial pública y rechaza credenciales privilegiadas', () => {
    const url = 'http://127.0.0.1:54321'
    expect(isPublicSupabaseConnection(url, jwt('anon'))).toBe(true)
    expect(isPublicSupabaseConnection(url, 'sb_publishable_example')).toBe(true)
    expect(isPublicSupabaseConnection(url, jwt('service_role'))).toBe(false)
    expect(isPublicSupabaseConnection(url, 'sb_secret_example')).toBe(false)
  })

  it('exige clave publicable para proyectos alojados y rechaza destinos imprevistos', () => {
    expect(isPublicSupabaseConnection('https://ref.supabase.co', 'sb_publishable_example')).toBe(true)
    expect(isPublicSupabaseConnection('https://ref.supabase.co', jwt('anon'))).toBe(false)
    expect(isPublicSupabaseConnection('http://localhost.example.com:54321', jwt('anon'))).toBe(false)
    expect(isPublicSupabaseConnection('http://localhost:54321/path', 'sb_publishable_example')).toBe(false)
  })
})
