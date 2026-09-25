# App de gestión — Dreamcatcher Films

App interna de gestión para una productora de video (bodas y eventos). La usan el dueño y su equipo, **sobre todo desde el móvil**. No la usan los clientes finales. El proyecto lo desarrolla Clem para venderlo al videógrafo, con cuota de mantenimiento.

## Objetivo principal

1. **Móvil primero.** Es una PWA instalable (icono en la pantalla de inicio, pantalla completa, sin barra del navegador). Se diseña primero para 390 px de ancho; el escritorio es secundario.
2. **Airtable es la base de datos y la fuente de la estructura.** Si el dueño crea una tabla o un campo en Airtable, debe aparecer en la app sin tocar código. La app lee el esquema con la Metadata API de Airtable y genera las galerías de forma genérica. Las galerías principales tienen además una configuración de diseño a medida (ver "Galerías").
3. **Mantenimiento sencillo.** Código claro, pocas dependencias y configuración en un solo lugar.

## Stack

- Next.js (App Router) + TypeScript, desplegado en Vercel.
- PWA: manifest, service worker, iconos, `viewport-fit=cover` y safe areas para iPhone.
- Airtable como único backend. **Nunca** llamar a Airtable desde el navegador: todas las llamadas pasan por rutas de servidor (Route Handlers / Server Actions), con el token en variables de entorno.
- Autenticación: Auth.js con enlace mágico por email (proveedor de email, p. ej. Resend). Solo pueden entrar los emails que existen en la tabla **Equipo** con `Activo` marcado. El rol sale de `Equipo.Rol`.
- Estilos: CSS propio o Tailwind, respetando los tokens de diseño de abajo.

### Variables de entorno

```
AIRTABLE_TOKEN=            # Personal Access Token con scopes: data.records:read, data.records:write, schema.bases:read
AIRTABLE_BASE_ID=appUZ9M8sraJsTTFv
AUTH_SECRET=
AUTH_RESEND_KEY=
EMAIL_FROM=
```

### Límites de Airtable a tener en cuenta

- Unas 5 peticiones por segundo por base: cachear lecturas (revalidación corta) y agrupar escrituras.
- Revisar el plan de Airtable del cliente: los planes gratuitos tienen un límite mensual de llamadas a la API que una app de uso diario puede superar.

## Base de Airtable (DREAMCATCHER FILMS)

Consultar siempre el esquema real con la Metadata API; esta tabla es una referencia y puede quedar desactualizada.

| Tabla | ID | Campo principal | Notas |
| --- | --- | --- | --- |
| Clientes | tblzsfM8s8Grq2lwU | Nombre del Cliente | Eje central; enlaza con Tareas, Entrega, Leads, Contabilidad, Gastos y Equipo |
| Tareas | tblI4mNizr3Xwgoa6 | Nombre de la Tarea | Responsables → Equipo; Cliente Asociado → Clientes; Tarea Asociada / Tareas dependientes → Tareas |
| Entrega | tbl29U9MasLnSPMBj | NOMBRE DEL CLIENTE (fórmula de `Cliente`) | Cliente → Clientes; Status Entrega (selección múltiple); Responsable Entrega → Equipo |
| Leads | tblnZCa7gevintf0n | Nombre del Cliente | 1er–4to Contacto → Equipo; Relacionado a Cliente → Clientes |
| Contabilidad | tbl4d283L3x8TVLzy | NOMBRE DEL CLIENTE (fórmula de `Cliente`) | Monto Total = rollup del Precio del cliente; Monto Pendiente = fórmula |
| Gastos | tbl5kqfH0Fh7OhSu9 | GASTOS | Categoría, Comprobante (adjuntos), Cliente → Clientes, Persona que hizo el pago → Equipo |
| Equipo | tblWfnNYeXrB95dQC | Nombre | Rol (Administrador / Equipo), Email, Teléfono, Usuario Telegram, Activo |

Reglas:
- Los campos calculados (fórmula, rollup, lookup, count) son de solo lectura en la app.
- Ignorar los campos cuyo nombre termine en "(antiguo)" si todavía existen.
- Los campos de enlace se editan con un selector que busca en la tabla enlazada; los de Equipo se muestran como avatares con iniciales.

## Permisos

- **Administrador:** acceso a todo, incluidas Contabilidad, Gastos y Equipo.
- **Equipo:** Clientes, Tareas, Entrega y Leads. Sin Contabilidad, Gastos ni Equipo.
- Los permisos se comprueban en el servidor, no solo ocultando botones.

## Galerías

Motor genérico: cualquier tabla de la base se muestra como lista de tarjetas, con su ficha de detalle y un formulario de alta/edición generados a partir del tipo de cada campo. Encima, configuración a medida (un único archivo, p. ej. `config/galerias.ts`) para las galerías principales:

- **Clientes:** tarjetas con nombre, estado (chip de color), fecha del evento, servicio, venue, avatares del team y precio. Filtros por estado. La ficha muestra todos los campos y accesos a las tareas, entregas y pagos del cliente.
- **Tareas:** lista agrupada ("Esta semana" / "Próximas" / "Hechas"), marcar como hecha con un toque, fecha límite en rojo si vence pronto.
- **Entrega:** tarjetas filtrables por status, con los cambios deseados destacados.
- **Leads:** tarjetas con los cuatro contactos como pasos (1º–4º) y quién hizo cada uno; acción para convertir un lead en cliente.
- **Contabilidad** (solo administrador): total pendiente arriba y una tarjeta por cliente con total, depósito, pendiente y fecha de balance.
- **Gastos** (solo administrador): lista con categoría, fecha, quién pagó y monto; botón destacado "Foto del ticket" que sube la imagen a Comprobante.
- **Equipo** (solo administrador): personas, rol y número de eventos.

Navegación móvil: barra inferior con Clientes, Tareas, Entrega, Leads y "Más" (Contabilidad, Gastos, Equipo y cualquier tabla nueva que aparezca en la base). En escritorio, barra lateral.

## Diseño (del prototipo aprobado)

- Fondo `#F6F4EF`; tarjetas `#FFFFFF` con borde `#E3DED4`; texto `#1C1B19`; texto secundario `#5E584F`.
- Acento `#A04A18` (botones principales); barra lateral de escritorio `#1C1B19`.
- Tipografía: Fraunces para títulos y nombres de clientes; Hanken Grotesk para el resto.
- Esquinas de 12–16 px, botones táctiles de al menos 44 px e inputs de 16 px (para que iOS no haga zoom).
- Chips de estado: Reservado `#E4ECF5`/`#274766`, Anticipo pagado `#FBEBD9`/`#7A3F0C`, En edición `#EFE6F3`/`#55336A`, Entregado `#E3EEDF`/`#2F5226`. Las opciones nuevas de un select toman un color por defecto.
- Referencia visual: el prototipo en el lienzo de diseño de Claude (versión móvil y escritorio).

## Plan de trabajo

1. Proyecto base: Next.js, PWA, despliegue en Vercel y variables de entorno.
2. Cliente de Airtable en el servidor: lectura del esquema, listado, detalle, creación y edición de registros, subida de adjuntos y caché.
3. Login con enlace mágico y control por rol a partir de Equipo.
4. Motor genérico de galerías (lista, ficha y formulario por tipo de campo).
5. Diseño a medida de Clientes, Tareas, Entrega y Leads, en móvil primero.
6. Contabilidad, Gastos y Equipo.
7. Pruebas en iPhone y Android reales, instalación como app y ajustes.
8. Fase 2 (fuera de este alcance): automatizaciones con Make y bot de Telegram.

Trabajar fase por fase, con una versión desplegada y probable en el móvil al final de cada una.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
