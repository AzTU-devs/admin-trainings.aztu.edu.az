# Legacy template (TailAdmin React)

These directories are the original TailAdmin template, kept as a **reference library**:

- `src/components/` — except newly added AzTU components
- `src/context/` — old ThemeContext (replaced by Redux `uiSlice` in Phase 2)
- `src/hooks/`
- `src/icons/`
- `src/layout/` — replaced by `@features/*/layout` + new `@shared/components/layout`
- `src/pages/` — replaced by feature pages under `@features/*/pages`

They are **excluded from the new portal navigation**.

In Phase 4 (Modern Layout) we either:
- migrate useful pieces into `@shared/components/*` and **delete** the rest, or
- move all remaining files into `src/_legacy/` (one directory rename + tsconfig exclude).

Until then: do not import from these paths in new code.
