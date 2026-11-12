import { supabase } from '../../services/supabaseClient'
import { SupabaseApp } from './SupabaseApp'

export default function ConfiguredSupabaseApp() {
  return supabase ? <SupabaseApp client={supabase} />
    : <p role="alert" className="p-6">Revisa la URL de Supabase y la clave publicable del entorno.</p>
}
