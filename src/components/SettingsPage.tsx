import type { FormEvent } from 'react'
import { validGrade } from '../features/grades/calculations'
import { Page } from './Page'

export function SettingsPage({ target, onUpdate }: { target: number; onUpdate: (value: number) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(new FormData(event.currentTarget).get('target'))
    if (validGrade(value)) onUpdate(value)
  }

  return <Page title="Ajustes" description="Configura la meta predeterminada de los cursos nuevos.">
    <form className="panel mt-6 flex flex-wrap items-end gap-3" onSubmit={submit}>
      <label className="field">Meta predeterminada
        <input name="target" type="number" required min="0" max="20" step="any" defaultValue={target} />
      </label>
      <button className="button primary">Guardar preferencia</button>
    </form>
  </Page>
}
