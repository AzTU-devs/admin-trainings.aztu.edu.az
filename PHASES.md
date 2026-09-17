# Build phases

The order the portal was built in, and where each phase actually stands.

A box is ticked only when the code is present and wired to a live endpoint. Where a line was
planned one way and built another, the line says what was built. Nothing here has been
verified by a QA pass against the running backend — "built" means "reviewed in the source on
2026-09-18", not "proven in production".

---

## ✅ Phase 1 — Foundation & Branding

- [x] Install core deps (axios, RTK, react-redux, RHF, zod, sonner, lucide, Radix, CVA, TanStack Table)
- [x] Feature-based folder skeleton
- [x] Path aliases (`@/`, `@app`, `@features`, `@shared`, `@lib`)
- [x] AzTU brand palette in `index.css` (navy + gold)
- [x] `.env.example` / `.env.development` / `.env.production` + typed `env.ts`
- [x] `ROLES`, `ROUTES`, `cn()`, `ApiPage<T>` shared primitives
- [x] Rebrand `package.json`, `index.html`, `README`

## ✅ Phase 2 — Core Infrastructure

- [x] `src/lib/redux/store.ts` — RTK store + typed hooks
- [x] `src/lib/axios/httpClient.ts` — interceptors (auth, refresh queue, error normalization)
- [x] `src/lib/query/baseApi.ts` — RTK Query base with axios baseQuery
- [x] `src/app/providers/AppProviders.tsx` — Redux + Helmet + Toaster + ErrorBoundary
- [x] `src/app/App.tsx` + `main.tsx`
- [x] Global `ErrorBoundary` with a full-page fallback
- [x] `uiSlice` — theme, sidebar collapsed, mobile sidebar
- [ ] ~~Modal stack in `uiSlice`~~ — not built and not needed: dialogs own their open state

## ✅ Phase 3 — Auth & RBAC

- [x] `authSlice` — `accessToken`, `user`, `roles`, `status`
- [x] `authApi` — login, logout, me, update me, forgot password
- [x] Silent refresh + concurrent-request queue (refresh token stays in an httpOnly cookie)
- [x] `<ProtectedRoute>` + `<RoleGuard roles={[…]}>`
- [x] `useAuth()`, `usePermissions()` (unit-tested)
- [x] `SignInPage` (AzTU branded, RHF + zod)
- [x] `403` / `404` pages

## ✅ Phase 4 — Modern Layout & Navigation

- [x] `DashboardLayout` — collapsible sidebar, sticky header, content area, breadcrumbs
- [x] Role-aware sidebar from a typed menu spec (`shared/components/navigation/menu.ts`, unit-tested)
- [x] Header: notifications bell, theme toggle, user menu
- [x] Dark / light / system theme via `uiSlice`
- [x] Responsive — mobile drawer with overlay
- [ ] The header's search field is **decorative** — ⌘K focuses it, but typing in it does nothing

## 🟡 Phase 5 — Reusable Primitives

- [x] `<Button>`, `<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`, `<Switch>`, `<Label>` (Radix + CVA)
- [x] `<Dialog>`, `<ConfirmDialog>`, `<Tooltip>`, `<Tabs>`
- [x] `<Form>` / `<FormField>` (RHF integration)
- [x] `<FileUploader>`, `<ImageUploader>`, `<VideoUploader>` — the image and video pickers
      validate size and type against the API's allowlist (`upload/uploadConstraints.ts`) before
      a byte is sent; the video one adds progress and a stop button
- [x] `<StatCard>`, `<EmptyState>`, `<PageHeader>`, `<Breadcrumbs>`, `<DataTable>` with sorting and server-side pagination
- [ ] No standalone `<Drawer>` or `<Popover>`; the user menu uses Radix's dropdown directly
- [ ] `<DataTable>` has no column-visibility toggle, row selection or built-in filtering
- [ ] Uploads are **not** chunked or resumable — one PUT per file, restart on failure (see GAP_REPORT.md)

## 🟡 Phase 6 — Tutor Module

- [x] Courses list + create / edit + draft, in-review, published, archived states
- [x] Modules / lessons editor (full CRUD against `/api/portal/...`)
- [x] Offline delivery — as a course with `courseType=OFFLINE` + `offlineDetails`, **not** a separate "Trainings" module (that stub has been removed)
- [x] Video upload flow — init → PUT bytes → complete, with progress and stop
- [x] Enrollments view (own) + students enrolled in my courses
- [x] Room browsing, booking request form, booking history with cancel
- [x] Approvals status board
- [ ] Library videos cannot yet be picked when adding a lesson — the lesson editor uploads a new file instead

## ✅ Phase 7 — Admin Module

- [x] Tutor approval queue
- [x] Rooms CRUD + images + status incl. maintenance
- [x] Categories CRUD
- [x] Room pricing rules CRUD
- [x] Room request approvals
- [x] Users CRUD + status + account unlock
- [x] Course moderation queue (`?status=IN_REVIEW`) plus slug lookup
- [x] Analytics dashboard widgets
- [x] Notification broadcast

## ✅ Phase 8 — Super Admin Module

- [x] Audit log viewer (list + detail)
- [x] System monitoring dashboard (`/super/system/health`)
- [x] API log viewer
- [x] Security monitoring — overview, events, block IP, unlock user

## 🟡 Phase 9 — Notifications

- [x] In-app notification bell + full page
- [x] STOMP subscription (`useNotificationStream`, behind `VITE_ENABLE_WS_NOTIFICATIONS`)
- [x] Mark read / mark all read
- [x] Delivery channel shown per notification
- [ ] No read/unread or type filter on the notifications page
- [ ] No e-mail delivery-status tracking — the API reports the channel, not the outcome

## 🟡 Phase 10 — DX / Ops

- [x] Dockerfile (multi-stage: build → nginx)
- [x] `docker-compose.yml` + `docker-compose.prod.yml`
- [x] Nginx config — SPA fallback, gzip, security headers, `/api/` proxy
- [x] GitHub Actions: typecheck · lint · test · build, then a Docker image build on push
- [x] Vitest + Testing Library set up
- [ ] **Four test files only** (`Button`, `usePermissions`, `menu`, `uploadConstraints`) — no coverage of pages, API modules or the upload transport itself
- [ ] `lint-staged` is configured but Husky is **not installed** (no `.husky/`, no `prepare` script), so nothing runs pre-commit
- [ ] Storybook — not started, still optional
