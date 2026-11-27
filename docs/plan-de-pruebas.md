# Plan de pruebas / tester — Portafolio Digital SENA

**Versión:** 1.0 · **Fecha:** 26 de noviembre de 2026  
**Tipo:** matriz manual; no existe aún un runner automatizado en el proyecto.

## 1. Estado de pruebas actual

- `npm run build`: pasa; valida sintaxis JavaScript con `node --check`.
- No existen `npm test`, framework de pruebas, fixtures versionados ni pruebas
  automatizadas de API/UI.
- Se han realizado pruebas visuales simuladas en navegador para alta de sede,
  instructor y aprendiz en 320, 375, 390, 1024 y 1440 px; no escribieron en
  PostgreSQL.
- En esa ejecución simulada, las vistas de cuentas/admin e instructor (fichas y
  formulario de aprendiz/instructor) no excedieron el ancho del viewport en
  ninguno de los cinco tamaños. No cubre el resto de vistas ni reemplaza Safari
  iOS/dispositivos físicos.
- No se declara aprobada una prueba end-to-end contra producción. No ejecutar
  operaciones de escritura sobre Neon durante esta revisión.

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
| T-01 | Catálogo público | Abrir aplicación sin sesión; consultar catálogo. | La página y catálogo público cargan sin token. | Pendiente entorno aislado; captura T-03 |
| T-02 | Login correcto | Usar cuenta de cada rol preparada por administrador. | Rol correcto y menú correspondiente. | Pendiente con cuentas autorizadas; capturas U-01/U-02 |
| T-03 | Login incorrecto/bloqueo | Fallar contraseña cinco veces en entorno aislado. | Mensaje genérico; bloqueo 15 min según regla. | Pendiente |
| T-04 | Acceso privado sin sesión | Solicitar `/api/private/state` sin cookie. | Respuesta de autenticación requerida; sin datos privados. | Pendiente |
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

## 5. Criterios de salida

- Todos los casos críticos T-01, T-04, T-05, T-06 y T-11 aprobados en entorno
  aislado.
- Ninguna ruta devuelve datos privados sin sesión ni permite mutaciones desde
  un rol no autorizado.
- Ningún ancho de la matriz causa overflow horizontal del documento.
- Migraciones aplicadas en la rama objetivo con copia/plan de recuperación.
- Registrar defectos y decisión de producto sobre catálogo público independiente.
- Adjuntar capturas reales indicadas en `docs/capturas/README.md`.
