import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import { Toaster } from "sonner";
import authReducer, { authSuccess } from "@features/auth/store/authSlice";
import uiReducer from "@lib/redux/uiSlice";
import { baseApi } from "@lib/query/baseApi";
import type { Role } from "@shared/constants/roles";
import { permissionsFor } from "./apiFixture";

/** Renders a component with a fresh store signed in as `roles`, a router and the toaster. */
export function renderWithStore(ui: ReactElement, roles: Role[] = ["ADMIN"]) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(
    authSuccess({
      user: { id: "u1", email: "fixture-me@example.com", fullName: "Fixture User", roles, permissions: permissionsFor(roles) },
      accessToken: "test-token",
    }),
  );
  const result = render(
    <Provider store={store}>
      <MemoryRouter>
        {ui}
        <Toaster />
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...result };
}
