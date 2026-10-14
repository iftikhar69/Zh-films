import { NextResponse } from "next/server";
import instagramMedia from "@/lib/instagram-media.json";

type IgItem = {
  id: string;
  caption: string;
  mediaUrl: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  mediaType?: string;
};

const MOCK_SET: IgItem[] = instagramMedia.items.map((item) => ({
  id: item.shortcode,
  caption: item.caption,
  mediaUrl: item.poster,
  permalink: item.url,
  timestamp: new Date(item.takenAt * 1000).toISOString(),
  likeCount: item.likes,
  mediaType: item.isVideo ? "VIDEO" : "CAROUSEL_ALBUM"
}));

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") === "famous" ? "famous" : "latest";

  const rawToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
  const rawUser = process.env.INSTAGRAM_USER_ID ?? "";
  const token = rawToken && !rawToken.includes("http") ? rawToken : "";
  const userId = rawUser && !rawUser.includes("http") ? rawUser : "";

  let items: IgItem[] = MOCK_SET;
  let source = "archive";

  if (token && userId) {
    try {
      const url = new URL(`https://graph.instagram.com/${userId}/media`);
      url.searchParams.set(
        "fields",
        "id,caption,media_type,media_url,permalink,timestamp,like_count,thumbnail_url"
      );
      url.searchParams.set("access_token", token);
      const res = await fetch(url, { next: { revalidate: 600 } });
      if (!res.ok) throw new Error("ig_error");
      const data = (await res.json()) as {
        data?: Array<IgItem & { like_count?: number; media_url?: string; thumbnail_url?: string }>;
      };
      items = (data.data ?? []).map((d) => ({
        id: d.id,
        caption: d.caption ?? "",
        mediaUrl: d.mediaUrl || d.media_url || d.thumbnail_url || "",
        permalink: d.permalink,
        timestamp: d.timestamp,
        likeCount: d.like_count ?? d.likeCount ?? 0,
        mediaType: d.mediaType
      }));
      source = "live";
    } catch {
      source = "archive_fallback";
      items = MOCK_SET;
    }
  }

  const sorted = [...items].sort((a, b) => {
    if (sort === "famous") return (b.likeCount ?? 0) - (a.likeCount ?? 0);
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return NextResponse.json({ source, sort, items: sorted });
}
