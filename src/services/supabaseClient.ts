import { createClient } from '@supabase/supabase-js'
import { isPublicSupabaseConnection } from './supabaseConnection'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabase = url && key && isPublicSupabaseConnection(url, key)
  ? createClient(url, key)
  : null
