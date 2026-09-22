/**
 * Shared API response envelope types. Mirrors the Spring Boot contract.
 */

/**
 * Backend success envelope — every controller returns `ApiResponse.ok(data)`:
 *   { "data": T, "meta": {...} | null, "timestamp": "..." }
 */
export interface ApiEnvelope<T, M = unknown> {
  data: T;
  meta: M | null;
  timestamp: string;
}

export interface ApiPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** One entry of the API's validation error list (backend `FieldErrorItem`). */
export interface ApiFieldError {
  field: string;
  code?: string;
  message?: string;
  rejectedValue?: unknown;
}

/**
 * Backend error body (RFC-7807-ish):
 *   { "status": 401, "code": "UNAUTHENTICATED", "message": "...", "path": "...", "timestamp": "..." }
 * Validation errors (400 VALIDATION_FAILED) add `errors`, an ARRAY of
 * `{ field, code, message }` — not a map. `normalizeError` folds it into one.
 */
export interface ApiErrorBody {
  timestamp: string;
  status: number;
  code?: string;
  error?: string;
  message: string;
  path?: string;
  errors?: ApiFieldError[] | Record<string, string>;
  fieldErrors?: ApiFieldError[] | Record<string, string>;
}

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
}

export type ID = string | number;
