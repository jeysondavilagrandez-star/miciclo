import { useState } from 'react'
import { browserStorage, loadAcademicData, saveAcademicData } from './services/localAcademicRepository'
import { HomePage } from './components/HomePage'
import { SettingsPage } from './components/SettingsPage'
import { upsertById } from './features/courses/academicActions'
import type { AcademicData } from './types/academic'
import { NavLink, Route, Routes } from 'react-router'
import { Page } from './components/Page'
import { CalendarPage } from './features/calendar/CalendarPage'
import { CoursesPage } from './features/courses/CoursesPage'
import { GradesPage } from './features/grades/GradesPage'

const navigation = [
  { to: '/', label: 'Inicio' },
  { to: '/cursos', label: 'Ciclos y cursos' },
  { to: '/calendario', label: 'Calendario' },
  { to: '/notas', label: 'Notas' },
  { to: '/ajustes', label: 'Ajustes' },
]

export default function App() {
  const [snapshot, setSnapshot] = useState(() => loadAcademicData(browserStorage))
  const { data, error } = snapshot

  function update(data: AcademicData) {
    setSnapshot(saveAcademicData(browserStorage, snapshot, data))
  }
  return (
    <div className="mx-auto grid min-h-dvh max-w-7xl md:grid-cols-[16rem_minmax(0,1fr)]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3">
        Ir al contenido
      </a>
      <header className="border-b border-line bg-white px-4 py-5 sm:px-8 md:border-r md:border-b-0 md:px-6 md:py-10">
        <NavLink to="/" end className="inline-flex items-center gap-3 font-semibold text-ink">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-brand text-white">M</span>
          MiCiclo
        </NavLink>
        <nav aria-label="Navegación principal" className="mt-4 flex flex-wrap gap-1 md:mt-10 md:flex-col">
          {navigation.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-wash aria-[current=page]:bg-mint aria-[current=page]:text-brand"
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main id="contenido" tabIndex={-1} className="px-4 py-8 sm:px-8 md:px-12 md:py-14">
        <p className="mb-5 text-sm text-muted">Modo local · datos guardados en este navegador</p>
        {error && <p role="alert" className="panel error mb-4">{error}</p>}
        <Routes>
          <Route path="/" element={<HomePage data={data} />} />
          <Route path="/cursos" element={<CoursesPage data={data} onUpdate={update} />} />
          <Route path="/calendario" element={<CalendarPage data={data} onUpdate={(activities) => update({ ...data, activities })} />} />
          <Route path="/notas" element={<GradesPage courses={data.courses} onUpdate={(course) => update({ ...data, courses: upsertById(data.courses, course) })} />} />
          <Route path="/ajustes" element={<SettingsPage target={data.defaultTarget} onUpdate={(defaultTarget) => update({ ...data, defaultTarget })} />} />
          <Route path="*" element={<Page title="Página no encontrada" description="Usa el menú para volver a una sección de MiCiclo." />} />
        </Routes>
      </main>
    </div>
  )
}
