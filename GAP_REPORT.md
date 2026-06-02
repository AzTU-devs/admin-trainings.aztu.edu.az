# Backend ↔ Frontend contract gap report

Generated while aligning the AzTU Portal frontend to the Spring Boot backend
(`eduplatform-backend`). Base path is `/api` (no `/v1`). Every response is the
envelope `{ data, meta, timestamp }` (unwrapped centrally in the frontend
baseQuery). Pagination is `PageResponse<T>` = `{ content, page, size,
totalElements, totalPages, first, last }`.

Legend: ✅ wired to a real endpoint · 🟡 partially (some endpoints missing) ·
🔴 no backend yet (frontend stubbed as "endpoint pending").

---

## ✅ Fully aligned & functional

| Feature | Endpoints used |
| --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/refresh` |
| Categories | `GET /api/public/categories`, `POST/PUT/DELETE /api/admin/categories/{id}` |
| Rooms | `GET /api/admin/rooms`, `POST/PUT/DELETE /api/admin/rooms/{id}` |
| Room bookings (admin) | `GET /api/portal/room-bookings/admin`, `POST /api/portal/room-bookings/admin/{id}/decision` |
| Tutor approvals (admin) | `GET /api/portal/tutor/admin`, `POST /api/portal/tutor/admin/{tutorId}/decision` |
| Notifications (user) | `GET /api/portal/notifications`, `GET .../unread-count`, `POST .../{id}/read`, `POST .../read-all` |
| Enrollments (mine) | `GET /api/portal/enrollments/mine` |
| Course create/edit | `POST /api/portal/courses`, `PATCH /api/portal/courses/{id}`, `POST .../submit`, `POST .../archive` |
| Course moderation (decision) | `POST /api/admin/courses/{id}/decision` |
| Course detail | `GET /api/public/courses/{slug}` |

---

## 🟡 Partially backed — missing endpoints

These pages work for the supported action but lack a list/read endpoint.

| Frontend need | Missing backend endpoint | Current frontend behaviour |
| --- | --- | --- |
| Tutor: list **my own** courses (incl. drafts) | `GET /api/portal/courses?mine&status=` (paged) | Courses list browses the **public** catalog (PUBLISHED only) as a stand-in |
| Tutor: approval status board | `GET /api/portal/courses?status=IN_REVIEW\|REJECTED` (own) | "Approval status endpoint pending" empty state |
| Admin: **list courses awaiting review** | `GET /api/admin/courses?status=IN_REVIEW` (paged) | Moderation is by **slug lookup** → review → decide |
| Tutor: list **my** room bookings + cancel | `GET /api/portal/room-bookings/mine`, `DELETE /api/portal/room-bookings/{id}` | Tutor page can **create** only; history is "pending" |
| Tutor: students enrolled in **my** courses | `GET /api/portal/tutor/students` (paged) | Students page unbacked (see below) |
| Course media (thumbnail/trailer/lesson video) | media upload + `mediaId` resolution endpoints | Cover/video uploaders not wired (UUID media IDs only) |
| Module / lesson management | `POST/PUT/DELETE /api/portal/courses/{id}/modules` & `.../lessons` | Modules shown **read-only** from `CourseDto.modules` |

---

## 🔴 No backend controller — frontend stubbed

| Frontend feature | Notes |
| --- | --- |
| Offline **trainings** | Model as a Course with `courseType=OFFLINE` + `offlineDetails`, or add a trainings API. Pages stubbed. |
| **Video library** + chunked upload | No `/videos` controller. Needs `POST /videos/init` (presigned) + `POST /videos/{id}/complete`, or media service. |
| **Room pricing** (time-bounded) | Pricing is a per-room `hourlyRate` field now; page explains this. Add a pricing-rules API only if tiered/time-bounded rates are needed. |
| Admin **users** management | No `/api/admin/users` controller. Needs list/create/update/status/delete. |
| Admin **notification broadcast** | No compose/broadcast endpoint; notifications are template-driven server-side. Needs `POST /api/admin/notifications/broadcast`. |
| **Analytics** dashboard | No `/api/admin/analytics/overview`. |
| Super-admin: **audit logs** | No `/api/super/audit-logs`. |
| Super-admin: **system monitoring** | No `/api/super/system/health` (could proxy `/actuator/health`). |
| Super-admin: **API logs** | No `/api/super/api-logs`. |
| Super-admin: **security** | No `/api/super/security/*`. |

---

## Cross-cutting backend notes for the frontend

- **All IDs are UUID strings** (not numbers). Frontend types updated accordingly.
- **Course enums**: `CourseType = ONLINE | OFFLINE` (no HYBRID); `CourseStatus`
  uses `IN_REVIEW` (not `PENDING_REVIEW`); `CourseLevel` adds `ALL`.
- **Decisions** (tutor + course + booking) all use `BookingDecision = APPROVED | REJECTED`
  with an optional `note` (`ApprovalDecisionRequest`).
- **Categories on a course** are a `Set<UUID>` (`categoryIds`), not a single category.
  A category multi-select picker is still TODO on the frontend (currently a
  comma-separated UUID input).
- **Admin self-registration** exists: `POST /api/auth/admin/register/start` (OTP)
  + `POST /api/auth/admin/register/verify`. The frontend only implements login;
  add a register screen if self-service admin onboarding is desired.
- **Pageable** params are `page`, `size`, `sort` (Spring convention) — already
  matched by the frontend `PageRequest`.
