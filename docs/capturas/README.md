# Registro de capturas de evidencia

**Estado general:** todas las capturas están pendientes; este cambio no crea
imágenes ni presenta pantallas simuladas como evidencia real. Guarde cada PNG
final en esta carpeta con el nombre exacto de la tabla y cambie su estado aquí
solo después de verificarla.

## Evidencia de usuario

| ID / archivo sugerido | Pantalla y contenido que debe verse | Qué validar antes de conservar | Estado |
|---|---|---|---|
| U-01 `01-login-movil-390px.png` | Login y catálogo público en 390 px; contraseña enmascarada y botón del ojo visible. | Lectura, controles táctiles y `scrollWidth <= clientWidth`; sin datos personales. | Pendiente |
| U-02 `02-login-escritorio-1440px.png` | Login en 1440 px, dos columnas, catálogo y botón del ojo. | Layout completo, textos sin recorte y sin overflow. | Pendiente |
| U-03 `03-login-ojo-visible-staging.png` | Botón del ojo en estado “Ocultar contraseña” y campo en tipo texto. | Solo valor dummy no productivo; no enviarlo y borrar/ocultar el valor en la imagen. | Pendiente |
| U-04 `04-panel-administrador.png` | Inicio del administrador y accesos a Sedes, Programas, Fichas y Cuentas. | Sesión de administrador y navegación disponible. | Pendiente |
| U-05 `05-admin-sedes.png` | Lista de sedes y acción de crear/activar; valores ficticios. | Se distinguen estados activa/inactiva. | Pendiente |
| U-06 `06-admin-alta-instructor-sede.png` | Formulario de alta con sede activa seleccionada. | Campos y selección correctos; redactar documento/correo; no enviar para la captura. | Pendiente |
| U-07 `07-admin-programa-ficha-competencia.png` | Programa, ficha, instructor jefe y competencia. | Relaciones coherentes, datos ficticios y legibles. | Pendiente |
| U-08 `08-admin-cuentas-coordinador.png` | Tabla de cuentas y opciones administrativas relevantes. | Sin documentos, correos o contraseñas reales; incluir flujo de coordinador/restablecimiento si está disponible. | Pendiente |
| U-09 `09-instructor-fichas-alta-aprendiz.png` | Mis fichas y formulario de alta de aprendiz con ficha autorizada. | Ocultar datos personales; no enviar el formulario para la captura. | Pendiente |
| U-10 `10-instructor-actividad-entrega-calificacion.png` | Actividad, entrega y retroalimentación/calificación en staging. | Actividad asignada, nota válida y aprendiz ficticio. | Pendiente |
| U-11 `11-instructor-riesgo-portafolio.png` | Riesgos y portafolio docente. | Datos pedagógicos ficticios; no exponer detalles reales sensibles. | Pendiente |
| U-12 `12-aprendiz-ruta-evidencia.png` | Ruta, actividad y estado de evidencia de prueba. | Rol aprendiz, ficha propia y datos personales ocultos. | Pendiente |
| U-13 `13-aprendiz-notas-recursos-notificaciones.png` | Notas, recursos y notificaciones. | Sesión de aprendiz con datos ficticios. | Pendiente |
| U-14 `14-coordinador-auditoria-observacion.png` | Sedes activas, instructores y auditoría/observación. | Rol coordinador; usar personas y observaciones ficticias o redactadas. | Pendiente |

## Evidencia técnica, base de datos y despliegue

| ID / archivo sugerido | Pantalla y contenido que debe verse | Qué validar antes de conservar | Estado |
|---|---|---|---|
| T-01 `15-estructura-proyecto.png` | Árbol del proyecto con `server/`, `migrations/`, `scripts/`, `docs/` y archivos principales. | No expandir ni mostrar `.env.local`, `.neon`, `node_modules/` ni datos históricos. | Pendiente |
| T-02 `16-render-configuracion-redactada.png` | Servicio de Render y nombres de las variables configuradas. | Ocultar valores, URLs, tokens y datos de cuenta. | Pendiente |
| T-03 `17-deploy-health-catalogo.png` | Deploy exitoso, health check y catálogo público en navegador. | HTTPS; catálogo accesible sin login; no incluir parámetros sensibles. | Pendiente |
| T-04 `18-migracion-redactada.png` | Nombre de migración y resultado de ejecución en entorno autorizado. | No mostrar connection string, credenciales ni filas. Nunca ejecutar contra producción sin autorización. | Pendiente |
| T-05 `19-esquema-er-migraciones.png` | Diagrama ER o metadatos de esquema/migraciones de Neon con tablas públicas y privadas diferenciadas. | PK/FK/relaciones legibles; no mostrar connection strings, tokens ni filas reales. Preferir el diagrama documentado si no se puede redactar la consola. | Pendiente |
| T-06 `20-build-responsive-verificacion.png` | Salida de `npm run build` y evidencia de vistas a 320, 375, 390, 1024 y 1440 px. | Registrar viewport y `scrollWidth <= clientWidth`; distinguir build de pruebas funcionales. | Pendiente |
| T-07 `21-colab-pruebas-analisis.png` | Título, celdas relevantes y resultados del cuaderno, solo si hay acceso autorizado. | El enlace solicitó inicio de sesión durante la revisión. No usar la pantalla de login como evidencia ni ejecutar celdas que escriban en Neon sin autorización. | No verificado / acceso pendiente |
| T-08 `22-prueba-carga-readonly.png` | Consola con las tres salidas del ejecutor local: `catalog`, `health-db` y `private-state-no-session`, oleadas 5/15/30, latencias, HTTP y errores. | Prueba local ejecutada; captura pendiente. Ocultar cookies/tokens, variables, payloads y cualquier dato sensible. No extrapolar a producción. | Ejecutado local; falta captura |

La salida numérica redactada se conserva en
[`22-prueba-carga-readonly.json`](./22-prueba-carga-readonly.json). No contiene
cookies, tokens, connection strings, datos de respuesta ni valores de entorno.
La imagen PNG sigue pendiente; no se generó una captura artificial.

## Procedimiento para obtener evidencia

1. Utilice un entorno de staging y cuentas autorizadas con datos ficticios. Si
   solo existe la base productiva, no cree registros para obtener capturas.
2. Capture desde una versión actual servida por Express. Registre navegador,
   sistema operativo, rol y ancho de viewport cuando sea relevante.
3. Tome PNG sin recortar errores importantes. Redacte datos personales,
   credenciales, cookies, tokens, valores de variables y URLs sensibles.
4. Para U-03 use únicamente un valor dummy no productivo; no lo envíe al
   servidor y elimínelo de la captura guardada.
5. Si una captura no se puede obtener de forma segura, déjela como pendiente y
   anote el bloqueo; no la reemplace con una imagen inventada o un mock sin
   identificar.
6. Después de guardar cada imagen, confirme su legibilidad y actualice el
   estado de su fila. No se incluyen imágenes con este registro.
