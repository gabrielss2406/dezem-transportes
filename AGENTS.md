# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Dezem** is a desktop fleet management system built with Electron + React + TypeScript. It handles trip logging, vehicle/driver management, cost tracking, salary management, and financial dashboards for transportation companies.

## Commands

### Development
- `npm install` — Install dependencies (includes `postinstall` hook to rebuild `better-sqlite3`)
- `npm run dev` — Start dev server with hot reload (main + renderer + preload)
- `npm run type-check` — Run TypeScript type checking
- `npm run lint` — Run Biome linter with auto-fix
- `npm run format` — Format code with Biome

### Build & Distribution
- `npm run build` — Compile TypeScript without bundling (creates `out/` folder)
- `npm run preview` — Preview the packaged app
- `npm run dist` — Build production installer (.exe on Windows, DMG on macOS)

**Note:** Before running `dist`, ensure all Electron windows are closed and the dev server is stopped, otherwise you'll hit EBUSY errors. If stuck, check Task Manager for lingering Electron processes.

## Architecture

### Three-Process Model (Electron Standard)

**Main Process** (`src/main/`) — Node.js backend
- Database setup and migrations (`database.ts`)
- IPC handlers for all CRUD operations (organized in `modules/`)
- Backup scheduler and S3 integration
- File I/O and PDF export

**Renderer** (`src/renderer/src/`) — React frontend
- React Router with MemoryRouter for navigation
- Material Design 3 color tokens (dark mode default, light mode toggle in Settings)
- Custom UI components in `components/ui.tsx` (Input, Select, Button, Modal, Table, Toast, etc.)
- Pages organized by domain: records (Customers, Drivers, Trucks, Suppliers, Products), features (Trips, Costs, Prices), and Dashboard

**Preload** (`src/preload/index.ts`) — Secure bridge
- Exposes `window.api` object with all IPC channels
- Each API namespace mirrors backend module (e.g., `window.api.products.*`)

### Shared Layer (`src/shared/`)

- **`schemas.ts`** — Zod schemas for all forms (validation on both frontend and backend)
- **`types.ts`** — TypeScript interfaces for data models and Window API
- **`validation.ts`** — CNPJ, CPF, phone validators

### Database (SQLite, via `better-sqlite3`)

Located at `%APPDATA%\dezem-gestao-frota\dezem.db` on Windows. Schema is inline in `database.ts` with migrations for backwards compatibility.

Key tables:
- **users** — Login (single user, bcrypt hash)
- **products** — Cargo types (all weights in tons)
- **customers, suppliers, contractors, trucks, drivers** — Master data
- **trips** — Trip records with weight, distance, price, fuel stops
- **costs** — Fixed/variable costs with categories
- **customer_prices** — Pricing matrix (customer × product → price)
- **trip_fuel_stops** — Nested fuel purchases within a trip
- **settings** — Key-value config (last used theme, backup settings)

## Key Patterns

### IPC & Validation Flow

1. **Frontend** calls `window.api.{module}.{action}(data)`
2. **Preload** forwards to `ipcRenderer.invoke('channel', ...args)`
3. **Main process** handler validates with Zod schema
   - If valid → run handler, return result
   - If invalid → return `{ ok: false, errors: { fieldName: message } }`
4. **Frontend** form displays errors via `zodResolver`

**Handler helpers** (`src/main/lib/utils.ts`):
- `createValidatedHandler(channel, schema, handler)` — For CREATE
- `createValidatedHandlerWithId(channel, schema, handler)` — For UPDATE
- `createIdValidatedHandler(channel, handler)` — For DELETE

### Form Pattern (React Hook Form + Zod)

Every record form:
- Uses `useForm` with `zodResolver(schema)`
- Controller wraps each field
- Errors display via `error?.message` in Input/Select components
- Submit via `handleSubmit` callback

Example:
```tsx
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(productSchema),
  defaultValues: { name: '', customId: undefined }
})
<Controller name="name" control={control} render={({ field }) => (
  <Input {...field} error={errors.name?.message} />
)} />
```

### Master Data Pages (Customers, Products, Trucks, Drivers, etc.)

All follow the same structure:
1. **Sidebar** nav item links to page
2. **Stats cards** at top (total, filtered counts)
3. **Search + Filter** controls
4. **Inline table** with hover actions (Edit, Delete, and domain-specific like "View Prices")
5. **Modal** for Create/Edit forms
6. **Confirm modals** for destructive actions

Patterns:
- `useForm` with controlled field refs for focus management
- `onKeyDown` in Input fields for fast navigation (Tab/Enter jumps to next field)
- Discard confirmation if form is dirty but modal closes

### Styling (Tailwind + Design Tokens)

- Color tokens live in `@tailwind/theme` config (Material Design 3)
- Classes like `bg-surface-container`, `text-on-surface`, `border-outline-variant`
- Dark/light mode via `document.documentElement.classList` toggle
- No component libraries; hand-rolled UI with Tailwind

### Dashboard & Analytics

- `Dashboard.tsx` shows KPIs, per-truck performance, monthly revenue, maintenance alerts
- `Overview.tsx` is the "home" with quick navigation
- Charts use simple HTML tables (no Recharts currently, but dependency is available)

## Development Tips

### Adding a New Record Type

1. Add table to `database.ts` schema
2. Create `src/main/modules/{entity}/{entity}.handlers.ts` with CRUD handlers
3. Register handlers in `src/main/index.ts` (e.g., `registerProductHandlers()`)
4. Add API namespace to `src/preload/index.ts`
5. Add Zod schema to `src/shared/schemas.ts`
6. Add TypeScript interface to `src/shared/types.ts`
7. Add page component to `src/renderer/src/pages/records/{Entity}.tsx`
8. Add route to `src/renderer/src/App.tsx`
9. Add sidebar nav item to `src/renderer/src/components/Sidebar.tsx`

### Database Migrations

Existing migrations (see `database.ts` lines ~188–234) use `ALTER TABLE` checks. New migrations:
- Check if column exists via `db.pragma('table_info(table_name)')`
- Use `ALTER TABLE ADD COLUMN` if missing
- Update default values or backfill data as needed

### Hot Reload During Development

`npm run dev` rebuilds on file changes. Electron auto-reloads the renderer but you may need to close and reopen dialogs for React hot-module replacement to take effect. Main process changes require full app restart.

## Common Issues

**"EBUSY: resource busy or locked" on `npm run dist`**
- Close all Electron windows and the dev server (`Ctrl+C`)
- Check Task Manager for lingering Electron processes

**SQLite module rebuild errors**
- Run `npx electron-builder install-app-deps` to rebuild native modules

**Type errors after schema changes**
- Run `npm run type-check` to catch missing/renamed fields in handlers
- Check that `Window` interface in `types.ts` matches preload.ts APIs

## Git & Commits

- Commits are made to `main` branch
- PR reviews happen via GitHub (merge via `gh pr`); no force-push to main
- Husky hooks run Biome linting pre-commit (lint-staged config)

## Backup & Recovery

- Optional S3-based backup (configured in Settings)
- Backup scheduler runs daily if S3 credentials are set
- Manual backups via "Backup" button in Settings
- Restore by selecting a backup file from S3 list
