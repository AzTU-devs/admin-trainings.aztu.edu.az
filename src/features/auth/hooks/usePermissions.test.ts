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

function makeWrapper(roles: (typeof ROLES)[keyof typeof ROLES][]) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  store.dispatch(
    authSuccess({
      user: { id: 1, email: "x@aztu.edu.az", fullName: "Test User", roles },
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
});
