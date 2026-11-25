import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { createElement, type ReactNode } from "react";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import { usePermissions } from "./usePermissions";
import { ROLES } from "@shared/constants/roles";

function makeWrapper(roles: (typeof ROLES)[keyof typeof ROLES][], permissions?: string[]) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  store.dispatch(
    authSuccess({
      user: { id: 1, email: "x@aztu.edu.az", fullName: "Test User", roles, ...(permissions ? { permissions } : {}) },
      accessToken: "t",
    }),
  );
  return ({ children }: { children: ReactNode }) => createElement(Provider, { store, children });
}

describe("usePermissions", () => {
  it("detects an admin", () => {
    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper([ROLES.ADMIN]) });
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isStaff).toBe(true);
    expect(result.current.isTutor).toBe(false);
  });

  it("has() matches any of the supplied roles", () => {
    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper([ROLES.TUTOR]) });
    expect(result.current.has(ROLES.ADMIN, ROLES.TUTOR)).toBe(true);
    expect(result.current.has(ROLES.SUPER_ADMIN)).toBe(false);
  });

  it("hasAll() requires every role", () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: makeWrapper([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
    });
    expect(result.current.hasAll(ROLES.ADMIN, ROLES.SUPER_ADMIN)).toBe(true);
    expect(result.current.hasAll(ROLES.ADMIN, ROLES.TUTOR)).toBe(false);
  });

  it("goes by the permissions the API sent, and by role where it sent none", () => {
    const listed = renderHook(() => usePermissions(), {
      wrapper: makeWrapper([ROLES.SUPER_ADMIN], ["course:read", "course:delete"]),
    }).result.current;
    expect(listed.can("course:delete", false)).toBe(true);
    expect(listed.can("user:delete", true)).toBe(false);
    expect(listed.canDeleteCourse).toBe(true);

    // A super admin whose list lacks it may not; an admin never may.
    expect(
      renderHook(() => usePermissions(), { wrapper: makeWrapper([ROLES.SUPER_ADMIN], ["course:read"]) }).result.current
        .canDeleteCourse,
    ).toBe(false);
    expect(renderHook(() => usePermissions(), { wrapper: makeWrapper([ROLES.ADMIN]) }).result.current.canDeleteCourse).toBe(
      false,
    );
    // No list at all (an older session): the super admin's role decides.
    expect(
      renderHook(() => usePermissions(), { wrapper: makeWrapper([ROLES.SUPER_ADMIN]) }).result.current.canDeleteCourse,
    ).toBe(true);
  });

  it("gives certificate:manage to the super admin, by the list or by role", () => {
    const of = (roles: (typeof ROLES)[keyof typeof ROLES][], permissions?: string[]) =>
      renderHook(() => usePermissions(), { wrapper: makeWrapper(roles, permissions) }).result.current.canManageCertificates;
    expect(of([ROLES.SUPER_ADMIN], ["certificate:manage"])).toBe(true);
    expect(of([ROLES.SUPER_ADMIN], ["course:end"])).toBe(false);
    expect(of([ROLES.SUPER_ADMIN])).toBe(true);
    expect(of([ROLES.ADMIN])).toBe(false);
    expect(of([ROLES.TUTOR], ["course:end"])).toBe(false);
  });
});
