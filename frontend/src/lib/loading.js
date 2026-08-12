// src/lib/loading.js

import { create } from "zustand";

export const useLoadingStore = create((set) => ({
  loadingCount: 0,

  startLoading: () =>
    set((state) => ({
      loadingCount: state.loadingCount + 1,
    })),

  stopLoading: () =>
    set((state) => ({
      loadingCount: Math.max(0, state.loadingCount - 1),
    })),
}));