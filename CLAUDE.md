# LUXORA Cotizador — Guía para Claude Code

Sistema de renta de vehículos (cotizador + casos de renta + KYC). Migrando de prototipo localStorage a producción con Supabase.

## Stack

- **Frontend**: React 18 + Vite + React Router 6 (SPA) + TypeScript + TailwindCSS 3 + Radix UI
- **Backend**: Express server (solo proxy Google Maps por ahora; `server/`)
- **DB / Auth / Storage**: Supabase
- **PWA**: vite-plugin-pwa
- **Package manager**: pnpm

## Comandos

```bash
pnpm dev        # dev server (client + server, puerto 8080)
pnpm build      # build prod
pnpm typecheck  # tsc
pnpm test       # vitest
```

## Proyecto Supabase

- **Nombre**: Luxora_Cotizador
- **ref / project_id**: `fietrurvvzsyjqmfsinq`
- **URL**: `https://fietrurvvzsyjqmfsinq.supabase.co`
- **Otro proyecto en la org**: `Luxora PWA` (`axflwfoaebeensmeayce`) — **NO TOCAR**, no es este.
- **Acceso por MCP**: el server `supabase` está autenticado. Usa `mcp__supabase__*` tools con `project_id="fietrurvvzsyjqmfsinq"`.

## Decisiones de arquitectura tomadas

1. **Multi-tenant por cuenta**: cada usuario que se registra tiene su propio workspace aislado. Toda tabla lleva `owner_id uuid references auth.users(id) on delete cascade` y RLS `owner_id = auth.uid()`.
2. **Empezar de cero**: nada de migrar datos viejos de localStorage. Los seeds (vehículos/operadores demo) se sembrarán por usuario al primer login.
3. **Supabase Storage** para archivos pesados (selfies, INE, comprobantes, PDFs). Buckets privados, paths bajo `{auth.uid()}/...`. Las columnas guardan URLs, no base64.

## Schema (12 tablas, todas con RLS)

`profiles` (1:1 con auth.users), `luxora_users`, `user_documents`, `vehicles`, `operators`, `organizations`, `company_members`, `rental_cases`, `case_participants`, `case_signatures`, `abonos`, `vehicle_insurances`.

- Tipos TS auto-generados en `client/lib/database.types.ts`. Regenerar con `mcp__supabase__generate_typescript_types` cuando cambie el schema.
- Trigger `on_auth_user_created` (en `auth.users`) crea fila en `profiles` con `nombre`/`apellido_paterno` desde `raw_user_meta_data`.

## Storage buckets

- `photos` (privado) — selfies, fotos de vehículos/operadores
- `documents` (privado) — INE, licencias, CFDI, contratos PDF, pagarés
- Política: cada user solo puede leer/escribir bajo `bucket/{auth.uid()}/...`

## Auth

- Implementado en `client/lib/auth.tsx` (`AuthProvider` + `useAuth()`)
- Cliente singleton en `client/lib/supabase.ts`
- `ProtectedRoute` (en `client/components/auth/`) lee `session` y `loading` del context
- Página `client/pages/Auth.tsx`: signup con `supabase.auth.signUp({ data: { nombre, apellido_paterno } })` + pantalla "check email"; login con `signInWithPassword`
- `.env` requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (publishable key, public)

## Estado y roadmap

### ✅ Fase A — Foundation (COMPLETA y verificada por el usuario)

Auth real con Supabase, schema completo con RLS, buckets, tipos TS. **Probado**: signup+login funcionan end-to-end.

### 🚧 Fase B — Migrar `client/lib/store.ts` a Supabase async — EN PROGRESO

`store.ts` hoy es CRUD síncrono sobre localStorage con keys `luxora_*_v2`. Estamos migrando entidad por entidad a `client/lib/stores/<entity>.ts` async contra Supabase.

**Patrón establecido (validado con vehicles):**
- Mantener tipos del dominio en camelCase, con mappers `xFromDb` / `xToDb` para snake_case.
- `createX()` sync devuelve draft con `crypto.randomUUID()` pre-generado.
- `saveX()` async hace upsert por `id`.
- `getX()` async usa RLS (filtra por `owner_id = auth.uid()` automáticamente).
- En componentes cargar la lista una sola vez por mount con `useEffect` + `useState`. Para reload manual usar la función `reload()` local. (No introducimos react-query todavía — patrón más simple primero.)
- Para funciones puras como `getVehicleHealth(vehicle, deps)` pasar las dependencias precargadas como parámetro (no llamar storage adentro).

**Progreso por entidad:**
- ✅ **vehicles + insurances + verifications + maintenances + taxes** — migrado. Consumidores: `Vehiculos.tsx`, `QuoteForm.tsx`, `Cotizaciones.tsx`, `dashboardData.ts`, `Home.tsx`, `Reservaciones.tsx`, `StepReservacion.tsx`, `PrintableContract.tsx`, `quotationEngine.ts`, `vehicleLifecycle.ts`. Funciones legacy eliminadas de `store.ts`.
- 🚧 **operators** — pendiente (similar complejidad a vehicles, sin sub-entidades)
- 🚧 **organizations + company_members** — pendiente
- 🚧 **luxora_users + user_documents** — pendiente (depende de Fase C)
- 🚧 **rental_cases + case_participants + case_signatures + abonos** — el más complejo, refactor de `Reservaciones.tsx` (~918 líneas)

**Quirks importantes:**
- El indicador de almacenamiento de `NavShell` mide localStorage; a futuro adaptarlo o eliminarlo.
- `checkVehicleAlerts()` quedó como no-op temporal — alertas se recalcularán cuando todo el lifecycle viva en Supabase y se pueda hacer async.
- `getStats()` en store.ts ya no incluye totales de vehicles (se calculan en cliente desde el nuevo store).
- `Vehiculos.tsx` ya no autosalva en cada keystroke — la persistencia ocurre solo con el botón Guardar (regresión intencional: con Supabase, autosave por tecla sería 1 round-trip por carácter).

### 🚧 Fase C — Migrar archivos a Storage — PENDIENTE

Reemplazar campos base64 (selfies, fotos de vehículo, INE, etc.) por upload a Storage. Helper `uploadAsset(file, bucket, subpath)` que devuelve URL firmada/pública según bucket. Path siempre `${user.id}/${entityId}/${filename}`.

## Convenciones del proyecto

- Path aliases: `@/*` → `client/*`, `@shared/*` → `shared/*`
- UI: TailwindCSS + Radix; utility `cn()` en `client/lib/utils.ts`
- Toasts: `sonner` (importado como `Sonner`) y `@/components/ui/toaster` (radix)
- No crear endpoints Express a menos que sea necesario (secretos, lógica server-only). El proxy Google Maps en `server/routes/maps.ts` es la única razón actual.
- Solo agregar comentarios cuando el "por qué" no sea obvio (políticas, invariantes). Sin docstrings largos.

## Acciones manuales del usuario (no automatizables vía MCP)

- Configurar **Site URL** y **Redirect URLs** en Supabase dashboard → Authentication → URL Configuration
- Activar/desactivar **Confirm email** en Authentication → Sign In/Up
- Configurar plantillas de email (signup, magic link, recovery) si se quieren personalizar
- Rellenar `.env` con las credenciales (Claude no debe modificar `.env` sin permiso explícito)
