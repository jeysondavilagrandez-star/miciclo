import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AcademicWorkspace } from '../../App'
import { browserStorage, loadAcademicData } from '../../services/localAcademicRepository'
import { copyForImport, isRevisionConflict, loadRemoteAcademics, saveRemoteAcademics } from '../../services/remoteAcademicRepository'
import type { RemoteSnapshot } from '../../services/remoteAcademicRepository'
import type { AcademicData } from '../../types/academic'

type Mutation = { before: RemoteSnapshot; next: AcademicData; id: string }

function hasRecords(data: AcademicData) {
  return data.terms.length > 0 || data.courses.length > 0 || data.activities.length > 0
}

export function RemoteWorkspace({ client, owner, email, onSignOut, signingOut, notice }: {
  client: SupabaseClient
  owner: string
  email?: string
  onSignOut: () => void
  signingOut: boolean
  notice: string
}) {
  const [snapshot, setSnapshot] = useState<RemoteSnapshot>()
  const [loadError, setLoadError] = useState(false)
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState<Mutation>()
  const [conflict, setConflict] = useState(false)
  const [confirmImport, setConfirmImport] = useState(false)
  const [message, setMessage] = useState('')
  const activeSave = useRef(false)
  const [local] = useState(() => loadAcademicData(browserStorage))

  useEffect(() => {
    let active = true
    void loadRemoteAcademics(client, owner).then((result) => {
      if (active) setSnapshot(result)
    }).catch(() => {
      if (active) setLoadError(true)
    })
    return () => { active = false }
  }, [client, owner, reload])

  function refresh() {
    setFailed(undefined)
    setConflict(false)
    setLoadError(false)
    setSnapshot(undefined)
    setReload((count) => count + 1)
  }

  async function save(mutation: Mutation) {
    if (activeSave.current) return
    activeSave.current = true
    setSaving(true)
    setFailed(undefined)
    setConflict(false)
    setMessage('')
    try {
      const result = await saveRemoteAcademics(client, owner, mutation.before, mutation.next, mutation.id)
      setSnapshot(result)
      setMessage('Cambios guardados.')
    } catch (error) {
      setConflict(isRevisionConflict(error))
      setFailed(mutation)
    } finally {
      activeSave.current = false
      setSaving(false)
    }
  }

  const signOut = <button className="button" disabled={signingOut || saving} onClick={onSignOut}>Cerrar sesión</button>

  if (!snapshot) return <main className="mx-auto max-w-xl space-y-4 px-4 py-10">
    {loadError ? <>
      <p role="alert" className="error">No se pudieron cargar tus datos. Comprueba la conexión o vuelve a iniciar sesión.</p>
      <button className="button" onClick={refresh}>Reintentar carga</button>
    </> : <p role="status">Cargando tus datos…</p>}
    {signOut}
    {notice && <p role="status">{notice}</p>}
  </main>

  function update(next: AcademicData) {
    if (snapshot && !failed) void save({ before: snapshot, next, id: crypto.randomUUID() })
  }

  const canImport = local.raw !== null && !local.error && !hasRecords(snapshot.data) && hasRecords(local.data)
  return <AcademicWorkspace retainRemoved data={snapshot.data} onUpdate={update} busy={saving || Boolean(failed)}
    account={<div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 break-all text-sm text-muted">{email}</p>
        {signOut}
      </div>
      {(saving || notice || message) && <p className="text-sm" role="status">{saving ? 'Guardando…' : notice || message}</p>}
      {failed && <div className="panel space-y-3">
        <p className="error" role="alert">{conflict
          ? 'Tus datos cambiaron en otra sesión. Recarga la versión guardada antes de editar.'
          : 'No se pudo confirmar el guardado. Puedes reintentar o consultar la versión guardada.'}</p>
        <div className="flex flex-wrap gap-2">
          {!conflict && <button className="button" onClick={() => { void save(failed) }}>Reintentar guardado</button>}
          <button className="button" onClick={refresh}>Cargar versión guardada</button>
        </div>
      </div>}
      {canImport && !saving && !failed && <section className="panel space-y-3">
        <h2>Datos de este navegador</h2>
        <p>Puedes copiar tus ciclos, cursos, evaluaciones y actividades a esta cuenta. Se conservará la copia local.</p>
        {confirmImport ? <div className="flex flex-wrap gap-2">
          <button className="button primary" onClick={() => {
            setConfirmImport(false)
            update(copyForImport(local.data))
          }}>Confirmar copia a mi cuenta</button>
          <button className="button" onClick={() => setConfirmImport(false)}>Cancelar</button>
        </div> : <button className="button" onClick={() => setConfirmImport(true)}>Revisar importación</button>}
      </section>}
    </div>} />
}
