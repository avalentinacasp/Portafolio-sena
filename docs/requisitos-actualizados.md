# Requisitos actualizados — Portafolio Digital SENA

**Versión:** 1.0  
**Fecha de revisión del código:** 26 de noviembre de 2026  
**Estado:** borrador técnico para validación con el responsable funcional.

> Este documento describe lo que se observa en el código y las migraciones
> actuales. No sustituye la aprobación de requisitos institucionales. La guía
> PDF y el cuaderno de Colab mencionados para esta revisión no se pudieron
> contrastar: el PDF no expone texto legible en este entorno y Colab solicita
> inicio de sesión.

## 1. Objetivo y alcance

Aplicación web para consulta pública de una oferta formativa y operación
autenticada de portafolios por los roles administrador, instructor, aprendiz y
coordinador. El frontend se sirve desde Express; las operaciones privadas y la
persistencia se realizan en PostgreSQL/Neon.

Fuera de alcance o no demostrado por el código: recuperación de contraseña por
correo, autoservicio de registro, carga de archivos de materiales, sincronía
entre el catálogo público y los datos académicos privados, y niveles de
disponibilidad/SLA del hosting.

## 2. Requisitos funcionales observados

| ID | Requisito | Estado observado | Criterio de aceptación |
|---|---|---|---|
| RF-01 | El visitante consulta el catálogo sin autenticarse. | Implementado: `GET /api/public/catalog`. | Abrir la URL pública sin cookie y recibir programas públicos. |
| RF-02 | El usuario inicia sesión con documento y contraseña; el servidor determina su rol. | Implementado en API y menú por rol. | Una sesión válida abre el menú correspondiente; credenciales inválidas no revelan cuál dato falló. |
| RF-03 | La sesión privada usa cookie protegida, permite cerrar sesión y expira. | Implementado: cookie HttpOnly, expiración de 12 h, revocación en logout. En producción usa Secure. | Sin sesión, las rutas privadas responden como no autenticadas; logout invalida la sesión. |
| RF-04 | El administrador configura sedes, programas, fichas, competencias y cuentas. | Implementado en vistas y endpoints privados. | Las operaciones requieren rol administrador y respetan las relaciones de base de datos. |
| RF-05 | El administrador registra instructores y coordinadores. | Implementado. Para instructores se exige sede activa. | Sin sede activa se presenta orientación; una sede ausente/inactiva es rechazada por la API. |
| RF-06 | El instructor gestiona aprendices de fichas asignadas, actividades, riesgos y materiales; revisa/califica entregas. | Implementado en vistas y rutas por rol. | El instructor solo opera sobre fichas/competencias/aprendices asociados a su perfil. |
| RF-07 | El aprendiz consulta ruta, evidencias, notas, recursos y notificaciones; entrega evidencias. | Implementado en la interfaz. | Un aprendiz solo consulta sus datos y puede descargar/subir evidencias de sus actividades. |
| RF-08 | El coordinador consulta sedes activas e instructores, revisa auditoría y registra observaciones. | Implementado en la interfaz y ruta de observaciones. | Solo el rol coordinador puede registrar observaciones. |
| RF-09 | El usuario cambia su contraseña; el administrador puede restablecerla. | Implementado; el cambio propio cierra sesiones existentes. | Contraseña nueva válida; no se ofrece recuperación por correo. |
| RF-10 | La aplicación admite vistas móviles y controles táctiles. | CSS incluye breakpoints y menú móvil; hay pruebas manuales/simuladas, no suite automatizada. | En 320, 375, 390, 1024 y 1440 px, `scrollWidth <= clientWidth` en las vistas elegidas. |
| RF-11 | Las evidencias se guardan en PostgreSQL y la descarga se protege por sesión/perfil. | Implementado; carga limitada a 10 MB. | Tipo/tamaño permitido y autorización comprobados con cuentas de prueba no productivas. |

## 3. Reglas de negocio y validaciones

- Los roles admitidos en `usuarios.rol` son `administrador`, `instructor`,
  `aprendiz` y `coordinador`.
- No existe registro público de usuarios. La cuenta administradora inicial se
  crea una sola vez mediante `npm run db:create-admin`.
- Documento: de 6 a 12 dígitos en la validación de creación de usuarios.
- Contraseña nueva: de 10 a 128 caracteres; el servidor guarda un hash scrypt,
  no el texto en claro.
- El instructor requiere una sede activa.
- El instructor solo puede añadir aprendices a una ficha asignada como jefe o
  por competencia. Las mismas relaciones restringen la gestión de actividades,
  riesgos y entregas.
- La ficha debe pertenecer a un programa y tener instructor jefe; la fecha final
  debe ser posterior a la inicial.
- La jornada admite `Diurna`, `Nocturna` o `Mixta`; la vinculación admite
  `De planta`, `Técnico` o `Transversal`.
- Una entrega puede estar `Entregado` o `Calificado`; la nota, si existe, debe
  estar entre 0 y 5. El resultado es `Aprobado` o `No Aprobado`.
- Los niveles de riesgo son `Bajo`, `Medio` y `Alto`. La visibilidad de material
  es `Público`, `Privado (solo mi ficha)` o `Restringido (solo instructores)`.
- Intentos fallidos: cinco intentos bloquean la cuenta por 15 minutos. También
  hay un límite de intentos en memoria por IP.
- La sesión persiste como hash del token y vence a las 12 horas.

## 4. Requisitos no funcionales

| ID | Requisito | Evidencia / limitación |
|---|---|---|
| RNF-01 | Node.js 24.10 o posterior; PostgreSQL compatible. | `package.json`, `pg`, conexión Neon. |
| RNF-02 | HTTPS en producción y frontend/API del mismo origen recomendado. | Cookie Secure se activa con `NODE_ENV=production`; CORS permite origen exacto configurado. |
| RNF-03 | No exponer secretos ni archivos históricos en Git/HTTP. | `.env*`, `.neon`, `base_de_datos/` y llaves comunes están ignorados; confirmar siempre con `git status` antes de publicar. |
| RNF-04 | Diseño adaptable y accesible con teclado/lector en controles principales. | Viewport y estilos responsive existen; falta una auditoría formal completa de WCAG y Safari/iOS físico. |
| RNF-05 | Integridad relacional y migraciones repetibles. | Migraciones SQL numeradas y registro `schema_migrations`; restricciones y FK en PostgreSQL. |
| RNF-06 | Validación de cambios antes de despliegue. | `npm run build` solo ejecuta `node --check`; no sustituye pruebas funcionales ni de integración. |

## 5. Hallazgos que requieren decisión antes de firmar

1. **Catálogo independiente:** el catálogo público consulta
   `portal_public_sites` y `portal_public_programs`, sembradas por
   `001_public_catalog.sql`. El panel administrativo escribe en `sedes` y
   `programas`. No se encontró sincronización entre ambos grupos. Si los
   programas creados por administración deben aparecer automáticamente en la
   vista pública, ese criterio no está satisfecho todavía. Confirmar si el
   catálogo público es curado por separado o si requiere publicación/sincronía.
2. **Referencia de cuenta:** `usuarios.referencia_id` es polimórfica y no tiene
   FK a `instructores`/`aprendices`; la aplicación la mantiene al crear cuentas.
   El diccionario debe conservar esta salvedad.
3. **Pruebas:** no existe framework, archivo de tests ni comando `npm test`.
   `npm run build` comprueba sintaxis únicamente. La matriz pendiente está en
   [Plan de pruebas](./plan-de-pruebas.md).
4. **Capturas:** aún no hay imágenes de evidencia; ver
   [registro de capturas](./capturas/README.md), con nombre propuesto,
   contenido requerido y validación por cada pantalla. Deben tomarse con
   cuentas autorizadas y datos ficticios/no sensibles; no marcar criterios
   como verificados solo por tener un espacio reservado.
5. **Fuentes de referencia:** el cuaderno Colab no fue accesible sin cuenta; el
   contenido de los PDF se debe revisar manualmente durante la validación
   institucional.

## 6. Criterios de aceptación para la revisión

- [ ] Visitante abre el catálogo sin iniciar sesión.
- [ ] Cada rol ve únicamente sus opciones y el servidor rechaza operaciones
  fuera de rol.
- [ ] Administrador crea una sede activa y luego un instructor asociado.
- [ ] Instructor crea aprendiz solo en ficha asignada; el aprendiz entrega una
  evidencia y el instructor la califica.
- [ ] Coordinador registra observación y esta se refleja en la vista permitida.
- [ ] Contraseñas inválidas/cortas se rechazan y logout invalida la sesión.
- [ ] Las cinco anchuras indicadas pasan en las vistas cubiertas por el plan.
- [ ] Se completa la decisión del catálogo público descrita en el apartado 5.
- [ ] Se reemplazan los espacios de captura por imágenes reales sin secretos ni
  información personal.

### Evidencias visuales asociadas

- Login público y contraseña: U-01 a U-03.
- Administración de sedes, instructores, programas, fichas y cuentas: U-04 a
  U-08.
- Flujos de instructor, aprendiz y coordinador: U-09 a U-14.
- Estructura, despliegue, migraciones, esquema y pruebas: T-01 a T-06.
- Cuaderno de Colab: T-07 es condicional al acceso autorizado; su contenido no
  está verificado en esta revisión.
