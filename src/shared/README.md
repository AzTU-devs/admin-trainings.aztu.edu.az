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
- `lib/` — `cn`, formatters (date, number, currency), tiny pure helpers
- `utils/` — non-pure helpers (download, copy-to-clipboard, …)
- `constants/` — `ROUTES`, `ROLES`, `QUERY_KEYS`
- `types/` — global types (`api.ts` envelope, etc.)
- `config/` — `env.ts` and other runtime config

Anything used by 2+ features lives here.
