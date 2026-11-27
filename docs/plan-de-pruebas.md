# Plan de pruebas / tester — Portafolio Digital SENA

**Versión:** 1.0 · **Fecha:** 26 de noviembre de 2026  
**Tipo:** matriz manual; no existe aún un runner automatizado en el proyecto.

## 1. Estado de pruebas actual

- `npm run build`: pasa; valida sintaxis JavaScript con `node --check`.
- No existen `npm test`, framework de pruebas, fixtures versionados ni pruebas
  funcionales automatizadas de API/UI. Sí existe el arnés de rendimiento
  controlado de solo lectura `npm run test:load:readonly`.
- Se han realizado pruebas visuales simuladas en navegador para alta de sede,
  instructor y aprendiz en 320, 375, 390, 1024 y 1440 px; no escribieron en
  PostgreSQL.
- En esa ejecución simulada, las vistas de cuentas/admin e instructor (fichas y
  formulario de aprendiz/instructor) no excedieron el ancho del viewport en
  ninguno de los cinco tamaños. No cubre el resto de vistas ni reemplaza Safari
  iOS/dispositivos físicos.
- Se ejecutó rendimiento de solo lectura en `127.0.0.1:3000`, con base local
  desechable confirmada por el usuario: `catalog`, `health-db` y
  `private-state-no-session`; 50 solicitudes por escenario, sin escrituras.
- No se ejecutó ni se declara aprobada una prueba contra Neon/producción.

## 2. Reglas para ejecutar el plan

1. Usar entorno de desarrollo o branch de base de datos desechable y cuentas
   autorizadas de prueba.
2. No usar datos personales reales ni compartir contraseñas.
3. Verificar primero `GET /api/health` y `GET /api/health/database`.
4. En pruebas de permisos, comprobar tanto la interfaz como la respuesta API.
5. Anotar fecha, versión/commit, navegador, ancho, resultado y evidencia
   redactada.
6. Si se prueba escritura, preparar limpieza/rollback antes de comenzar.

## 3. Matriz funcional

| ID | Caso | Pasos resumidos | Resultado esperado | Estado |
|---|---|---|---|---|
| T-01 | Catálogo público | Abrir aplicación sin sesión; consultar catálogo. | La página y catálogo público cargan sin token. | Ejecutado local en carga: 200 en 5/15/30; captura T-03 pendiente |
| T-02 | Login correcto | Usar cuenta de cada rol preparada por administrador. | Rol correcto y menú correspondiente. | Pendiente con cuentas autorizadas; capturas U-01/U-02 |
| T-03 | Login incorrecto/bloqueo | Fallar contraseña cinco veces en entorno aislado. | Mensaje genérico; bloqueo 15 min según regla. | Pendiente |
| T-04 | Acceso privado sin sesión | Solicitar `/api/private/state` sin cookie. | Respuesta de autenticación requerida; sin datos privados. | Ejecutado local en carga: 401 esperado en 5/15/30; captura pendiente |
| T-05 | Separación por rol | Intentar operación de otro rol desde API. | Respuesta 403; sin cambios en datos. | Pendiente |
| T-06 | Sede/instructor | Sin sede activa abrir formulario; luego crear/activar sede en entorno de prueba y crear instructor. | Mensaje/atajo a Sedes; select solo con sedes activas; API rechaza sede inválida/inactiva. | Simulado en UI; API/DB pendiente; capturas U-05/U-06 |
| T-07 | Ficha y aprendiz | Asignar ficha al instructor y añadir aprendiz. Probar ficha no asignada por separado. | Alta permitida solo en ficha autorizada. | Simulado en UI; DB pendiente; capturas U-07/U-09 |
| T-08 | Actividad y evidencia | Crear actividad propia, entregar archivo válido, probar >10 MB/no permitido. | Entrega protegida; rechazos claros; estado consistente. | Pendiente |
| T-09 | Calificación | Calificar entrega con nota dentro y fuera de 0–5. | Solo instructor autorizado; checks de nota/resultado. | Pendiente |
| T-10 | Coordinación | Crear observación como coordinador; intentar repetir con aprendiz. | Coordinador permitido; aprendiz recibe 403. | Pendiente |
| T-11 | Contraseña/logout | Cambiar contraseña, probar antigua/nueva, cerrar sesión. | Contraseña vieja no funciona; sesiones previas revocadas. | Pendiente |
| T-12 | Migración limpia/repetida | Aplicar en DB de prueba y ejecutar de nuevo. | Primera aplicación marca; segunda informa ya aplicada. | Pendiente en branch de prueba; captura T-04 |

### Evidencias del cuaderno de Colab

Referencia entregada: [Portafolio SENA — Colab](https://colab.research.google.com/drive/1MIwKuE0BwBDQ6LMkV98RqwA8YIjLbZ2S).
Durante esta revisión el enlace solicitó inicio de sesión; el contenido, sus
celdas y resultados no están verificados. Si el propietario concede acceso,
anotar ID de celda, fecha, entorno, salida y si hace escrituras. No ejecutar
celdas contra Neon de producción. La evidencia visual condicional es T-07;
no reemplazarla por la pantalla de autenticación de Google.

### Flujos por rol, escritorio/móvil y estados iniciales observados

El escritorio (desde 901 px) presenta navegación lateral; hasta 900 px usa
menú móvil desplegable. La navegación conserva el mismo módulo y autorización
por rol. El login se apila en una columna hasta 650 px. La matriz responsive
separa los anchos probados de la existencia de datos: sin registros se esperan
los mensajes de estado vacío siguientes, no errores de carga.

| Rol / acceso | Flujo de escritorio y móvil | Reglas de validación observadas | Estado vacío inicial condicionado a no tener registros |
|---|---|---|---|
| Acceso público | Catálogo sin sesión; documento/contraseña; al autenticar abre el inicio del rol. Botón del ojo disponible; login apilado en móvil. | Documento de 6–12 dígitos en alta; contraseña 10–128 caracteres; cinco fallos bloquean 15 min; límite por IP. | Catálogo: “No hay programas publicados”; si falla el endpoint muestra indisponibilidad temporal. |
| Administrador | Panel, Sedes, Programas, Fichas y competencias, Cuentas e instructores. Mismos accesos desde menú móvil. | Instructor requiere sede activa; ficha tiene programa/instructor jefe y fecha final posterior a la inicial; rol solo servidor. | Sedes: “Crea la primera sede”; tablas sin filas: “Sin registros todavía”. Sin sede activa, se muestra aviso y enlace a Sedes. |
| Instructor | Mis fichas, Actividades, Evaluar evidencias, Riesgos y Portafolio docente. | Solo fichas/competencias asignadas; crea aprendiz en ficha autorizada; tipos de material y visibilidad restringidos; riesgo Bajo/Medio/Alto. | Actividades: “No hay actividades”; evaluación usa tabla vacía; riesgos/materiales/observaciones indican que aún no hay registros. |
| Aprendiz | Resumen, Mi ruta formativa, Evidencias, Mis notas, Recursos y Notificaciones. | Solo ruta/entregas de su ficha; archivo permitido hasta 10 MB; calificación 0–5; notas privadas. | Actividades sin asignación, notas “Aún no tienes notas”, recursos “Sin recursos publicados” y notificaciones “No tienes notificaciones”. |
| Coordinador | Resumen, Sedes activas, Instructores y Auditoría docente. | Observaciones solo por rol coordinador; sedes de consulta filtradas a activas. | Sedes: “No hay sedes activas”; tablas/materiales/observaciones muestran estado vacío. |

Estos estados se verificaron en las cadenas de renderizado y migraciones, no
mediante creación de datos. No representan el contenido actual de una cuenta o
base de datos real. Consultar las capturas U-01 a U-14 en el registro central.

## 4. Matriz responsive

Para cada ancho, probar login, menú, panel por rol, tablas/listas, formularios,
modales y textos largos. Medir:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

| Vista/rol | 320 | 375 | 390 | 1024 | 1440 | Resultado / evidencia |
|---|---:|---:|---:|---:|---:|---|
| Login/catálogo | ☐ | ☐ | ☐ | ☐ | ☐ | Pendiente; capturas U-01/U-02/U-03 |
| Admin: panel/sedes | ☐ | ☐ | ☐ | ☐ | ☐ | Pendiente; capturas U-04/U-05 |
| Admin: cuentas/instructor y modal | ☑ | ☑ | ☑ | ☑ | ☑ | Simulado; sin overflow; capturas U-06/U-08 |
| Admin: programas/fichas/competencias | ☐ | ☐ | ☐ | ☐ | ☐ | Pendiente; captura U-07 |
| Instructor: fichas y formulario de aprendiz | ☑ | ☑ | ☑ | ☑ | ☑ | Simulado; sin overflow; captura U-09 |
| Instructor: actividades/evaluación/riesgos | ☐ | ☐ | ☐ | ☐ | ☐ | Pendiente; capturas U-10/U-11 |
| Aprendiz: ruta/evidencias/recursos | ☐ | ☐ | ☐ | ☐ | ☐ | Pendiente; capturas U-12/U-13 |
| Coordinador: auditoría | ☐ | ☐ | ☐ | ☐ | ☐ | Pendiente; captura U-14 |
| Estructura / ER / verificación | N/A | N/A | N/A | N/A | N/A | Capturas T-01/T-05/T-06 pendientes |

En móvil, abrir/cerrar menú con teclado/táctil y confirmar targets de al menos
44 px donde aplique. En Safari iOS verificar inputs sin zoom automático,
orientación, safe areas, scroll de tablas y teclado en modal.

## 5. Protocolo de rendimiento controlado (solo lectura)

El ejecutor `scripts/stress-readonly.js` solo permite estos `GET`: `/api/health`,
`/api/health/database`, `/api/public/catalog`, `/api/auth/session` y
`/api/private/state`. Este último devuelve información según el rol autenticado
y se usa para medir por separado administrador, instructor y aprendiz mediante
sesiones autorizadas de staging. Cada solicitud recibe un timeout; el cuerpo de
la respuesta se drena sin almacenarlo ni imprimirlo.

La aplicación tiene un pool `pg` de hasta 5 conexiones. Por ello, el aumento de
concurrencia puede hacer cola en la aplicación y en la base de datos. El plan
avanza por oleadas de 5, 15 y 30 solicitudes simultáneas; por defecto hace una
ronda por nivel (50 solicitudes como máximo por escenario). Se puede repetir
cada nivel de 1 a 3 veces (máximo 150 solicitudes por ejecución). El proceso
espera entre niveles y se detiene si una oleada tiene un 5xx, un estado HTTP distinto
del esperado, un error de conexión/timeout o p95 superior a 5 segundos.

No usar producción. El script rechaza ese entorno: local permite únicamente
loopback; staging requiere HTTPS, coincidencia exacta del host aprobado y una
confirmación en variable de entorno. No se incluyen endpoints de escritura
(login, notas, tareas, entregas, administración, calificación, observaciones,
notificaciones, cambios de contraseña o borrados). Para un escenario privado,
configurar una sesión de prueba fuera del repositorio y no compartir el token.

Ejemplo PowerShell para un servidor local ya iniciado:

```powershell
$env:LOAD_TEST_BASE_URL = "http://127.0.0.1:3000"
$env:LOAD_TEST_TARGET_ENV = "local"
$env:LOAD_TEST_SCENARIO = "catalog"
npm run test:load:readonly
```

Escenarios permitidos: `health`, `health-db`, `catalog`, `auth-session` y
`private-state` y `private-state-no-session`. Este último siempre espera 401;
`private-state` sin token también espera 401 y con sesión válida espera 200.
Para medir cada rol, usar una cuenta de prueba de ese rol en un entorno local
aislado o staging autorizado y ejecutar un escenario por separado. El token se pasa mediante
`LOAD_TEST_SESSION_TOKEN` en la terminal, nunca en argumentos, capturas,
reportes, código ni archivos versionados. Un valor de sesión local y staging
usa nombres de cookie diferentes, que el script determina por entorno.

El reporte resume promedio, p95, máximo, frecuencias HTTP (incluidos 200, 401,
403, 429 y 5xx), errores de timeout/conexión, tasa del estado esperado y tasa
2xx. No guarda datos, no registra cuerpos y no modifica filas. Antes de una
prueba remota, confirmar por separado el host de staging, ventana de ejecución,
cuentas de prueba y límites aceptados. La ejecución contra staging no se ha autorizado ni realizado.

### Resultado local registrado

Una ronda por escalón, secuencialmente; 50 solicitudes en cada escenario, 150
en total. El servidor local se inició solo después de confirmar que la
configuración apuntaba a PostgreSQL local/desechable. Sin cookies ni tokens.

| Escenario | Concurrencia | Solicitudes | Promedio ms | p95 ms | Máximo ms | HTTP observado | Errores |
|---|---:|---:|---:|---:|---:|---|---|
| `catalog` | 5 | 5 | 1705.2 | 1967.9 | 1967.9 | 200: 5 | 0 |
| `catalog` | 15 | 15 | 409.1 | 704.0 | 704.0 | 200: 15 | 0 |
| `catalog` | 30 | 30 | 757.7 | 1348.1 | 1403.8 | 200: 30 | 0 |
| `health-db` | 5 | 5 | 140.7 | 171.3 | 171.3 | 200: 5 | 0 |
| `health-db` | 15 | 15 | 238.0 | 361.8 | 361.8 | 200: 15 | 0 |
| `health-db` | 30 | 30 | 397.5 | 675.3 | 706.2 | 200: 30 | 0 |
| `private-state-no-session` | 5 | 5 | 38.7 | 69.8 | 69.8 | 401: 5 (esperado) | 0 |
| `private-state-no-session` | 15 | 15 | 17.3 | 22.6 | 22.6 | 401: 15 (esperado) | 0 |
| `private-state-no-session` | 30 | 30 | 31.3 | 39.9 | 39.9 | 401: 30 (esperado) | 0 |

Las tres ejecuciones completaron todos los escalones; no hubo 5xx,
timeouts/conexiones ni corte automático. La tasa del estado esperado fue 100%
en todas las oleadas; el 0% 2xx del escenario privado es correcto porque se
esperaba 401. La primera oleada de catálogo fue más lenta que las siguientes;
con una sola ronda y una base local estos datos son una muestra, no un SLA ni
una predicción de rendimiento de Neon/Render.

**T-08:** falta guardar una captura real de la consola con las tres salidas JSON
o una transcripción de terminal. El reporte impreso no muestra el token ni los
cuerpos de respuesta. Conservar también el resultado de `git status` por
separado; no incluir ventanas con variables de entorno.

**Evidencia recomendada:** captura de la consola con escenario, niveles,
métricas y códigos HTTP; recortar/redactar host si es privado y nunca mostrar
tokens, cookies, valores de entorno o cuerpos de respuesta. Ver T-08 en
[`docs/capturas/README.md`](./capturas/README.md).

## 7. Criterios de salida

- Todos los casos críticos T-01, T-04, T-05, T-06 y T-11 aprobados en entorno
  aislado.
- Ninguna ruta devuelve datos privados sin sesión ni permite mutaciones desde
  un rol no autorizado.
- Ningún ancho de la matriz causa overflow horizontal del documento.
- Migraciones aplicadas en la rama objetivo con copia/plan de recuperación.
- Registrar defectos y decisión de producto sobre catálogo público independiente.
- Adjuntar capturas reales indicadas en `docs/capturas/README.md`.
