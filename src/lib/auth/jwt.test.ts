import { describe, expect, it } from "vitest";
import { decodeJwtPayload, isTokenExpired } from "./jwt";

const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const token = (claims: object) => `${enc({ alg: "HS256" })}.${enc(claims)}.sig`;

describe("jwt helpers", () => {
  it("reads the roles claim", () => {
    expect(decodeJwtPayload(token({ roles: ["ADMIN"] }))?.roles).toEqual(["ADMIN"]);
  });

  it("treats garbage as unreadable and expired", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(isTokenExpired("not-a-jwt")).toBe(true);
    expect(isTokenExpired(null)).toBe(true);
  });

  it("applies the safety margin", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTokenExpired(token({ exp: now + 600 }))).toBe(false);
    expect(isTokenExpired(token({ exp: now + 10 }), 30)).toBe(true);
    expect(isTokenExpired(token({ exp: now - 1 }))).toBe(true);
  });
});
