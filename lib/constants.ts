export const BRAND = {
  name: "ZH Films",
  tagline: "Film Family. Lahore light.",
  gold: "#c8a96a",
  ceo: "Zulfikar Hussain",
  location: "Lahore, Pakistan"
} as const;

export const REELS_PAGE_SIZE = 6;
export const GALLERY_PAGE_SIZE = 9;
export const JOURNAL_PAGE_SIZE = 5;

export const REEL_CATEGORIES = ["all", "weddings", "pre-events", "aku", "commercial"] as const;
export type ReelCategory = (typeof REEL_CATEGORIES)[number];

export const GALLERY_CATEGORIES = [
  "all",
  "weddings",
  "aku",
  "commercial",
  "pre-events"
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const CREW_ROLES = [
  "cinematographer",
  "photographer",
  "editor",
  "drone",
  "sound",
  "gaffer",
  "assistant",
  "expert"
] as const;

export const GEAR_CATEGORIES = ["camera", "lens", "gimbal", "car", "other"] as const;
