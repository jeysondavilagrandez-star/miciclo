import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderRoute(path: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Navegación de MiCiclo', () => {
  it.each([
    ['/', 'Inicio'],
    ['/cursos', 'Ciclos y cursos'],
    ['/calendario', 'Calendario'],
    ['/notas', 'Notas'],
    ['/ajustes', 'Ajustes'],
  ])('muestra %s y marca su enlace activo', (path, title) => {
    const html = renderRoute(path)
    expect(html).toMatch(new RegExp(`<h1[^>]*>${title}</h1>`))
    expect(html).toMatch(new RegExp(`<a[^>]*aria-current="page"[^>]*href="${path}"[^>]*>${title}</a>`))
  })

  it('muestra una página de recuperación para rutas desconocidas', () => {
    expect(renderRoute('/desconocida')).toContain('Página no encontrada')
  })
})
