import { create } from "zustand";

type CinemaState = {
  cinemaMode: boolean;
  soundEnabled: boolean;
  setCinemaMode: (v: boolean) => void;
  toggleCinemaMode: () => void;
  setSoundEnabled: (v: boolean) => void;
  toggleSound: () => void;
};

/** Cinema Mode defaults OFF — curtains/rays were a major scroll-lag source. */
export const useCinemaStore = create<CinemaState>((set, get) => ({
  cinemaMode: false,
  soundEnabled: false,
  setCinemaMode: (v) => set({ cinemaMode: v }),
  toggleCinemaMode: () => set({ cinemaMode: !get().cinemaMode }),
  setSoundEnabled: (v) => set({ soundEnabled: v }),
  toggleSound: () => set({ soundEnabled: !get().soundEnabled })
}));
