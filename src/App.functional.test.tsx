// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { civilToday, formatDay } from './lib/dates'
import { STORAGE_KEY } from './services/localAcademicRepository'

function openApp(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

const button = (name: string) => screen.getByRole('button', { name })
const link = (name: string) => screen.getByRole('link', { name })

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('flujo local de MiCiclo', () => {
  it('crea ciclo y curso, registra y simula notas, vincula el calendario y recupera los datos', async () => {
    const user = userEvent.setup()
    const app = openApp()
    await user.click(link('Ciclos y cursos'))
    await user.click(button('Crear ciclo'))
    await user.type(screen.getByLabelText('Nombre'), '2026-II')
    await user.click(button('Guardar ciclo'))
    await user.click(button('Editar ciclo 2026-II'))
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Segundo ciclo')
    await user.click(button('Guardar ciclo'))
    await user.click(button('Agregar curso a Segundo ciclo'))
    await user.type(screen.getByLabelText('Nombre'), 'Estadística')
    await user.click(button('Guardar curso'))
    await user.click(button('Editar curso Estadística'))
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Estadística I')
    await user.click(button('Guardar curso'))
    await user.click(link('Gestionar evaluaciones de Estadística I'))
    await user.click(button('Agregar evaluación'))
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Evaluación 1')
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Examen')
    fireEvent.change(screen.getByLabelText('Peso (%)'), { target: { value: '100' } })
    const today = civilToday()
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: today } })
    await user.click(button('Guardar evaluación'))
    await user.click(button('Simular notas'))
    await user.type(screen.getByLabelText('Nota simulada de Examen'), '20')
    expect(screen.getByText('Diferencia de puntos acumulados: 20.')).toBeTruthy()

    await user.click(link('Calendario'))
    const agenda = screen.getByRole('region', { name: 'Agenda' })
    expect(within(agenda).getAllByRole('heading', { name: 'Examen' })).toHaveLength(1)
    await user.click(button('Agregar actividad'))
    await user.type(screen.getByLabelText('Título'), 'Repasar fórmulas')
    await user.click(button('Guardar actividad'))
    await user.click(button('Marcar completada'))
    await user.click(link('Editar en Notas'))
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Examen')
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Examen final')
    await user.type(screen.getByLabelText('Nota real (opcional)'), '0')
    await user.click(button('Guardar evaluación'))
    expect(screen.getByText(/100 % · 0/)).toBeTruthy()
    app.unmount()

    openApp('/calendario')
    expect(screen.getAllByRole('heading', { name: 'Examen final' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Repasar fórmulas' })).toBeTruthy()
    expect(button('Completada').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: formatDay(today) })).toBeTruthy()
    await user.click(link('Ciclos y cursos'))
    expect(screen.getByRole('heading', { name: 'Estadística I' })).toBeTruthy()
    await user.click(button('Eliminar ciclo Segundo ciclo'))
    await user.click(button('Confirmar eliminación'))
    expect(screen.queryByRole('heading', { name: 'Estadística I' })).toBeNull()
    await user.click(link('Calendario'))
    expect(screen.queryByRole('heading', { name: 'Examen final' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Repasar fórmulas' })).toBeTruthy()
  })

  it('archiva y reactiva un ciclo y elimina un curso con confirmación', async () => {
    const user = userEvent.setup()
    openApp('/cursos')
    await user.click(button('Archivar ciclo'))
    expect(screen.getByText('Archivado')).toBeTruthy()
    await user.click(button('Reactivar ciclo'))
    expect(screen.getByText('Activo')).toBeTruthy()
    await user.click(button('Eliminar curso Curso de ejemplo'))
    await user.click(button('Cancelar eliminación'))
    expect(screen.getByRole('heading', { name: 'Curso de ejemplo' })).toBeTruthy()
    await user.click(button('Eliminar curso Curso de ejemplo'))
    await user.click(button('Confirmar eliminación'))
    await user.click(link('Notas'))
    expect(screen.getByText(/Crea un curso en/)).toBeTruthy()
  })

  it('conserva los datos corruptos y muestra el aviso', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEY, '{malformado')
    openApp('/ajustes')
    expect(screen.getByRole('alert').textContent).toContain('No se pudieron leer')
    await user.click(button('Guardar preferencia'))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{malformado')
  })

  it('no sobrescribe los cambios guardados desde otra pestaña', async () => {
    const user = userEvent.setup()
    openApp('/ajustes')
    localStorage.setItem(STORAGE_KEY, '{"otra":"pestaña"}')
    await user.click(button('Guardar preferencia'))
    expect(screen.getByRole('alert').textContent).toContain('cambiaron')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"otra":"pestaña"}')
  })
})
