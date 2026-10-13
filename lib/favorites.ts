export const FAVORITE_TYPES = ["reel", "gallery", "crew", "gear"] as const;
export type FavoriteType = (typeof FAVORITE_TYPES)[number];

export const favoriteKey = (type: FavoriteType, id: string) => `${type}:${id}`;

export const FAVORITE_LABELS: Record<FavoriteType, { singular: string; plural: string }> = {
  reel: { singular: "Reel", plural: "Reels" },
  gallery: { singular: "Frame", plural: "Frames" },
  crew: { singular: "Crew member", plural: "Crew" },
  gear: { singular: "Gear", plural: "Gear" }
};

export type FavoriteCard = {
  key: string;
  type: FavoriteType;
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  savedAt: string;
};
