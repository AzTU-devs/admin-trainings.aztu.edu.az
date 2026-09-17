# AzTU Portal — Admin & Tutor Frontend

Staff frontend for the **Azerbaijan Technical University (AzTU)** LMS. Students never see
this app: they use the public site at `trainings.aztu.edu.az`. The backend is the Spring Boot
API at `api-trainings.aztu.edu.az`.

Three roles share one build, and the sidebar is filtered per role from a single typed menu
spec ([src/shared/components/navigation/menu.ts](src/shared/components/navigation/menu.ts)):

- **TUTOR** — courses (online and offline), modules & lessons, the video library, enrollments,
  own students, room browsing and booking requests, own approval status
- **ADMIN** — tutor approvals, rooms, room pricing rules, booking requests, categories, users,
  course moderation, analytics, notification broadcasts
- **SUPER_ADMIN** — everything an admin sees, plus audit logs, API logs, security monitoring
  and system health

There is **no separate "Trainings" module**. Offline delivery is a course with
`courseType=OFFLINE` and an `offlineDetails` block (dates, weekly and total hours, student
limit, city, address), edited on the normal course pages.

Three companion documents are kept current and are worth reading before planning work:

| Document | What it answers |
| --- | --- |
| [GAP_REPORT.md](./GAP_REPORT.md) | Which endpoints exist, which screens use them, and what is genuinely still missing |
| [PHASES.md](./PHASES.md) | What is built, per phase, with the unfinished lines left unticked |
| [DEPLOY.md](./DEPLOY.md) | Docker build, the nginx `/api` proxy, TLS expectations, upload body limits |

---

## Tech stack

| Concern              | Library                                              |
| -------------------- | ---------------------------------------------------- |
| Build                | Vite 6                                               |
| Framework            | React 19 + TypeScript                                |
| Styling              | Tailwind CSS v4 + AzTU theme tokens                  |
| Primitives           | Radix UI + CVA (hand-rolled, shadcn-style)           |
| Routing              | React Router v7                                      |
| Server state         | RTK Query (axios baseQuery)                          |
| Client state         | Redux Toolkit                                        |
| HTTP                 | Axios (interceptors: auth, silent refresh, error normalization) |
| Forms                | react-hook-form + zod                                |
| Tables               | TanStack Table v8                                    |
| Realtime             | STOMP over WebSocket (notifications)                 |
| Notifications        | sonner                                               |
| Icons                | lucide-react                                         |
| Tests                | Vitest + Testing Library                             |

---

## Architecture

```
src/
  app/                    # composition root
    providers/            # Redux, Helmet, Toaster, ErrorBoundary, auth bootstrap
    router/               # ProtectedRoute, RoleGuard (the route table lives in App.tsx)
  features/               # business modules — one folder per capability
    analytics/  api-logs/  audit-logs/  auth/  categories/  courses/
    dashboard/  enrollments/  moderation/  notifications/  profile/
    room-requests/  rooms/  security/  students/  system-monitoring/
    tutors/  users/  videos/
  shared/                 # cross-feature primitives (no business logic)
    api/  config/  constants/  lib/  types/
    components/{ui,layout,forms,upload,tables,navigation,feedback,data-display}
  lib/                    # 3rd-party wiring
    axios/  query/  redux/  storage/
  test/                   # Vitest setup
```

A feature folder holds only what that feature needs: `api/` (RTK Query endpoints), `pages/`,
and `components/`, `schemas/`, `types/`, `hooks/`, `store/` where they apply. Anything two
features would both want belongs in `shared/`.

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

Full ramps are defined as Tailwind v4 theme tokens in [src/index.css](src/index.css). Use the
token classes (`bg-brand-700`, `text-aztu-gold-500`), never a raw hex.

---

## Environment

| File                | Purpose                            |
| ------------------- | ---------------------------------- |
| `.env.example`      | template, with the reasoning per variable (committed) |
| `.env.development`  | dev defaults (committed)           |
| `.env.production`   | prod defaults (committed)          |
| `.env.local`        | machine overrides (gitignored)     |

Read env only through the typed loader: `import { env } from "@shared/config/env"`. Every
default and coercion lives there, so a variable missing from a build environment becomes a
documented fallback rather than `undefined` deep inside a component.

Two things about these files are deliberate rather than incidental:

- **Nothing here is a secret.** Every `VITE_*` value is inlined into the browser bundle at
  build time and is readable by anyone who loads the app.
- **The access token lives in `sessionStorage`** (`VITE_AUTH_TOKEN_STORAGE`), so it dies with
  the tab. The refresh token is never in web storage at all — the API keeps it in an httpOnly
  cookie and `httpClient` refreshes against that.

### Upload ceilings

`VITE_UPLOAD_MAX_IMAGE_MB` (10) and `VITE_UPLOAD_MAX_VIDEO_MB` (512) are **client-side
pre-checks** so an oversized or unsupported file is refused instantly instead of after a long
upload and an opaque 413. The real enforcement is the API's `app.uploads.max-*-mb` plus its
signature-based allowlist, and nginx's `client_max_body_size 550m` sits above both. Raising one
of the three without the others just moves where the failure happens — see the upload section
of [GAP_REPORT.md](./GAP_REPORT.md).

The picker's accepted types mirror the API allowlist exactly
([src/shared/components/upload/uploadConstraints.ts](src/shared/components/upload/uploadConstraints.ts)):
JPEG, PNG, GIF, WebP, AVIF for images and MP4, WebM, QuickTime for video. SVG is excluded on
both sides, because it is an XML document that can carry a script and stored media is served
under the portal's own origin.

---

## Scripts

```bash
npm run dev          # vite dev server
npm run build        # tsc -b && vite build
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint .
npm run format       # prettier --write .
npm run test         # vitest (watch)
npm run test:ci      # vitest --run
npm run preview      # serve built dist/
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs typecheck · lint · test · build
on every push and pull request to `main`/`develop`, then builds the Docker image on push.
`lint-staged` is configured but Husky is not installed, so nothing currently runs pre-commit.
