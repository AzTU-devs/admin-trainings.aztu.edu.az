import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { appStorage, STORAGE_KEYS } from "@lib/storage";
import type { ThemeMode } from "@shared/types/ui";

export interface UiState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  globalLoading: boolean;
}

const initialState: UiState = {
  theme: appStorage.get<ThemeMode>(STORAGE_KEYS.theme) ?? "system",
  sidebarCollapsed: appStorage.get<boolean>(STORAGE_KEYS.sidebarCollapsed) ?? false,
  mobileSidebarOpen: false,
  globalLoading: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      appStorage.set(STORAGE_KEYS.theme, action.payload);
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      appStorage.set(STORAGE_KEYS.sidebarCollapsed, state.sidebarCollapsed);
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
      appStorage.set(STORAGE_KEYS.sidebarCollapsed, action.payload);
    },
    setMobileSidebarOpen(state, action: PayloadAction<boolean>) {
      state.mobileSidebarOpen = action.payload;
    },
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },
  },
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  setMobileSidebarOpen,
  setGlobalLoading,
} = uiSlice.actions;
export default uiSlice.reducer;
