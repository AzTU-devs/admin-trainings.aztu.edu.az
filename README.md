# AzTU Portal — Admin & Tutor Frontend

Frontend for the **Azerbaijan Technical University (AzTU)** LMS portal.

Used by three roles:

- **TUTOR** — manage courses, trainings, videos, modules, enrollments, students, request rooms
- **ADMIN** — approve tutors, manage rooms / categories / pricing, approve room requests, moderate courses, dashboards, manage notifications
- **SUPER_ADMIN** — audit logs, system monitoring, API logs, security

The backend is **Spring Boot**.

---

## Tech stack

| Concern              | Library                                              |
| -------------------- | ---------------------------------------------------- |
| Build                | Vite                                                 |
| Framework            | React 19 + TypeScript                                |
| Styling              | Tailwind CSS v4 + AzTU theme tokens                  |
| Primitives           | Radix UI + CVA (hand-rolled shadcn-style)            |
| Routing              | React Router v7                                      |
| Server state         | RTK Query                                            |
| Client state         | Redux Toolkit                                        |
| HTTP                 | Axios (interceptors: auth, refresh, error normalize) |
| Forms                | react-hook-form + zod                                |
| Tables               | TanStack Table v8                                    |
| Notifications        | sonner                                               |
| Icons                | lucide-react                                         |

---

## Architecture

```
src/
  app/                    # composition root
    providers/            # Redux, RTK Query, Theme, Toaster, ErrorBoundary
    router/               # AppRouter, route guards
  features/               # business modules — one folder per capability
    auth/  dashboard/  courses/  trainings/  videos/
    enrollments/  students/  rooms/  room-requests/
    categories/  users/  tutors/  moderation/  analytics/
    notifications/  audit-logs/  system-monitoring/
    api-logs/  security/
  shared/                 # cross-feature primitives (no business logic)
    components/{ui,layout,feedback,forms,tables,upload,charts,navigation,data-display}
    hooks/  lib/  utils/  constants/  types/  config/
  lib/                    # 3rd-party config
    axios/  query/  redux/  storage/
```

### Path aliases

```ts
"@/*"        -> src/*
"@app/*"     -> src/app/*
"@features/*"-> src/features/*
"@shared/*"  -> src/shared/*
"@lib/*"     -> src/lib/*
```

---

## Brand

| Token              | Value     | Use                              |
| ------------------ | --------- | -------------------------------- |
| `brand-700`        | `#003876` | AzTU navy — primary              |
| `brand-500`        | `#1a5ba5` | hover / focus                    |
| `aztu-gold-500`    | `#c8a951` | accent (badges, highlights)      |

Defined in [src/index.css](src/index.css).

---

## Environment

| File                | Purpose                            |
| ------------------- | ---------------------------------- |
| `.env.example`      | template (committed)               |
| `.env.development`  | dev defaults (committed)           |
| `.env.production`   | prod defaults (committed)          |
| `.env.local`        | machine secrets (gitignored)       |

Access only through the typed loader: `import { env } from "@shared/config/env"`.

---

## Build phases

This project is being built in phases. See [PHASES.md](./PHASES.md).

- **Phase 1 — Foundation & Branding** *(current)*
- Phase 2 — Core Infrastructure (axios, RTK, RTK Query, error boundary)
- Phase 3 — Auth & RBAC
- Phase 4 — Modern Layout & Navigation
- Phase 5 — Reusable Primitives (DataTable, FormField, Modal, Uploaders)
- Phase 6 — Tutor Module
- Phase 7 — Admin Module
- Phase 8 — Super Admin Module
- Phase 9 — Notifications
- Phase 10 — DX / Ops (Docker, CI, Husky, Vitest)

---

## Scripts

```bash
npm run dev         # vite dev server
npm run build       # tsc -b && vite build
npm run typecheck   # tsc -b --noEmit
npm run lint        # eslint .
npm run preview     # serve built dist/
```
