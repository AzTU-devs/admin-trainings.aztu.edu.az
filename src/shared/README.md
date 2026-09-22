# `src/shared`

Cross-feature building blocks. **No business logic.**

- `components/ui/` — primitives (Button, Input, Dialog, Select, …) built on Radix + CVA
- `components/layout/` — `DashboardLayout`, `Sidebar`, `Header`, `PageHeader`, `Breadcrumbs`
- `components/feedback/` — `Toaster`, `EmptyState`, `ErrorBoundary`, `LoadingSpinner`
- `components/forms/` — `Form`, `FormField`, `FormSection`
- `components/tables/` — `DataTable`, column helpers, filter UI
- `components/upload/` — `FileUploader`, `ImageUploader`, `VideoUploader`
- `components/charts/` — chart wrappers
- `components/navigation/` — menu definitions
- `components/data-display/` — `StatCard`, `Badge`, `Avatar`, …
- `hooks/` — `useDebounce`, `usePagination`, `useMediaQuery`, `useDisclosure`, `useAuth`, `usePermissions`
- `components/bright/` — the public website's "Bright" visuals: `CourseCover`, `CategorySwatch`, `Monogram`,
  `Mosaic`, `Kicker`, `SoftEmpty`, `Svg`
- `lib/` — `cn`, formatters (date, number, currency), tiny pure helpers; `art.ts` (generated covers, tiles and
  monograms, ported from the website), `categoryStyle.ts` (category → hue family), `hue.ts` (stable hue for any
  string, Azerbaijani-safe `initialsOf`)
- `utils/` — non-pure helpers (download, copy-to-clipboard, …)
- `constants/` — `ROUTES`, `ROLES`, `QUERY_KEYS`
- `types/` — global types (`api.ts` envelope, etc.)
- `config/` — `env.ts` and other runtime config

Anything used by 2+ features lives here.

## Design tokens

`src/index.css` holds the "Bright Modern Learning" tokens (paper, surface, ink, line, navy, gold and the category
hue engine `k-*`) and re-points the template's `gray-*` / `brand-*` / `rounded-*` / `shadow-theme-*` scales onto
them. Prefer the tokens (`bg-surface`, `text-ink-2`, `border-line`, `bg-navy text-on-navy`, `bg-k-100`) in new
code: they follow the `.dark` class on their own, so they need no `dark:` variants.
