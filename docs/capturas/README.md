# Capturas requeridas para los manuales

**Estado:** pendientes. No se incluyen imágenes en este cambio para evitar
presentar pantallas simuladas como evidencia real o capturar datos productivos.

## Inventario sugerido

| Archivo | Pantalla / usuario | Uso |
|---|---|---|
| `01-login-y-catalogo-publico.png` | Login y catálogo sin sesión | Manual de usuario |
| `02-panel-administrador.png` | Panel principal de administrador | Manual de usuario |
| `03-sedes-y-sede-activa.png` | Lista/formulario de sedes | Manual de usuario |
| `04-alta-instructor-sede.png` | Formulario con sede seleccionada | Manual de usuario |
| `05-programa-ficha-competencia.png` | Configuración académica | Manual de usuario |
| `06-instructor-mis-fichas-aprendiz.png` | Instructor, ficha y alta de aprendiz | Manual de usuario |
| `07-instructor-actividad-calificacion.png` | Actividad y entrega | Manual de usuario |
| `08-aprendiz-evidencias-recursos.png` | Evidencias y recursos | Manual de usuario |
| `09-coordinador-auditoria.png` | Auditoría/observación | Manual de usuario |
| `10-render-configuracion-redactada.png` | Servicio y variables con valores ocultos | Manual técnico |
| `11-render-deploy-y-health.png` | Deploy exitoso y health check | Manual técnico |
| `12-migracion-exitosa-redactada.png` | Resultado de migración sin URL/secretos | Manual técnico |

Guarde las imágenes aquí, en PNG, con nombres estables. Para probar responsive,
capture como mínimo el ancho móvil de 390 px y escritorio de 1440 px en los
módulos principales; registre los anchos usados.

## Reglas de privacidad y autenticidad

- Capturar desde una versión actual servida por Express, no desde un mock sin
  rotularlo.
- Usar cuentas autorizadas de prueba y datos ficticios. Si solo existe base de
  producción, no crear registros para obtener capturas.
- Ocultar documento, correo, nombres personales, cookies, tokens, URLs con
  parámetros sensibles y valores de variables de entorno.
- Para capturas de Render, mostrar nombres de variables, nunca sus valores.
- No incluir logs que contengan URLs completas de base de datos.
- No recortar mensajes de error importantes; anotar el navegador y ancho.
