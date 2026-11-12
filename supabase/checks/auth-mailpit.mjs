import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'
import { createClient } from '@supabase/supabase-js'
import { isLocalSupabase, isPublicSupabaseConnection } from '../../src/services/supabaseConnection.ts'

const api = process.env.MICICLO_LOCAL_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const key = process.env.MICICLO_LOCAL_SUPABASE_PUBLIC_KEY ?? ''
const mailpit = 'http://127.0.0.1:54324'
const site = 'http://localhost:5173'

function client() {
  return createClient(api, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

function ok(result, step) {
  if (result.error) throw new Error(`${step}: ${result.error.code ?? result.error.status ?? 'error de API'}`)
  return result.data
}

async function getMail(path) {
  const response = await fetch(new URL(path, mailpit), { signal: AbortSignal.timeout(5000) })
  assert.equal(response.ok, true, 'Mailpit no respondió correctamente')
  return response.json()
}

async function emailLink(email, type) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const { messages } = await getMail('/api/v1/messages?limit=100')
    for (const message of messages.filter((item) => item.To?.some(({ Address }) => Address === email))) {
      const { Text, HTML } = await getMail(`/api/v1/message/${encodeURIComponent(message.ID)}`)
      const links = `${Text ?? ''} ${HTML ?? ''}`.replaceAll('&amp;', '&').match(/https?:\/\/[^\s<>"']+/g) ?? []
      const link = links.filter((value) => URL.canParse(value)).map((value) => new URL(value)).find((url) =>
        url.pathname === '/auth/v1/verify' && url.searchParams.get('type') === type)
      if (link) {
        assert.equal(isLocalSupabase(link.origin), true, 'El enlace de Mailpit debe apuntar al Supabase local')
        return link
      }
    }
    await setTimeout(500)
  }
  throw new Error(`Mailpit no recibió el mensaje de ${type}`)
}

async function followEmail(email, type, destination) {
  const response = await fetch(await emailLink(email, type), { redirect: 'manual', signal: AbortSignal.timeout(5000) })
  assert.equal(response.status >= 300 && response.status < 400, true, 'Auth no redirigió al cliente')
  const redirect = new URL(response.headers.get('location'))
  assert.equal(redirect.origin + redirect.pathname, destination, 'Destino inesperado en el enlace de Auth')
  const fragment = new URLSearchParams(redirect.hash.slice(1))
  assert.equal(fragment.has('error'), false, 'Auth rechazó el enlace')
  return fragment
}

async function register(auth, suffix) {
  const email = `miciclo-${suffix}-${randomUUID()}@example.com`
  const password = randomBytes(24).toString('base64url')
  const result = ok(await auth.auth.signUp({ email, password, options: { emailRedirectTo: site } }), 'Registro')
  assert.equal(result.session, null, 'El registro debe exigir confirmación por correo')
  const before = await auth.auth.signInWithPassword({ email, password })
  assert.equal(before.error?.code, 'email_not_confirmed')
  await followEmail(email, 'signup', site + '/')
  return { email, password }
}

const load = async (auth, owner) => ok(await auth.rpc('load_academic_workspace', { expected_owner: owner }), 'Cargar datos')
const save = async (auth, owner, revision, changes) => ok(await auth.rpc('save_academic_changes', {
  expected_owner: owner, expected_revision: revision, mutation_id: randomUUID(), changes,
}), 'Guardar datos')

async function run() {
  assert.equal(isLocalSupabase(api) && isPublicSupabaseConnection(api, key), true,
    'Configura una clave pública del Supabase local en MICICLO_LOCAL_SUPABASE_PUBLIC_KEY')
  await getMail('/api/v1/messages?limit=1')

  const a = client()
  const b = client()
  const first = await register(a, 'a')
  const second = await register(b, 'b')
  const firstLogin = ok(await a.auth.signInWithPassword(first), 'Inicio A')
  const secondLogin = ok(await b.auth.signInWithPassword(second), 'Inicio B')
  const owner = firstLogin.user.id
  const other = secondLogin.user.id
  assert.notEqual(owner, other)
  console.log('Registro, confirmación e inicio de sesión: dos cuentas locales')

  const [term, course, assessment, activity] = Array.from({ length: 4 }, () => randomUUID())
  await save(a, owner, 0, {
    terms: [{ id: term, name: 'Ciclo de prueba' }],
    courses: [{ id: course, term_id: term, name: 'Curso de prueba', passing_grade: 11, rounding_mode: 'none', next_assessment_number: 2 }],
    assessments: [{ id: assessment, course_id: course, name: 'Evaluación de prueba', position: 0, weight: 100, grade: 0 }],
    activities: [{ id: activity, course_id: course, title: 'Repaso de prueba', done: false }],
  })
  await save(a, owner, 1, {
    assessments: [{ id: assessment, course_id: course, name: 'Evaluación editada', position: 0, weight: 100, grade: 0 }],
  })

  const beforeCrossAccess = await load(a, owner)
  for (const [table, id, field] of [
    ['academic_terms', term, 'name'], ['courses', course, 'name'],
    ['assessments', assessment, 'name'], ['activities', activity, 'title'],
  ]) {
    assert.deepEqual(ok(await b.from(table).select('id').eq('id', id), 'Lectura cruzada'), [])
    assert.deepEqual(ok(await b.from(table).update({ [field]: 'Ajeno' }).eq('id', id).select('id'), 'Edición cruzada'), [])
    const rejected = await b.from(table).delete().eq('id', id)
    assert.equal(rejected.error?.code, '42501', 'La Data API debe denegar el borrado directo')
  }
  assert.equal(await load(b, owner), null)
  assert.deepEqual((await load(b, other)).courses, [])
  await save(b, other, 0, {
    removeTerms: [term], removeCourses: [course], removeAssessments: [assessment], removeActivities: [activity],
  })
  assert.deepEqual(await load(a, owner), beforeCrossAccess, 'Una baja ajena no debe cambiar los datos de A')
  console.log('Aislamiento de lectura y escritura mediante la Data API')

  ok(await a.auth.signOut({ scope: 'local' }), 'Cerrar sesión A')
  const fresh = client()
  ok(await fresh.auth.signInWithPassword(first), 'Reingreso A')
  const persisted = await load(fresh, owner)
  assert.equal(persisted.terms[0].id, term)
  assert.equal(persisted.courses[0].id, course)
  assert.equal(persisted.courses[0].assessments[0].name, 'Evaluación editada')
  assert.equal(persisted.courses[0].assessments[0].grade, 0)
  assert.equal(persisted.activities[0].id, activity)
  ok(await fresh.auth.signOut({ scope: 'local' }), 'Cerrar sesión de reingreso')
  console.log('Persistencia de curso, evaluación y actividad tras iniciar sesión de nuevo')

  const recoveryPath = site + '/recuperar-clave'
  ok(await a.auth.resetPasswordForEmail(first.email, { redirectTo: recoveryPath }), 'Solicitar recuperación')
  const recovery = await followEmail(first.email, 'recovery', recoveryPath)
  assert.equal(recovery.get('type'), 'recovery')
  ok(await a.auth.setSession({
    access_token: recovery.get('access_token') ?? '',
    refresh_token: recovery.get('refresh_token') ?? '',
  }), 'Abrir sesión de recuperación')
  const newPassword = randomBytes(24).toString('base64url')
  ok(await a.auth.updateUser({ password: newPassword }), 'Cambiar contraseña')
  ok(await a.auth.signOut({ scope: 'local' }), 'Cerrar sesión de recuperación')
  assert.equal((await a.auth.signInWithPassword(first)).error?.code, 'invalid_credentials')
  ok(await a.auth.signInWithPassword({ email: first.email, password: newPassword }), 'Acceder con contraseña nueva')
  ok(await a.auth.signOut({ scope: 'local' }), 'Cerrar sesión A')
  ok(await b.auth.signOut({ scope: 'local' }), 'Cerrar sesión B')
  assert.equal(ok(await a.auth.getSession(), 'Sesión final A').session, null)
  assert.equal(ok(await b.auth.getSession(), 'Sesión final B').session, null)
  console.log('Recuperación de contraseña y cierre de sesión')
}

run().catch((error) => {
  const message = error instanceof Error && (!error.code || error.code === 'ERR_ASSERTION') && !error.cause ? error.message : 'No se pudo conectar al entorno local'
  // Assertion details can contain URLs with tokens. Keep only the test message.
  console.error(message.split('\n')[0])
  process.exitCode = 1
})
