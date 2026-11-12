# MiCiclo — Plan de ejecución autónoma de Codex

**Objetivo:** realizar el máximo trabajo técnico sin intervención continua del usuario, respetando límites de seguridad. No prometer que Codex seguirá trabajando cuando la sesión o ejecución haya terminado: este plan se reanuda en la siguiente tarea, leyendo `docs/ESTADO.md`.

## Protocolo al iniciar cada sesión
1. Verificar ruta, rama, `git status`, archivos y dependencias; leer `AGENTS.md`, `docs/ESPECIFICACION_TECNICA.md`, `docs/ESTADO.md`.
2. Detectar el primer hito incompleto y confirmar que sus requisitos están disponibles.
3. Ejecutarlo autónomamente; crear/corregir tests y aplicar cambios locales seguros.
4. Registrar progreso en `docs/ESTADO.md` y cualquier decisión no definida en `docs/DECISIONES.md`.
5. Si hace falta intervención, detenerse con petición concreta: qué permiso o decisión falta, por qué y qué opción recomienda.

## Hitos

### H0. Inspección y cimentación
- Confirmar que React + TS + Vite está instalado, que `main` sigue a `origin/main` y no se pisan cambios.
- Añadir estructura modular: `features/courses`, `features/grades`, `features/calendar`, `components`, `lib`, `types`, `services`.
- Instalar React Router, Tailwind, Vitest, configuraciones de lint/test según compatibilidad.
- README actualizado y scripts npm; diseño inicial responsivo.
- **Aceptar cuando:** build + lint + tests básicos pasan; navegación y pantallas placeholder funcionan.

### H1. Núcleo de cálculos y editor de evaluaciones
- Modelos TypeScript, funciones puras de cálculo, validación y test exhaustivos.
- Editor agregar/editar/eliminar/ordenar evaluaciones, porcentaje, nombre y nota opcional.
- Diferenciar notas reales y simuladas; mostrar meta y notas necesarias.
- **Aceptar cuando:** ejemplos de la especificación coinciden exactamente; pruebas cubren límites.

### H2. Calendario integrado
- Calendario mensual y agenda por fecha, visualización de evaluaciones fechadas y actividades independientes.
- Edición de fechas sincronizada mediante una única fuente de datos.
- **Aceptar cuando:** fechas/nombres se ven en ambos módulos sin duplicados.

### H3. UX y persistencia provisional
- Vista Inicio/Cursos, formularios, estados vacíos, errores, accesibilidad y experiencia móvil.
- Datos de demostración o almacenamiento local temporal aislado mediante repositorio de datos.
- **Aceptar cuando:** flujo completo puede probarse sin Supabase; marcado como demo si no hay persistencia real.

### H4. Supabase: esquema y seguridad (requiere revisión/aprobación para ejecución remota)
- Elaborar propuesta de migraciones SQL versionadas y políticas RLS; tests con dos usuarios; variables `.env.example`.
- **Punto de intervención 1:** solicitar aprobación explícita para crear o modificar esquema remoto de `miciclo-dev` y confirmar credenciales necesarias. No pedir claves en el chat ni pegarlas en archivos públicos.
- Luego conectar Auth + PostgreSQL; probar CRUD e aislamiento.
- **Aceptar cuando:** datos persistidos y acceso cruzado denegado.

### H5. Calidad previa a beta
- Tests integrales, accesibilidad móvil, gestión de errores, manejo de sesiones, backups/recuperación propuestos, documentación.
- **Punto de intervención 2:** solicitar confirmación para publicar beta y configurar dominio/despliegue.
- **Aceptar cuando:** checklist de seguridad y funcionamiento completo, ninguna clave expuesta.

### H6. Futuro, fuera del MVP
- PWA, recordatorios, sílabos con IA, alertas y replanificación. Solo tras autorización del nuevo alcance.

## Decisiones predeterminadas
- Idioma español, interfaz en zona horaria del usuario; fechas civiles sin zona para evaluaciones solo con día.
- Escala 0–20, nota objetivo 11 editable, sin redondeo por defecto.
- Nombre generado correlativamente por curso (`Evaluación N`), sin renombrar evaluaciones existentes al eliminar otra.
- Se pueden guardar configuraciones parciales; proyección final solo cuando pesos sumen 100.
- Sin pagos, IA, notificaciones externas ni servicios nuevos por defecto.

## Qué puede hacer sin consultar
- Editar código y documentación dentro del repositorio, añadir dependencias necesarias, ejecutar scripts, crear pruebas, reordenar módulos y corregir errores propios.

## Qué exige intervención
- Git destructivo o publicar cambios remotos sin una política de autorización clara.
- Ejecutar SQL en Supabase remoto o configurar políticas/cuenta fuera del plan aprobado.
- Contratar recursos, desplegar públicamente, introducir proveedores externos, usar datos reales o solicitar secretos/permisos.

## Formato obligatorio de los informes de Codex
```
HITO: Hx — [nombre]
IMPLEMENTADO: [resumen de funciones]
PRUEBAS: [comandos, resultado]
RIESGOS: [si los hay]
BLOQUEOS: [ninguno | acción concreta del usuario]
SIGUIENTE: [hito/acción]
```

## Prompt para activar el plan
«Lee `AGENTS.md`, `docs/ESPECIFICACION_TECNICA.md` y `docs/PLAN_DE_EJECUCION.md`. Examina el proyecto existente y empieza por el primer hito incompleto. Trabaja autónomamente en todas las tareas locales y reversibles, prueba y corrige errores, documenta el avance y detente únicamente en los puntos de intervención definidos o cuando haya un bloqueo técnico real. No realices modificaciones remotas, acciones destructivas, gastos ni despliegues sin mi autorización. Resume solo resultados y decisiones que requieran mi atención».
