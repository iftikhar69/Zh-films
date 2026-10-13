"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { favoriteKey, FAVORITE_LABELS, type FavoriteType } from "@/lib/favorites";

type FavoritesState = {
  keys: Record<string, true>;
  counts: Record<string, number>;
  hydrated: boolean;
  pending: Record<string, true>;
  hydrate: () => Promise<void>;
  toggle: (type: FavoriteType, id: string, title?: string) => Promise<void>;
  removeLocal: (key: string) => void;
  clearAll: () => Promise<void>;
};

export const useFavorites = create<FavoritesState>((set, get) => ({
  keys: {},
  counts: {},
  hydrated: false,
  pending: {},

  hydrate: async () => {
    try {
      const res = await fetch("/api/favorites", { cache: "no-store" });
      const data = (await res.json()) as { keys?: string[] };
      set({ keys: Object.fromEntries((data.keys ?? []).map((k) => [k, true as const])), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  toggle: async (type, id, title) => {
    const key = favoriteKey(type, id);
    if (get().pending[key]) return;
    const was = Boolean(get().keys[key]);

    const flip = (on: boolean) =>
      set((s) => {
        const keys = { ...s.keys };
        if (on) keys[key] = true;
        else delete keys[key];
        return { keys };
      });

    flip(!was);
    set((s) => ({ pending: { ...s.pending, [key]: true } }));

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id })
      });
      const data = (await res.json()) as { ok: boolean; favorited?: boolean; count?: number; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not save");
      flip(Boolean(data.favorited));
      set((s) => ({ counts: { ...s.counts, [key]: data.count ?? 0 } }));

      const label = title ?? FAVORITE_LABELS[type].singular;
      if (data.favorited) {
        toast.success("Added to your favorites", {
          description: label,
          action: { label: "View", onClick: () => window.location.assign("/favorites") }
        });
      } else {
        toast("Removed from favorites", { description: label });
      }
    } catch (e) {
      flip(was);
      toast.error(e instanceof Error ? e.message : "Could not save favorite");
    } finally {
      set((s) => {
        const pending = { ...s.pending };
        delete pending[key];
        return { pending };
      });
    }
  },

  removeLocal: (key) =>
    set((s) => {
      const keys = { ...s.keys };
      delete keys[key];
      return { keys };
    }),

  clearAll: async () => {
    const prev = get().keys;
    set({ keys: {} });
    const res = await fetch("/api/favorites", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      set({ keys: prev });
      toast.error("Could not clear favorites");
    } else {
      toast("Favorites cleared");
    }
  }
}));

export const useFavoriteCount = () => useFavorites((s) => Object.keys(s.keys).length);
