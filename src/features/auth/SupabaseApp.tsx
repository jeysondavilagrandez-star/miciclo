import { useEffect, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router'
import { RemoteWorkspace } from './RemoteWorkspace'
import { AuthForm } from './AuthForm'

export function SupabaseApp({ client }: { client: SupabaseClient }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovery, setRecovery] = useState(false)
  const [notice, setNotice] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let hadSession = false
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') {
        setRecovery(false)
        if (hadSession) setNotice('La sesión se cerró. Puedes volver a iniciar sesión.')
      }
      hadSession = next !== null
      setSession(next)
    })
    return () => subscription.unsubscribe()
  }, [client])

  async function signOut() {
    setSigningOut(true)
    setNotice('')
    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw error
      setSession(null)
      setRecovery(false)
      void navigate('/', { replace: true })
    } catch {
      setNotice('No se pudo cerrar la sesión. Vuelve a intentarlo.')
    } finally {
      setSigningOut(false)
    }
  }

  function finishRecovery() {
    setRecovery(false)
    setNotice('Contraseña actualizada.')
    void navigate('/', { replace: true })
  }

  if (session === undefined) return <p role="status" className="p-6">Comprobando sesión…</p>
  if (!session || recovery) return <AuthForm client={client} recovery={recovery && Boolean(session)}
    onRecovered={finishRecovery} notice={notice} />

  return <RemoteWorkspace key={session.user.id} client={client} owner={session.user.id} email={session.user.email}
    onSignOut={() => { void signOut() }} signingOut={signingOut} notice={notice} />
}
