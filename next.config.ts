import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin workspace root when multiple lockfiles exist above this folder.
    root: "."
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/**" },
      { protocol: "https", hostname: "scontent.cdninstagram.com", pathname: "/**" },
      { protocol: "https", hostname: "scontent-iad3-1.cdninstagram.com", pathname: "/**" },
      { protocol: "https", hostname: "instagram.com", pathname: "/**" },
      { protocol: "https", hostname: "www.instagram.com", pathname: "/**" }
    ]
  }
};

export default nextConfig;
