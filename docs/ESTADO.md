# Estado de ejecución MiCiclo

Actualizado el 2026-11-12.

## Confirmado por el usuario / capturas de Codex
- Git local enlazado a GitHub con `main` siguiendo `origin/main`.
- Existe proyecto Supabase `miciclo-dev`; integración app ↔ Supabase aún pendiente.
- React + TypeScript + Vite instalados; build y lint funcionaron.

## Hitos
- [x] H0 Inspección y cimentación
- [x] H1 Cálculos y evaluaciones
- [x] H2 Calendario integrado
- [x] H3 UX y datos de prueba
- [ ] H4 Supabase y seguridad (migraciones aplicadas, pruebas con dos cuentas reales pendientes)
- [ ] H5 Beta

## Última ejecución
H0 completado. Se verificó que la rama local main sigue a origin/main y que el entorno tiene Node.js 26.13.1, npm 11.20.0, React 19.3.1, TypeScript 7.0.2 y Vite 8.3.8.

- Navegación y pantallas iniciales en español para Inicio, Ciclos y cursos, Calendario, Notas y Ajustes. La navegación se adapta al ancho disponible e indica la ruta activa.
- Estructura de módulos bajo src/features y componentes compartidos en src/components. Se reservaron src/lib, src/types y src/services para las fases siguientes.
- React Router 8.5.1, Tailwind CSS 4.3.5 y Vitest 5.1.0 añadidos a package.json y package-lock.json. Se integró Tailwind en vite.config.ts, se habilitó TypeScript estricto y se añadieron los scripts de pruebas.
- Se actualizaron src/App.tsx, src/main.tsx, src/index.css, index.html y README.md. Las pruebas de rutas están en src/App.test.tsx.
- npm run build y npm run lint pasaron. npm test pasó con 6 pruebas. Chrome sin interfaz renderizó Notas y Calendario con tamaños de ventana de 390 × 844 y 1440 × 900, respectivamente.
- Cambios locales sin commit. Siguiente hito, H1 — cálculos y editor de evaluaciones.

## Bloqueos y acciones del usuario
Para ejecutar Auth real local, falta habilitar un motor de contenedores en Windows. Para verificar persistencia e aislamiento en miciclo-dev faltan dos cuentas ordinarias de Auth confirmadas y dos sesiones independientes.

## H1 — Cálculos y evaluaciones
- Implementados el editor por curso, el orden, la validación y la simulación aislada. Los resúmenes usan los cálculos de src/features/grades y el ejemplo inicial de src/services/demo.ts.
- Build, lint y 23 pruebas aprobados. Los ejemplos de metas 11 y 15, el cero, pesos decimales, distribuciones incompletas y límites están cubiertos.
- Siguiente paso, H2. Sin bloqueos.

## H2 — Calendario integrado
- Implementados calendario mensual, agenda, próximos eventos, creación y edición de actividades, estado de completado y acceso directo al editor de Notas.
- La vista se deriva de las evaluaciones de cada curso y de las actividades independientes. Los cambios de fecha y nombre se reflejan sin guardar copias.
- Build, lint y 26 pruebas aprobados, incluidas las pruebas de integración en src/features/calendar/calendar.test.tsx.
- Siguiente paso, H3. Sin bloqueos.

## H3 — Experiencia y datos locales
- Implementados alta, edición, archivo y eliminación confirmada de ciclos, gestión de cursos, resumen de Inicio, ajustes de meta y persistencia local aislada en src/services/localAcademicRepository.ts.
- Build, lint y 30 pruebas aprobados. Las pruebas funcionales recorren ciclos, cursos, notas, simulación, actividades y recarga. Chrome verificó Inicio, Cursos, Notas y Calendario sin desplazamiento horizontal a 360 y 1440 píxeles.
- Siguiente paso, preparar la migración y las pruebas de seguridad de H4 localmente.

## H4 — Preparación local
- Preparados supabase/migrations/20261112145716_academic_schema.sql, supabase/checks/academic_security.sql, .env.example y docs/H4_SUPABASE.md.
- La migración se aplicó con éxito en PostgreSQL 18.6 embebido. Pasaron las pruebas SQL de dos usuarios para RLS, restricciones, vínculos cruzados, cascadas y rol anónimo.
- Estado de reanudación. H1–H3 completos. H4 local preparado. Pendientes autorización para aplicar la migración en miciclo-dev, integración de Auth y Data API, y comprobación con dos sesiones del entorno de desarrollo. No se ejecutaron cambios remotos ni despliegues.
- Verificación final posterior a H4 local. Build, lint y 31 pruebas de la aplicación aprobados. Se añadió cobertura para conservar las evaluaciones de ciclos archivados en el calendario.
- Los cambios quedaron en el árbol de trabajo local, sin commit ni push.

## H4 — Auditoría y primera migración en miciclo-dev
- Referencia verificada fbtjvkrkaxzxwoomjige, PostgreSQL 17.11. Historial inicialmente vacío y sin colisiones. CLI 3.1.0 comprobada. Respaldo local en 3158d8c.
- Esquema base aplicado como 20261112150854_academic_schema.sql. RLS activa en las cinco tablas, políticas por propietario, permisos autenticados verificados y sin alertas del asesor de seguridad.
- Implementados Auth, rutas privadas, recuperación y adaptador transaccional para ciclos, cursos, evaluaciones y actividades. La importación confirma la copia y conserva el origen local. La lógica de cálculos no cambió.
- Ambas suites SQL locales pasaron. Build, lint y 34 pruebas de aplicación aprobados. Las pruebas de Auth usan un cliente simulado.
- La confirmación para academic_transactions expiró en el primer intento. El conector rechazó el segundo. Historial verificado con solo la migración base. Modo local habilitado mientras falta la segunda migración.
- Siguiente paso tras la confirmación. Aplicar la migración transaccional, verificar Auth y Data API con dos cuentas de prueba, y luego iniciar H5. Sin push ni publicación.

## H4 — Revisión de academic_transactions
- La nueva propuesta reemplaza los cuatro DELETE de la función por bajas lógicas, conserva filas y vínculos y revoca el borrado directo de las cuatro tablas académicas para el cliente autenticado.
- PostgreSQL local conservó valores preexistentes y políticas de las cinco tablas al aplicar la propuesta. Ambas suites SQL pasaron. En miciclo-dev se comprobó por catálogo que la base es compatible y que la migración sigue pendiente. No se intentó aplicarla.
- Verificaciones locales de H4 y H5. Build, lint y 38 pruebas aprobados. Chrome comprobó Inicio, Cursos, Calendario y Notas a 360 y 1440 píxeles sin desbordamiento horizontal.
- Próximo punto de decisión. Autorizar, si procede, la versión auditada de academic_transactions. Auth y persistencia con dos sesiones reales siguen pendientes.

## H4 — Migración auditada aplicada
- La herramienta aprobó y aplicó exclusivamente academic_transactions a miciclo-dev (fbtjvkrkaxzxwoomjige). Historial verificado con 20261112150854 academic_schema y 20261112153318 academic_transactions. El SQL conserva el SHA-256 auditado.
- Verificados por catálogo RLS en cinco tablas, permisos de las dos funciones como invocador y prohibición de DELETE directo en las cuatro tablas académicas para authenticated. El asesor de seguridad no informó alertas. La Data API denegó las lecturas anónimas de las cinco tablas y de la función de carga.
- Build, lint, 38 pruebas de aplicación y ambas suites SQL locales pasaron. Los casos locales confirmaron que las bajas lógicas conservan filas y relaciones.
- La guía de H4 documenta la prueba real con dos perfiles. Pendientes dos cuentas de prueba con acceso al correo. Sin push ni publicación.

## H4 — Preparación y comprobaciones de Auth y correo
- En miciclo-dev se verificó de solo lectura que el registro por email está habilitado, exige confirmación y aún no hay cuentas de Auth. La Data API volvió a denegar las lecturas anónimas de las cinco tablas y la función de carga. No se crearon cuentas remotas ni se alteraron Auth o SMTP.
- Supabase CLI 3.1.0 no pudo iniciar la pila local porque no detectó Docker ni Podman. Se prepararon la configuración local con Mailpit y la prueba supabase/checks/auth-mailpit.mjs para dos cuentas ficticias. Se verificó la sintaxis del script. La prueba completa queda pendiente.
- Build, lint y 40 pruebas pasaron. PostgreSQL embebido volvió a comprobar aislamiento con dos usuarios SQL, preservación de filas y políticas, y bajas lógicas. Las pruebas de Auth de la aplicación usan un cliente simulado.
- Siguiente paso. Instalar e iniciar Docker Desktop con WSL 2 para ejecutar las pruebas reales locales. Después verificar persistencia y aislamiento en miciclo-dev con dos cuentas de Auth confirmadas, sin acceso administrativo para los estudiantes.

## H4 — Verificación de Windows y preparación de dos sesiones
- WSL no está operativo. wsl.exe está presente, pero el comando de estado devolvió 50 y el de versión no devolvió una versión. Docker Desktop y Docker Engine no están disponibles. La instalación de WSL 2 y Docker Desktop queda a cargo del usuario. El flujo local de Auth con Mailpit y la prueba en navegador quedan pendientes.
- Se amplió la prueba de Mailpit para comprobar que la Data API rechaza los borrados directos, que una baja cruzada no altera los registros y que el ciclo también se recupera tras cerrar y volver a iniciar sesión. Se verificó la sintaxis del script.
- Pasaron build, lint, las 40 pruebas automatizadas y las pruebas SQL locales de aislamiento y conservación.
- Se documentó el procedimiento de alta administrativa de dos cuentas ordinarias verificadas para miciclo-dev. No se crearon cuentas ni se modificó Auth remoto.
