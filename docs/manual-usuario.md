# Manual de usuario — Portafolio Digital SENA

**Versión:** 1.0 · **Fecha:** 26 de noviembre de 2026
**Público:** administrador, instructor, aprendiz y coordinador.

## 1. Objetivo y alcance

Explicar cómo ingresar y usar los módulos que existen en la aplicación. La
oferta formativa pública no requiere cuenta; los paneles de gestión sí.

## 2. Prerrequisitos

- Contar con la URL HTTPS de la aplicación.
- Tener una cuenta creada previamente por el administrador. No hay registro
  libre ni recuperación de contraseña por correo.
- Conocer el número de documento y la contraseña inicial entregada de forma
  segura. La contraseña nueva debe tener al menos 10 caracteres.
- Para usar la aplicación móvil, abrir la misma URL en Safari (iOS) o Chrome
  (Android); no instalar una app adicional.

## 3. Acceso

1. Abrir la dirección del portafolio.
2. Revisar la sección **Oferta formativa pública** sin iniciar sesión.
3. Ingresar documento y contraseña.
4. Usar el botón del ojo para mostrar u ocultar la contraseña, si se necesita.
5. Seleccionar **Iniciar sesión**. El sistema reconoce el rol de la cuenta.
6. Para salir, seleccionar **Cerrar sesión**.

> **CAPTURA U-01 — PENDIENTE**
> Archivo: `docs/capturas/01-login-movil-390px.png`
> Debe verse: login y catálogo en viewport móvil de 390 px, campo de contraseña
> enmascarado y botón del ojo visible.
> Validar: contenido legible, control táctil accesible y
> `scrollWidth <= clientWidth`.

> **CAPTURA U-02 — PENDIENTE**
> Archivo: `docs/capturas/02-login-escritorio-1440px.png`
> Debe verse: layout de dos columnas, tarjeta de acceso, catálogo y botón del
> ojo.
> Validar: columnas y textos completos a 1440 px, sin recortes.

> **CAPTURA U-03 — PENDIENTE**
> Archivo: `docs/capturas/03-login-ojo-visible-staging.png`
> Debe verse: el botón en estado “Ocultar contraseña” y el campo en tipo texto.
> Validar: solo con un valor dummy no productivo; no enviarlo y ocultar/borrar
> el valor antes de conservar la imagen.

## 4. Funciones por rol

### 4.1 Administrador

**Panel de administración**

- **Sedes:** crear, editar, activar/desactivar o eliminar sedes. No elimine
  registros que tengan información académica relacionada.
- **Programas:** crear y administrar programas asociados a una sede.
- **Fichas y competencias:** crear fichas asociadas a programa e instructor
  jefe; crear competencias con programa e instructor.
- **Cuentas e instructores:** crear instructor y coordinador, consultar
  cuentas y restablecer contraseñas.
- Antes de crear un instructor, cree o active una sede. Si no hay sedes activas,
  el formulario lo informa y ofrece ir a **Sedes**.

**Orden inicial recomendado:** sede activa → instructor → programa → ficha
(asigne el instructor jefe) → competencias → aprendices/actividades.

> **CAPTURA U-04 — PENDIENTE**
> Archivo: `docs/capturas/04-panel-administrador.png`
> Debe verse: bienvenida y accesos a Sedes, Programas, Fichas y Cuentas.
> Validar: rol administrador identificado y navegación disponible.

> **CAPTURA U-05 — PENDIENTE**
> Archivo: `docs/capturas/05-admin-sedes.png`
> Debe verse: lista de sedes y acción para crear/activar.
> Validar: distinguir sede activa/inactiva; usar nombres ficticios.

> **CAPTURA U-06 — PENDIENTE**
> Archivo: `docs/capturas/06-admin-alta-instructor-sede.png`
> Debe verse: formulario de instructor con una sede activa seleccionada.
> Validar: lista de sedes activas y campos necesarios; ocultar documento, correo
> y contraseña. No enviar el formulario para la captura.

> **CAPTURA U-07 — PENDIENTE**
> Archivo: `docs/capturas/07-admin-programa-ficha-competencia.png`
> Debe verse: selección de sede/programa, ficha con instructor jefe y
> competencia.
> Validar: relaciones legibles, valores ficticios y coherencia de asignaciones.

> **CAPTURA U-08 — PENDIENTE**
> Archivo: `docs/capturas/08-admin-cuentas-coordinador.png`
> Debe verse: tabla de cuentas y opciones administrativas pertinentes.
> Validar: cubrir creación de coordinador/restablecimiento sin mostrar
> documentos, correos ni contraseñas reales.

### 4.2 Instructor

- **Mis fichas:** consulte grupos asignados y use **Añadir aprendiz** para crear
  una cuenta de aprendiz en una ficha autorizada.
- **Actividades:** publique una actividad en una competencia propia y asígnela
  a una o varias fichas permitidas.
- **Evaluar evidencias:** descargue una entrega, registre nota (0–5), resultado
  y comentario.
- **Riesgos:** registre nivel y observaciones para un aprendiz de sus fichas.
- **Portafolio docente:** publique metadatos de material y seleccione
  visibilidad; revise observaciones de coordinación.

Si una ficha o competencia no aparece, solicite al administrador que revise
programa, instructor jefe y asignaciones.

> **CAPTURA U-09 — PENDIENTE**
> Archivo: `docs/capturas/09-instructor-fichas-alta-aprendiz.png`
> Debe verse: vista Mis fichas y formulario Añadir aprendiz con ficha
> autorizada.
> Validar: ficha disponible; ocultar documento, correo y contraseña; no enviar
> el formulario para la captura.

> **CAPTURA U-10 — PENDIENTE**
> Archivo: `docs/capturas/10-instructor-actividad-entrega-calificacion.png`
> Debe verse: actividad, entrega y flujo de retroalimentación/calificación en
> staging.
> Validar: actividad pertenece a competencia/ficha asignada; nota visible en
> rango permitido; datos del aprendiz ficticios.

> **CAPTURA U-11 — PENDIENTE**
> Archivo: `docs/capturas/11-instructor-riesgo-portafolio.png`
> Debe verse: módulos de riesgos y portafolio docente.
> Validar: información pedagógica ficticia, visibilidad del material y ausencia
> de datos personales reales.

### 4.3 Aprendiz

- **Mi ruta formativa:** consulte las actividades asignadas a su ficha.
- **Evidencias:** envíe archivos permitidos de hasta 10 MB y consulte/descargue
  sus entregas.
- **Mis notas:** cree y elimine notas personales.
- **Recursos:** consulte materiales disponibles.
- **Notificaciones:** consulte avisos y márquelos como leídos al abrir la vista.

> **CAPTURA U-12 — PENDIENTE**
> Archivo: `docs/capturas/12-aprendiz-ruta-evidencia.png`
> Debe verse: ruta formativa y una actividad/evidencia de prueba en staging.
> Validar: ficha propia, estado de entrega y controles de envío/descarga; ocultar
> nombre y documento.

> **CAPTURA U-13 — PENDIENTE**
> Archivo: `docs/capturas/13-aprendiz-notas-recursos-notificaciones.png`
> Debe verse: notas, recursos y notificaciones del aprendiz.
> Validar: datos ficticios y acceso con rol aprendiz.

### 4.4 Coordinador

- **Sedes activas:** consulta sedes activas.
- **Instructores:** consulta instructores y sede.
- **Auditoría docente:** consulta materiales y observaciones; use **Nueva
  observación** para registrar seguimiento.

> **CAPTURA U-14 — PENDIENTE**
> Archivo: `docs/capturas/14-coordinador-auditoria-observacion.png`
> Debe verse: sedes activas, lista de instructores y módulo de auditoría.
> Validar: rol coordinador; observación y personas ficticias o redactadas.

## 5. Contraseñas y sesión

- Para cambiar su contraseña, use **Cambiar contraseña** e ingrese la actual y
  la nueva. Al guardarla, la sesión termina y se debe iniciar sesión otra vez.
- Si no puede entrar o no recuerda la contraseña, contacte al administrador.
  La aplicación no tiene recuperación por correo.
- La sesión vence después de 12 horas. Cierre sesión al terminar, especialmente
  en equipos compartidos.
- No comparta contraseñas, documentos de otros usuarios ni capturas con datos
  personales.

## 6. Preguntas frecuentes y solución de problemas

| Síntoma | Causa probable / solución |
|---|---|
| “Documento o contraseña incorrectos” | Verifique documento/contraseña con el administrador. Cinco fallos bloquean la cuenta durante 15 minutos. |
| No aparece “Crear instructor” con sede disponible | Cree una sede o actívela desde el panel y vuelva a Cuentas e instructores. |
| El instructor no ve fichas/aprendices | Pida al administrador revisar el instructor jefe y las competencias asignadas. |
| No se puede crear una actividad | Compruebe que exista una competencia asignada y una ficha permitida. |
| No se puede cargar evidencia | Verifique formato y límite de 10 MB; confirme conexión y sesión vigente. |
| El catálogo está vacío/no disponible | Reintente más tarde y notifique al responsable técnico. El catálogo público tiene datos separados del panel privado. |
| Se pide iniciar sesión después de cambiar contraseña | Es esperado: el cambio invalida sesiones previas. |

## 7. Glosario

- **Sede:** centro de formación.
- **Programa:** oferta formativa asociada a una sede.
- **Ficha:** grupo de aprendices asociado a un programa e instructor jefe.
- **Competencia:** unidad formativa asociada a programa e instructor.
- **Evidencia:** archivo entregado por el aprendiz para una actividad.
- **Visibilidad:** nivel de acceso de los materiales publicados por un instructor.
- **Catálogo público:** lista visible sin autenticar; actualmente usa tablas
  separadas de las tablas privadas del panel.

## 8. Capturas

Las imágenes no se incluyen todavía. Use la lista de
[capturas requeridas](./capturas/README.md); sustitúyala por capturas actuales
tomadas con cuentas autorizadas de prueba y datos ficticios antes de distribuir
este manual.
