// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoData } from '../../services/demo'
import { STORAGE_KEY } from '../../services/localAcademicRepository'
import { SupabaseApp } from './SupabaseApp'

const empty = () => ({ terms: [], courses: [], activities: [], defaultTarget: 11, revision: 0 })

function testClient() {
  type Listener = (event: AuthChangeEvent, session: Session | null) => void
  let listener: Listener | undefined
  let current: Session | null = null
  const rows = new Map<string, ReturnType<typeof empty>>()

  function event(type: AuthChangeEvent, account?: string) {
    current = account ? { user: { id: account, email: account } } as Session : null
    listener?.(type, current)
  }

  const auth = {
    onAuthStateChange: vi.fn((callback: Listener) => {
      listener = callback
      callback('INITIAL_SESSION', current)
      return { data: { subscription: { unsubscribe: () => { listener = undefined } } } }
    }),
    signUp: vi.fn(async () => ({ error: null, data: { session: null } })),
    signInWithPassword: vi.fn(async ({ email }: { email: string }) => {
      event('SIGNED_IN', email)
      return { error: null }
    }),
    signOut: vi.fn(async () => {
      event('SIGNED_OUT')
      return { error: null }
    }),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
  }
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (!current || args.expected_owner !== current.user.id) return { data: null, error: { code: '42501' } }
    const id = current.user.id
    const row = rows.get(id) ?? empty()
    if (name === 'load_academic_workspace') return { data: row, error: null }
    const changes = args.changes as { terms: { id: string; name: string }[] }
    const terms = changes.terms.map(({ id: termId, name }) => ({
      id: termId, name, start: '', end: '', archived: false,
    }))
    rows.set(id, { ...row, revision: row.revision + 1, terms } as ReturnType<typeof empty>)
    return { data: row.revision + 1, error: null }
  })
  return { auth, rpc, event, client: { auth, rpc } as unknown as SupabaseClient }
}

function open(client: SupabaseClient, path = '/cursos') {
  return render(<MemoryRouter initialEntries={[path]}><SupabaseApp client={client} /></MemoryRouter>)
}

const button = (name: string) => screen.getByRole('button', { name })

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('integración de cuenta en la interfaz con cliente simulado', () => {
  it('protege rutas, mantiene datos por cuenta y los carga otra vez después de reiniciar sesión', async () => {
    const user = userEvent.setup()
    const fake = testClient()
    const app = open(fake.client)
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy()
    expect(fake.rpc).not.toHaveBeenCalled()

    async function login(email: string) {
      await user.type(screen.getByLabelText('Correo electrónico'), email)
      await user.type(screen.getByLabelText('Contraseña'), 'ClaveDePrueba')
      await user.click(button('Iniciar sesión'))
      await screen.findByRole('navigation')
    }

    await login('a@example.test')
    await user.click(button('Crear ciclo'))
    await user.type(screen.getByLabelText('Nombre'), 'Ciclo privado de A')
    await user.click(button('Guardar ciclo'))
    await screen.findByRole('heading', { name: 'Ciclo privado de A' })
    await user.click(button('Cerrar sesión'))
    await login('b@example.test')
    await user.click(screen.getByRole('link', { name: 'Ciclos y cursos' }))
    expect(screen.queryByRole('heading', { name: 'Ciclo privado de A' })).toBeNull()
    await user.click(button('Cerrar sesión'))
    await login('a@example.test')
    app.unmount()
    open(fake.client)
    expect(await screen.findByRole('heading', { name: 'Ciclo privado de A' })).toBeTruthy()

    act(() => fake.event('SIGNED_OUT'))
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Ciclo privado de A' })).toBeNull()
  })

  it('registra, solicita recuperación y actualiza la clave desde la sesión de recuperación', async () => {
    const user = userEvent.setup()
    const fake = testClient()
    open(fake.client)
    await user.click(button('Crear cuenta'))
    await user.type(screen.getByLabelText('Correo electrónico'), 'a@example.test')
    await user.type(screen.getByLabelText('Contraseña'), 'ClaveDePrueba')
    await user.click(button('Crear cuenta de estudiante'))
    expect(await screen.findByText('Revisa tu correo para confirmar la cuenta.')).toBeTruthy()
    expect(fake.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@example.test' }))

    await user.click(button('Olvidé mi contraseña'))
    await user.type(screen.getByLabelText('Correo electrónico'), 'a@example.test')
    await user.click(button('Recuperar contraseña'))
    expect(fake.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@example.test', {
      redirectTo: new URL('/recuperar-clave', window.location.origin).href,
    })
    act(() => fake.event('PASSWORD_RECOVERY', 'a@example.test'))
    expect(screen.queryByRole('navigation')).toBeNull()
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClaveDePrueba')
    await user.click(button('Guardar nueva contraseña'))
    expect(fake.auth.updateUser).toHaveBeenCalledWith({ password: 'NuevaClaveDePrueba' })
    expect(await screen.findByRole('navigation')).toBeTruthy()
  })

  it('pide confirmar la importación y conserva la copia local', async () => {
    const user = userEvent.setup()
    const fake = testClient()
    const local = JSON.stringify(demoData())
    localStorage.setItem(STORAGE_KEY, local)
    fake.event('SIGNED_IN', 'a@example.test')
    open(fake.client)
    await user.click(await screen.findByRole('button', { name: 'Revisar importación' }))
    expect(fake.rpc).toHaveBeenCalledTimes(1)
    await user.click(button('Confirmar copia a mi cuenta'))
    await screen.findByText('Cambios guardados.')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(local)
    expect(screen.queryByRole('button', { name: 'Revisar importación' })).toBeNull()
    const request = fake.rpc.mock.calls[1][1]
    expect(request.expected_owner).toBe('a@example.test')
    expect(JSON.stringify(request)).not.toContain('demo-course')
  })
})
