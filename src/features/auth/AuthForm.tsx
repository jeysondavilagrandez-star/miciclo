import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import { Page } from '../../components/Page'

type Mode = 'login' | 'register' | 'request' | 'recovery'

const titles = {
  login: 'Iniciar sesión',
  register: 'Crear cuenta de estudiante',
  request: 'Recuperar contraseña',
  recovery: 'Guardar nueva contraseña',
}

function authMessage(error: AuthError) {
  switch (error.code) {
    case 'invalid_credentials': return 'El correo o la contraseña son incorrectos.'
    case 'email_address_not_authorized': return 'El servicio de correo de este entorno no admite esa dirección.'
    case 'email_not_confirmed': return 'Confirma tu correo antes de iniciar sesión.'
    case 'weak_password': return 'Elige una contraseña más segura.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Espera unos minutos antes de volver a intentarlo.'
    case 'otp_expired':
    case 'session_not_found': return 'El enlace o la sesión ha caducado. Solicita un nuevo enlace.'
    default: return 'No se pudo completar la solicitud. Revisa los datos y vuelve a intentarlo.'
  }
}

export function AuthForm({ client, recovery, onRecovered, notice }: {
  client: SupabaseClient
  recovery: boolean
  onRecovered: () => void
  notice: string
}) {
  const [mode, setMode] = useState<Exclude<Mode, 'recovery'>>('login')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const current = recovery ? 'recovery' : mode

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email') ?? '').trim()
    const password = String(fields.get('password') ?? '')
    setError('')
    setMessage('')
    setBusy(true)
    try {
      if (current === 'register') {
        const result = await client.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin },
        })
        if (result.error) setError(authMessage(result.error))
        else if (!result.data.session) setMessage('Revisa tu correo para confirmar la cuenta.')
      } else if (current === 'request') {
        const result = await client.auth.resetPasswordForEmail(email, {
          redirectTo: new URL('/recuperar-clave', window.location.origin).href,
        })
        if (result.error) setError(authMessage(result.error))
        else setMessage('Si existe una cuenta para este correo, recibirás un enlace de recuperación.')
      } else if (current === 'recovery') {
        const result = await client.auth.updateUser({ password })
        if (result.error) setError(authMessage(result.error))
        else onRecovered()
      } else {
        const result = await client.auth.signInWithPassword({ email, password })
        if (result.error) setError(authMessage(result.error))
      }
    } catch {
      setError('No se pudo contactar con el servicio. Comprueba tu conexión.')
    } finally {
      setBusy(false)
    }
  }

  function show(next: Exclude<Mode, 'recovery'>) {
    setMode(next)
    setError('')
    setMessage('')
  }

  return <main className="mx-auto max-w-md px-4 py-12">
    <p className="mb-4 font-semibold text-brand">MiCiclo</p>
    <Page title={titles[current]} description={recovery
      ? 'Elige una contraseña nueva para tu cuenta.'
      : 'Accede a tus ciclos, evaluaciones y actividades.'}>
      <form className="panel mt-5 grid gap-4" key={current} onSubmit={submit}>
        {current !== 'recovery' && <label className="field">Correo electrónico
          <input type="email" name="email" autoComplete="email" required />
        </label>}
        {current !== 'request' && <label className="field">{recovery ? 'Nueva contraseña' : 'Contraseña'}
          <input type="password" name="password" required minLength={current === 'login' ? undefined : 8}
            autoComplete={current === 'login' ? 'current-password' : 'new-password'} />
        </label>}
        <button className="button primary" disabled={busy}>{busy ? 'Procesando…' : titles[current]}</button>
        {error && <p className="error" role="alert">{error}</p>}
        {(message || notice) && <p role="status">{message || notice}</p>}
      </form>
      {!recovery && <div className="mt-4 flex flex-wrap gap-4">
        {mode !== 'login' && <button className="text-link" disabled={busy} onClick={() => show('login')}>Iniciar sesión</button>}
        {mode !== 'register' && <button className="text-link" disabled={busy} onClick={() => show('register')}>Crear cuenta</button>}
        {mode !== 'request' && <button className="text-link" disabled={busy} onClick={() => show('request')}>Olvidé mi contraseña</button>}
      </div>}
    </Page>
  </main>
}
