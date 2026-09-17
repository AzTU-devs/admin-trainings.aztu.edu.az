# Backend ↔ portal contract report

What the admin/tutor portal needs, what `api-trainings.aztu.edu.az` actually exposes, and
where the two still do not meet.

**Verified 2026-09-18** by reading every `*Controller.java` in the API repo and every
`features/*/api/*.ts` module here — not by trusting the previous edition of this document,
which listed as "no backend yet" a dozen things that have since shipped.

Base path is `/api` (no `/v1`). Success responses are the envelope `{ data, meta, timestamp }`,
unwrapped centrally in the RTK Query baseQuery. Errors are
`{ status, code, message, path, requestId, timestamp, errors? }` — `code` is the stable
machine identifier worth branching on. Pagination is `PageResponse<T>` =
`{ content, page, size, totalElements, totalPages, first, last }`.

---

## Wired end to end

Each row is a portal module calling a controller that exists.

| Portal module | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/login`, `/logout`, `GET|PUT /api/auth/me`, `POST /api/auth/password/forgot`; `POST /api/auth/refresh` from `httpClient`'s interceptor, not from `authApi` |
| Dashboard | `GET /api/portal/tutor/dashboard`, `GET /api/admin/analytics/dashboard` |
| Courses (tutor, own incl. drafts) | `GET /api/portal/courses?status=`, `POST`, `PATCH /{id}`, `POST /{id}/submit`, `POST /{id}/archive` |
| Approvals board (tutor) | `GET /api/portal/courses?status=IN_REVIEW\|REJECTED\|PUBLISHED` |
| Modules & lessons | `GET|POST /api/portal/courses/{id}/modules`, `PUT|DELETE /api/portal/modules/{id}`, `GET|POST /api/portal/modules/{id}/lessons`, `PUT|DELETE /api/portal/lessons/{id}` |
| Course moderation (admin) | `GET /api/admin/courses?status=IN_REVIEW`, `GET /api/admin/courses/{id}`, `POST /api/admin/courses/{id}/decision` |
| Course detail by slug | `GET /api/public/courses/{slug}` |
| Media upload / display | `POST /api/media` (multipart), `GET /api/media/{id}/content` |
| Video library | `GET /api/videos`, `POST /api/videos/init`, `PUT /api/videos/{id}/content`, `POST /api/videos/{id}/complete`, `DELETE /api/videos/{id}` |
| Categories | `GET /api/public/categories`, `POST|PUT|DELETE /api/admin/categories/{id}` |
| Rooms | `GET|POST|PUT|DELETE /api/admin/rooms`, `GET /api/portal/rooms` |
| Room pricing rules | `GET|POST|PUT|DELETE /api/admin/rooms/{roomId}/pricing-rules` |
| Room bookings | `POST /api/portal/room-bookings`, `GET /mine`, `DELETE /{id}`, `GET /admin`, `POST /admin/{id}/decision` |
| Tutor approvals (admin) | `GET /api/portal/tutor/admin`, `POST /api/portal/tutor/admin/{tutorId}/decision` |
| Students (tutor) | `GET /api/portal/tutor/students` |
| Enrollments | `GET /api/portal/enrollments/mine` |
| Users (admin) | `GET|POST /api/admin/users`, `PUT /{id}`, `PATCH /{id}/status`, `DELETE /{id}` |
| Notifications | `GET /api/portal/notifications`, `/unread-count`, `POST /{id}/read`, `/read-all` |
| Broadcasts (admin) | `POST /api/admin/notifications/broadcast` |
| Analytics | `GET /api/admin/analytics/overview` |
| Audit logs | `GET /api/super/audit-logs`, `GET /api/super/audit-logs/{id}` |
| API logs | `GET /api/super/api-logs` |
| Security | `GET /api/super/security/overview`, `/events`, `POST /block-ip`, `POST /unlock/{userId}` |
| System monitoring | `GET /api/super/system/health` |

---

## Backend exists, portal has no screen for it

Not gaps in the API — decisions about portal scope. Listed so nobody re-implements them.

| API capability | Endpoints | Why the portal skips it |
| --- | --- | --- |
| Student self-registration | `POST /api/auth/register` | Students sign up on the public site |
| Tutor self-registration (OTP) | `POST /api/auth/register/tutor/start\|verify` | Public-site flow; the portal only approves the result |
| Admin self-registration (OTP) | `POST /api/auth/admin/register/start\|verify` | Deliberately not exposed in a UI — an admin is created out of band |
| Completing a password reset | `POST /api/auth/password/reset` | The mailed link points at the public site's `/reset-password?token=…`; the portal only *requests* the mail |
| E-mail verification | `POST /api/auth/email/verify/request\|confirm` | Public-site flow |
| Apple sign-in | `GET /api/auth/oauth/apple/start`, `POST /callback` | Student-facing |
| Tags | `GET /api/public/tags`, `POST|PUT|DELETE /api/admin/tags/{id}` | **No admin UI at all** — tags can only be managed by hand. The nearest real gap on this list |
| Admin-authored courses | `POST /api/admin/courses`, `PUT /api/admin/courses/{id}/tutors` | Course creation is a tutor flow; assigning co-tutors has no screen |
| Public course catalog + filters | `GET /api/public/courses?q&type&categoryId&level&language&free&priceMin&priceMax&ratingMin&durationBucket` | Consumed by the public site. The portal lists a tutor's *own* courses instead; `useBrowseCoursesQuery` / `useSearchCoursesQuery` are exported but currently unused |
| Public media | `GET /api/public/media/{id}/content` | Anonymous, for the public site's marketing assets. The portal is authenticated and uses `/api/media/{id}/content` |
| Public tutor profile | `GET /api/public/tutors/{id}` | Public site |
| Course progress | `GET /api/portal/enrollments/courses/{id}/progress`, `PUT /…/lessons/{lessonId}/progress` | Student-facing |
| Reviews | `GET /api/public/courses/{id}/reviews`, `POST /api/portal/courses/{id}/reviews` | Students write them; no moderation screen exists yet |
| Orders | `POST /api/portal/orders`, `GET /api/portal/orders/mine` | Payments are off (see below) |

---

## Real gaps

| Gap | Detail |
| --- | --- |
| **No S3 storage backend** | `StorageService` has exactly one implementation, `LocalStorageService`, writing to `app.storage.local.base-dir` (`/opt/uploads`). `MediaStorage` still has `S3` and `CDN` members and `MediaFile.storage` defaults to `S3`, so the enum reads like a choice that does not exist. Multi-host deployment needs a real implementation first. |
| **The video library is an island** | Videos uploaded at `/tutor/videos` cannot be attached to a lesson from the UI. `ModulesEditor` sets `videoMediaId` by uploading a *new* file through `POST /media`, with no picker that lists existing library assets. Both paths land in `media_file`, so the fix is a picker, not a migration. |
| **No duration or poster frame for videos** | Nothing probes an uploaded file, so `VideoAssetDto.durationSeconds` is always `0` and `thumbnailUrl` always `null`. The library shows the stored size instead of a run time, and a placeholder instead of a still. A lesson's `durationSeconds` is typed in by hand. |
| **Uploads have no chunking or resume** | `PUT /api/videos/{id}/content` takes the whole body in one request. A dropped connection at 480 MB means starting over, and the UI says so ("stopped", not "paused"). Resumable upload needs a backend offset endpoint before the client is worth changing. |
| **Two dropzones still filter on browser wildcards** | `ModulesEditor.acceptFor("VIDEO")` offers `video/*` and `shared/components/forms/ImageUploader` (room photos) offers `image/*` — both broader than the API allowlist, so an AVI or an SVG is refused only after the upload. `ModulesEditor`'s hint also still says "up to 100MB" for every lesson attachment, which matches no limit on either side. The mirror to use is `@shared/components/upload/uploadConstraints`, which `VideoUploader` and `upload/ImageUploader` already share. |
| **Tutor course search only filters the page on screen** | `GET /api/portal/courses` takes `status` and `Pageable` — no `q`. `CoursesListPage` compensates by filtering `data.content` in memory, so the search box silently ignores every course not on the current page. Either add `q` to the tutor endpoint or drop the box. |
| **The header search field does nothing** | `Header`'s `SearchBox` is an `<input>` with a placeholder, an `aria-label` and a ⌘K shortcut that focuses it — no `onChange`, no submit, no query. It reads as a working global search. Either wire it (there is no cross-entity search endpoint, so it would have to fan out) or remove it. |
| **Stale tag and comment** | `baseApi` still declares a `"Training"` cache tag and `moderationApi`'s doc comment still claims there is no moderation-queue endpoint. Both are leftovers; neither breaks anything. |

### Offline trainings

There is no trainings API and there will not be one under that name: offline delivery is a
`Course` with `courseType = OFFLINE` plus `offlineDetails` (start/end date, weekly and total
hours, student limit, city, address), created and edited on the normal course pages. The
`features/trainings` stub that advertised a pending endpoint has been removed along with its
route and sidebar entry.

---

## Cross-cutting notes

- **All IDs are UUID strings**, never numbers.
- **Enums**: `CourseType = ONLINE | OFFLINE` (no HYBRID); `CourseStatus` uses `IN_REVIEW`, not
  `PENDING_REVIEW`; `CourseLevel` adds `ALL`. Every decision endpoint (tutor, course, booking)
  takes `BookingDecision = APPROVED | REJECTED` with an optional `note`.
- **Categories on a course** are a `Set<UUID>` (`categoryIds`) — the form uses
  `CategoryMultiSelect`, not raw UUID entry.
- **Pageable** params are `page`, `size`, `sort`.
- **Payments are off.** `app.payments.enabled` defaults to `false`; while it is false the public
  catalog serves free courses only and `POST /api/portal/orders` refuses with a typed error.
  The portal has no checkout surface, so this costs it nothing — but do not add a price-driven
  screen assuming an order can be created.
- **Auth endpoints are rate limited** per IP and answer `429` with `Retry-After`: login 10/min,
  refresh 60/min, `password/forgot` 3/hour, the registration and OTP endpoints 5–10/hour. The
  sign-in screen toasts the API's own message, so a 429 reads correctly there; nothing reads
  `Retry-After` to disable the button for that long, which is the only refinement left.
- **Uploads are allowlisted by signature**, not by extension or declared type: JPEG, PNG, WebP,
  GIF, AVIF, MP4, WebM, QuickTime, PDF. SVG is deliberately excluded. Ceilings are 10 MB image,
  512 MB video, 25 MB document; rejections carry `UNSUPPORTED_MEDIA_TYPE`,
  `MEDIA_TYPE_MISMATCH`, `NOT_A_VIDEO`, `UNRECOGNIZED_FILE_CONTENT` or `UPLOAD_TOO_LARGE`.
  Four places have to agree on the video ceiling and currently do: `app.uploads.max-video-mb`
  and `spring.servlet.multipart.max-file-size` in the API, `VITE_UPLOAD_MAX_VIDEO_MB` here, and
  nginx's `client_max_body_size 550m` (above 512 MB, for framing and headers). Lower any one of
  them and a legitimate upload dies at that hop with an error the others cannot explain.
- **`/api/media/{id}/content` requires an `Authorization` header**, so a bare `<img src>` or
  `<video src>` cannot load it. Use `MediaImage`, which fetches the bytes through the axios
  client and renders an object URL. Two places still hand that URL straight to an element and
  therefore show nothing: the cover-image and trailer previews in `CourseDetailsForm` once the
  file is stored (a freshly picked file previews fine — that is a local object URL). A
  `MediaVideo` counterpart to `MediaImage`, or an authenticated fetch inside the uploaders,
  would close it.
