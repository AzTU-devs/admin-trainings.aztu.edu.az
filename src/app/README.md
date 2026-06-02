# `src/app`

Application composition root.

- `providers/` — Redux, React Query, Theme, Toaster, ErrorBoundary, HelmetProvider
- `router/` — `AppRouter`, route guards (`ProtectedRoute`, `RoleGuard`), route tree
- `App.tsx` — top-level component that wires providers + router

Nothing in this folder should contain business logic — it is pure composition.
