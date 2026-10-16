import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/galleries", "/booking/", "/favorites", "/api/", "/sign-in", "/sign-up"]
    },
    sitemap: absoluteUrl("/sitemap.xml")
  };
}
