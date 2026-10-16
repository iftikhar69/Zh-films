import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/** Public pages only. Private galleries, accounts, bookings and admin are never listed. */
const PUBLIC_ROUTES = ["/", "/book", "/book/wedding", "/book/event", "/reels", "/gallery", "/journal", "/hire", "/rent", "/sell", "/about", "/instagram"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({ url: absoluteUrl(path), changeFrequency: "weekly", priority: path === "/" ? 1 : 0.7 }));
}
