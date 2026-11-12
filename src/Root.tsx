import { lazy, Suspense } from 'react'
import App from './App'

const HostedApp = lazy(() => import('./features/auth/ConfiguredSupabaseApp'))

export function Root() {
  if (import.meta.env.VITE_SUPABASE_ENABLED !== 'true') return <App />

  return <Suspense fallback={<p role="status" className="p-6">Cargando MiCiclo…</p>}>
    <HostedApp />
  </Suspense>
}
