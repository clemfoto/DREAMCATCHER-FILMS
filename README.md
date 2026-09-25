# Dreamcatcher Films — app de gestión

App interna (PWA, móvil primero) sobre la base de Airtable **DREAMCATCHER FILMS**. Ver `CLAUDE.md` para los requisitos.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellenar las variables
npm run dev                  # http://localhost:3000
```

### Probar sin Airtable ni email

```bash
npm run dev:mock
```

Arranca un Airtable falso con datos inventados (`scripts/mock-airtable.mjs`) y un login sin email.
Entra con `admin@dreamcatcher.test` (Administrador) o `equipo@dreamcatcher.test` (Equipo).

## Despliegue en Vercel

1. Importar el repositorio en Vercel (framework: Next.js, sin más ajustes).
2. Añadir las variables de entorno de `.env.example`:
   - `AIRTABLE_TOKEN`: Personal Access Token con `data.records:read`, `data.records:write` y `schema.bases:read`, limitado a la base.
   - `AIRTABLE_BASE_ID`: `appUZ9M8sraJsTTFv`.
   - `AUTH_SECRET`: `openssl rand -base64 32`.
   - `AUTH_RESEND_KEY` y `EMAIL_FROM`: cuenta de Resend con el dominio remitente verificado.
3. Desplegar. En el móvil: abrir la URL → Compartir → "Añadir a pantalla de inicio" (iPhone) o "Instalar app" (Android).

Para dar acceso a alguien: crear o editar su fila en **Equipo** con `Email` y `Activo` marcado. El `Rol` decide qué ve.

## Cómo está hecho

| Carpeta | Qué hay |
| --- | --- |
| `config/galerias.ts` | **Toda la configuración**: IDs de tablas, permisos, navegación, colores de chips y galerías a medida. |
| `lib/airtable.ts` | Cliente de Airtable (solo servidor): esquema, lectura con caché, escritura, subida de adjuntos, cola de ~4 peticiones/s. |
| `lib/esquema.ts` | Campos visibles, solo lectura, "(antiguo)", permisos por tabla y navegación. |
| `lib/auth.ts`, `lib/token.ts`, `proxy.ts` | Enlace mágico firmado + cookie de sesión de 30 días. El rol se relee de Equipo en cada petición. |
| `app/(app)/t/[tabla]/…` | Motor genérico: lista, ficha, nuevo y editar para cualquier tabla. |
| `components/vistas/` | Diseños a medida de Clientes, Tareas, Entrega, Leads, Contabilidad, Gastos y Equipo. |
| `app/(app)/t/acciones.ts` | Guardar, marcar tarea, convertir lead y borrar (Server Actions con permisos). |

### Notas

- **Tablas y campos nuevos** aparecen solos (el esquema se refresca cada 5 min). Las tablas nuevas salen en "Más" y solo las ve el Administrador; para dárselas al rol Equipo, añadir su ID a `TABLAS_ROL_EQUIPO`.
- **Caché**: las lecturas se reutilizan 30 s (`CACHE_SEGUNDOS`) y se invalidan al guardar desde la app. Los cambios hechos directamente en Airtable tardan como mucho eso en verse.
- **Límite de la API**: el plan gratuito de Airtable tiene un tope mensual de llamadas; con uso diario conviene un plan de pago.
- **Login**: se usa un enlace mágico propio (token firmado, sin base de datos) en lugar de Auth.js, porque el proveedor de email de Auth.js exige una base de datos para los tokens de verificación y aquí el único backend es Airtable. Mismo resultado: email con enlace vía Resend y acceso solo para miembros activos de Equipo.
- **Borrar** registros solo lo puede hacer un Administrador.
- Fotos: se comprimen en el móvil (≤1600 px) antes de subirlas; máximo 5 MB por archivo (límite de Airtable).
