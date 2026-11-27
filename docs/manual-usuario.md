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

**Captura pendiente:** `docs/capturas/01-login-y-catalogo-publico.png`.

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

**Capturas pendientes:** panel, sedes, formulario de instructor con sede
seleccionada, programas/fichas y cuentas.

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

**Capturas pendientes:** menú y fichas, formulario de aprendiz, actividades,
entregas/calificación, riesgos y portafolio docente.

### 4.3 Aprendiz

- **Mi ruta formativa:** consulte las actividades asignadas a su ficha.
- **Evidencias:** envíe archivos permitidos de hasta 10 MB y consulte/descargue
  sus entregas.
- **Mis notas:** cree y elimine notas personales.
- **Recursos:** consulte materiales disponibles.
- **Notificaciones:** consulte avisos y márquelos como leídos al abrir la vista.

**Capturas pendientes:** resumen, ruta/entrega, evidencias, recursos y
notificaciones.

### 4.4 Coordinador

- **Sedes activas:** consulta sedes activas.
- **Instructores:** consulta instructores y sede.
- **Auditoría docente:** consulta materiales y observaciones; use **Nueva
  observación** para registrar seguimiento.

**Capturas pendientes:** menú, lista de instructores y auditoría/observación.

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
