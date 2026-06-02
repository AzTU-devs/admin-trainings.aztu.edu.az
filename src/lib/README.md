# `src/lib`

Third-party library configuration. One folder per external dependency.

- `axios/` — `httpClient` instance, interceptors (auth, refresh, error normalization)
- `query/` — RTK Query base API + `queryClient` if React Query is also used
- `redux/` — `store`, `rootReducer`, typed hooks (`useAppDispatch`, `useAppSelector`)
- `storage/` — typed `localStorage` / `sessionStorage` wrappers

No business types belong here.
