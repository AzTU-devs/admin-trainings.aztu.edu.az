/**
 * Reading (never verifying) the access token's claims in the browser. The API is
 * the only judge of a token; these helpers just let the client notice that a
 * token is about to expire, or that the roles it carries are out of date, before
 * the server has to say so.
 */
export interface AccessTokenClaims {
  sub?: string;
  exp?: number;
  roles?: string[];
}

export function decodeJwtPayload(token: string | null | undefined): AccessTokenClaims | null {
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(b64)) as AccessTokenClaims;
  } catch {
    return null;
  }
}

/** True when the token has expired or will within `marginSec`. An unreadable token counts as expired. */
export function isTokenExpired(token: string | null | undefined, marginSec = 30): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== "number") return true;
  return exp * 1000 <= Date.now() + marginSec * 1000;
}
