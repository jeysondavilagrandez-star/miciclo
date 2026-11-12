# H4 — Esquema, autenticación y persistencia

## Estado de miciclo-dev

Proyecto de desarrollo verificado por referencia `fbtjvkrkaxzxwoomjige`,
PostgreSQL 17.11. La [migración base](../supabase/migrations/20261112150854_academic_schema.sql)
está aplicada con la versión registrada por Supabase. El commit local de
respaldo anterior a la migración es `3158d8c`.

Las cinco tablas tienen RLS y permisos CRUD explícitos para el rol autenticado.
Las políticas restringen las filas a su propietario. Las claves foráneas
compuestas también comprueban la propiedad de ciclos y cursos vinculados.
La auditoría remota confirmó estas políticas, la ausencia de acceso anónimo
y un resultado vacío del asesor de seguridad.

La [migración transaccional](../supabase/migrations/20261112153318_academic_transactions.sql)
está aplicada en miciclo-dev. El archivo conserva el SHA-256 auditado. El
historial remoto contiene academic_schema y academic_transactions.

Se comprobó RLS en las cinco tablas y el bloqueo de DELETE directo para el rol
autenticado en las cuatro tablas académicas. Las dos funciones usan permisos del
invocador y solo el rol autenticado puede ejecutarlas. La Data API rechazó las
lecturas anónimas de las cinco tablas y de la función de carga. El asesor de
seguridad devolvió cero alertas.


## Auditoría de academic_transactions

La versión anterior definía cuatro DELETE dentro de la función de guardado
para actividades, evaluaciones, cursos y ciclos. Aplicar la migración
registraba la función. Invocar después esas ramas habría borrado las filas
indicadas y, para cursos o ciclos, activado las cascadas del esquema base.
No contenía DROP, TRUNCATE ni un UPDATE masivo. El UPDATE de preferencias
usaba WHERE por propietario y los cuatro UPSERT se acotaban por la clave
primaria, con RLS.

La revisión añade removed_at y utiliza UPDATE acotados por propietario e
identificadores para retirar registros de la vista. Conserva las filas,
notas y relaciones. Las actividades de un curso retirado se muestran como
generales. Se revoca DELETE directo para usuarios de la aplicación en las
cuatro tablas académicas. Permanecen las políticas RLS, los privilegios de
lectura, inserción y actualización, y las restricciones existentes.

La consulta de catálogos de miciclo-dev confirmó que la migración base es la
única registrada, que las cinco tablas tienen RLS y que las columnas y
funciones nuevas no existen. En PostgreSQL local se sembraron filas en las
cinco tablas antes de aplicar la propuesta. Los valores previos y las
políticas resultaron idénticos después. Las pruebas SQL verificaron también
dos cuentas, bajas lógicas, vínculos, pesos y rechazo del borrado directo.

SHA-256 del archivo auditado en el árbol de trabajo:
`06B968CE54A5B3F753F3279780D992507BB23BF9CFE919DE4C7BF5129B287E87`.

## Operaciones e importación

La aplicación prepara las diferencias entre los datos editados y los
guardados. La escritura transaccional valida propietario, revisión y suma de
ponderaciones. La revisión permite detectar conflictos entre sesiones de
MiCiclo y el identificador de operación admite reintentar el último guardado
sin duplicarlo. Las funciones SQL se ejecutan con los permisos del usuario
autenticado y respetan RLS. Las pruebas del esquema base se ejecutan antes de la revisión transaccional. Las escrituras de la aplicación pasan por
la función transaccional.

La importación se ofrece con confirmación a una cuenta sin registros.
Genera identificadores nuevos, conserva los vínculos y mantiene la copia del
navegador. La aplicación usa la misma lógica de notas y calendario en ambos
modos.

## Verificación

`npm run build`, `npm run lint` y `npm test` pasaron. Las pruebas de interfaz
usan un cliente simulado para cubrir registro, recuperación, cierre de sesión,
protección de rutas, separación de cuentas, recarga e importación.

Las dos migraciones y los archivos
[academic_security.sql](../supabase/checks/academic_security.sql) y
[academic_transactions.sql](../supabase/checks/academic_transactions.sql)
pasaron en PostgreSQL 18.6 embebido. Las pruebas SQL usan dos cuentas
sintéticas y revierten sus cambios. Para repetirlas con una instancia local
desechable de Supabase con ambas migraciones aplicadas, configura
`MICICLO_LOCAL_DATABASE_URL` y ejecuta desde PowerShell:

```powershell
psql $env:MICICLO_LOCAL_DATABASE_URL -X -v ON_ERROR_STOP=1 -f supabase/checks/academic_security.sql
psql $env:MICICLO_LOCAL_DATABASE_URL -X -v ON_ERROR_STOP=1 -f supabase/checks/academic_transactions.sql
```

## Prueba local de Auth con Mailpit

Windows tiene la CLI de Supabase disponible, pero `supabase start` informó
que no encontró Docker ni Podman. Por eso todavía no se crearon usuarios
locales ni se ejecutó el flujo de correo. La configuración de este repositorio
habilita confirmación de correo y Mailpit para el entorno local.

En Windows, instala y abre Docker Desktop con WSL 2 y comprueba que
`docker info` muestre un servidor en ejecución. Desde la raíz del repositorio,
inicia Supabase con `npx supabase@3.1.0 start` y espera a que arranque Mailpit.
El script usa la URL local `http://127.0.0.1:54321` y el buzón local
`http://127.0.0.1:54324`.

En la misma terminal, establece `MICICLO_LOCAL_SUPABASE_PUBLIC_KEY` con la
clave local Publishable (o la anon local) de la CLI. No uses una clave de
servicio. Luego ejecuta:

```powershell
node supabase/checks/auth-mailpit.mjs
```

La prueba crea dos usuarios ficticios con contraseñas aleatorias en memoria.
Verifica el correo de confirmación, inicio y cierre de sesión, recuperación,
lecturas y escrituras cruzadas, y persistencia de curso, evaluación y actividad
tras cerrar sesión. Solo admite el destino local. Los datos de prueba se
mantienen en el entorno local después de cada ejecución.

[Correo local con Mailpit](https://supabase.com/docs/guides/auth/testing-auth-flows) ·
[Docker Desktop con WSL 2](https://docs.docker.com/desktop/features/wsl)


## Pruebas pendientes con Auth real

miciclo-dev no tiene cuentas de Auth. El registro por correo está habilitado y requiere confirmación. Dos cuentas ordinarias de Auth ya confirmadas y dos sesiones independientes permiten probar aislamiento y persistencia sin modificar SMTP ni añadir miembros de la organización. Comprueba que las direcciones
locales de retorno estén permitidas antes de enviar enlaces. Si se necesita
cambiar la configuración de Auth, solicita autorización específica.

Para ejecutar el cliente de desarrollo conectado, usa PowerShell desde la
raíz del repositorio. La URL y la clave publicable están en el archivo local
ignorado por Git.

```powershell
$env:VITE_SUPABASE_ENABLED = 'true'
npm.cmd run dev -- --host localhost --port 5173 --strictPort
```

1. Abre http://localhost:5173 en dos perfiles independientes del navegador.
   Usa una cuenta por perfil. Verifica registro, confirmación de correo,
   recuperación de contraseña e inicio y cierre de sesión. Mantén las
   contraseñas en el navegador.
2. En A, crea un ciclo, un curso, una evaluación fechada con nota 0 y una
   actividad. Edita la evaluación desde el calendario y comprueba que el
   evento y la nota sigan vinculados. Recarga, cierra y abre sesión y verifica
   que se recuperen los cambios.
3. En B, comprueba que solo aparezcan sus registros y crea sus propios datos
   de prueba. Vuelve a A y confirma que sus datos no cambiaron.
4. En A, retira un curso de prueba y comprueba que la vista oculta su
   evaluación y conserva su actividad como general. La comprobación de
   conservación de filas y rechazo de borrado directo ya pasó en SQL local.
5. Si se prueba la importación, usa un perfil con copia local y una cuenta
   sin registros. Confirma que la copia local permanece después de importar.


## Dos cuentas temporales en miciclo-dev

Pendiente de autorización específica. Antes de crear cuentas, verifica que
el proyecto seleccionado sea miciclo-dev, referencia fbtjvkrkaxzxwoomjige.
La opción de menor exposición de credenciales es usar el panel del proyecto,
en Authentication → Users, y crear dos usuarios de prueba con contraseña y
confirmación individual. Deben ser usuarios ordinarios de Auth. Esta acción
no requiere invitarlos a la organización ni cambiar el SMTP o la regla de
confirmación global.

Si se automatiza, usa un proceso de servidor que llame a
`supabase.auth.admin.createUser({ email, password, email_confirm: true })`
para cada cuenta. Limita la URL al proyecto de desarrollo. Genera dos
contraseñas distintas y aleatorias. Conserva la credencial de administración
solo en el proceso autorizado, fuera de archivos del proyecto, variables
VITE, registros y chat. Usa después únicamente la clave publicable y dos
sesiones normales, cada una en un perfil de navegador separado.

Ejecuta los pasos de aislamiento y persistencia de esta guía. Además, desde
la sesión B consulta y modifica por ID las filas de A usando la Data API.
La lectura y la edición deben devolver cero filas. El borrado directo debe
devolver un error de permisos. Una baja solicitada por B con sus propias
credenciales y los IDs de A debe dejar intactos los datos de A. Repite la
verificación con las cuentas invertidas y registra solo resultados y códigos
de error. Cierra ambas sesiones. La limpieza remota de cuentas y datos queda
para una autorización separada.

La confirmación administrativa permite probar sesión, persistencia y RLS
sin envío de correo. El registro con confirmación y la recuperación por
correo se comprueban en el entorno local con Mailpit.

[Creación administrativa de usuarios de Auth](https://supabase.com/docs/reference/javascript/auth-admin-createuser)


[Políticas RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) ·
[Permisos de la Data API](https://supabase.com/docs/guides/api/securing-your-api) ·
[Recuperación de contraseña](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
