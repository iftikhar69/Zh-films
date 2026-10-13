import { create } from "zustand";

type UiState = {
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
};

export const useUi = create<UiState>((set) => ({
  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v })
}));
