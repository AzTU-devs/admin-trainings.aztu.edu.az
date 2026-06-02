# Build phases

Each phase is shippable on its own. Don't jump ahead — order matters.

---

## ✅ Phase 1 — Foundation & Branding

- [x] Install core deps (axios, RTK, react-redux, RHF, zod, sonner, lucide, Radix, CVA, TanStack Table)
- [x] Feature-based folder skeleton
- [x] Path aliases (`@/`, `@app`, `@features`, `@shared`, `@lib`)
- [x] AzTU brand palette in `index.css` (navy + gold)
- [x] `.env.example` / `.env.development` / `.env.production` + typed `env.ts`
- [x] `ROLES`, `ROUTES`, `cn()`, `ApiPage<T>` shared primitives
- [x] Rebrand `package.json`, `index.html`, `README`
- [x] Mark old TailAdmin pages as legacy reference (`src/LEGACY.md`)

## Phase 2 — Core Infrastructure

- [ ] `src/lib/redux/store.ts` — RTK store + typed hooks
- [ ] `src/lib/axios/httpClient.ts` — interceptors (auth, refresh queue, error normalization)
- [ ] `src/lib/query/baseApi.ts` — RTK Query base with axios baseQuery
- [ ] `src/app/providers/AppProviders.tsx` — Redux + Helmet + Toaster + ErrorBoundary
- [ ] `src/app/App.tsx` (new) + swap `main.tsx`
- [ ] Global `ErrorBoundary` + 500 fallback
- [ ] `uiSlice` — theme, sidebar collapsed, modal stack

## Phase 3 — Auth & RBAC

- [ ] `authSlice` — `accessToken`, `user`, `roles`, `status`
- [ ] `authApi` — login, logout, me, refresh
- [ ] Silent refresh + concurrent-request queue
- [ ] `<ProtectedRoute>` + `<RoleGuard roles={[…]}>`
- [ ] `useAuth()`, `usePermissions()`
- [ ] `SignInPage` (AzTU branded, RHF + zod)
- [ ] `403` / `404` pages

## Phase 4 — Modern Layout & Navigation

- [ ] `DashboardLayout` — collapsible sidebar, sticky header, content area, breadcrumbs
- [ ] Role-aware sidebar menu (data-driven from a typed menu spec)
- [ ] Header: global search, notifications bell, theme toggle, user menu
- [ ] Dark / light theme via Redux `uiSlice`
- [ ] Responsive (mobile drawer)

## Phase 5 — Reusable Primitives

- [ ] `<Button>`, `<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`, `<Switch>`, `<Label>` (Radix + CVA)
- [ ] `<Dialog>`, `<Drawer>`, `<ConfirmDialog>`, `<Popover>`, `<Tooltip>`, `<DropdownMenu>`, `<Tabs>`
- [ ] `<Form>` / `<FormField>` (RHF integration)
- [ ] `<DataTable>` (TanStack Table v8) — sort, filter, pagination, column visibility, row selection
- [ ] `<FileUploader>`, `<ImageUploader>`, `<VideoUploader>` (chunked / resumable, progress)
- [ ] `<StatCard>`, `<EmptyState>`, `<PageHeader>`, `<Breadcrumbs>`

## Phase 6 — Tutor Module

- [ ] Courses list + CRUD + draft/published states
- [ ] Modules / lessons / syllabus editor
- [ ] Trainings (offline)
- [ ] Video upload flow (resumable via tus or multipart chunks)
- [ ] Enrollments view + student tracking
- [ ] Room booking request form
- [ ] Approvals status board

## Phase 7 — Admin Module

- [ ] Tutor approval queue
- [ ] Rooms CRUD + images + free hours + maintenance
- [ ] Categories CRUD
- [ ] Room pricing
- [ ] Room request approvals
- [ ] Users CRUD
- [ ] Course moderation queue
- [ ] Analytics dashboard widgets
- [ ] Notifications management

## Phase 8 — Super Admin Module

- [ ] Audit log viewer
- [ ] System monitoring dashboard
- [ ] API log viewer
- [ ] Security monitoring

## Phase 9 — Notifications

- [ ] In-app notification dropdown + full page
- [ ] WS / SSE subscription
- [ ] Email delivery status tracking
- [ ] Mark read / mark all / filters

## Phase 10 — DX / Ops

- [ ] Dockerfile (multi-stage: build → nginx)
- [ ] `docker-compose.yml` (frontend + backend mock optional)
- [ ] Nginx config (SPA fallback, gzip, security headers)
- [ ] GitHub Actions: typecheck + lint + build
- [ ] Husky pre-commit (lint-staged + typecheck)
- [ ] Vitest + RTL setup
- [ ] Optional: Storybook for primitives
