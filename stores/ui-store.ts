import { create } from "zustand";

type UiState = {
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  introDone: boolean;
  setIntroDone: () => void;
};

export const useUi = create<UiState>((set) => ({
  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),
  introDone: false,
  setIntroDone: () => set({ introDone: true })
}));
