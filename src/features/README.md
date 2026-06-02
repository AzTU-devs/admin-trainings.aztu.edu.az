# `src/features`

One folder per business capability. Each feature is self-contained:

```
features/<name>/
  api/         # axios calls + RTK Query endpoints
  components/  # feature-local components
  hooks/       # feature-local hooks
  pages/       # route-level pages
  store/       # RTK slice (if feature owns state)
  types/       # feature types
  schemas/     # zod schemas (forms, validation)
  index.ts     # public surface — import from here
```

**Rules**
1. Features may import from `@shared/*` and `@lib/*`. Never from another feature directly — go through `@features/<name>` barrel.
2. Pages live in `pages/`. Route registration happens in `@app/router`.
3. Forms use `react-hook-form` + `zod` + `@hookform/resolvers/zod`.
4. Server state via RTK Query. Client/UI state via local component state or a feature slice.
