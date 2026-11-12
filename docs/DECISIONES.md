# Registro de decisiones — MiCiclo

Anotar aquí decisiones no críticas adoptadas para avanzar, con fecha, alternativa descartada y justificación. Las decisiones de producto sustanciales requieren autorización del usuario.

| Fecha | Decisión | Motivo | Revisable |
|---|---|---|---|
| 2026-11-12 | Español y escala inicial 0–20 | MVP orientado a estudiantes en Perú | Sí |
| 2026-11-12 | Nota objetivo inicial 11 y sin redondeo | Valor de demostración, configurable | Sí |
| 2026-11-12 | React Router en modo declarativo y pruebas de rutas con MemoryRouter | Las rutas del MVP se sirven desde Vite y las pruebas de H0 verifican la pantalla y el enlace activo sin añadir un entorno DOM | Sí |
| 2026-11-12 | Ponderaciones en centésimas porcentuales y escenarios en memoria | La suma de pesos se comprueba exactamente y el escenario queda separado de las notas guardadas | Sí |
| 2026-11-12 | Semanas de lunes a domingo y hora guardada con zona IANA | Conserva la fecha civil de los eventos y explicita la zona al mostrar horas | Sí |
| 2026-11-12 | Persistencia versionada en localStorage, con demostración inicial | Permite recorrer el MVP sin cuenta y conserva la copia guardada si el navegador informa un conflicto o datos inválidos | Sí |
| 2026-11-12 | Eliminar un ciclo o curso requiere confirmación y conserva las actividades | Las evaluaciones pertenecen al curso y las actividades vinculadas pasan a ser generales | Sí |
| 2026-11-12 | Redondeo al entero más cercano como opción de aprobación | El promedio y las proyecciones conservan su precisión. El resultado redondeado solo aparece cuando existe un promedio final | Sí |
| 2026-11-12 | Políticas RLS por propietario y claves foráneas compuestas | Aísla los registros y protege los vínculos incluso si una petición usa un identificador de otra cuenta | Sí |
| 2026-11-12 | Verificación de SQL con PostgreSQL embebido y cuentas sintéticas | Ejecuta las restricciones y políticas localmente. La validación de Auth y de la Data API queda para el entorno Supabase | Sí |
| 2026-11-12 | El calendario conserva eventos de ciclos archivados | Mantiene el historial académico. Inicio resume únicamente los cursos activos | Sí |
| 2026-11-12 | Activar Supabase mediante una variable explícita | El modo local sigue disponible mientras se completa la migración y la prueba con dos cuentas | Sí |
| 2026-11-12 | Escrituras de MiCiclo por diferencia, revisión e identificador de operación | Protege contra reintentos duplicados y conflictos entre sesiones. Mantiene en una transacción los cambios relacionados | Sí |
| 2026-11-12 | Importar como copia confirmada a una cuenta sin registros | Evita mezclar o duplicar datos y conserva la copia de origen | Sí |
| 2026-11-12 | Bajas lógicas en Supabase y revocación del borrado directo | Conserva los datos académicos y sus vínculos cuando se retiran de la vista de MiCiclo | Sí |
