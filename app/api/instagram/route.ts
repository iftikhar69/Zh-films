import { NextResponse } from "next/server";

type IgItem = {
  id: string;
  caption: string;
  mediaUrl: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  mediaType?: string;
};

const MOCK_SET: IgItem[] = [
  {
    id: "mock-1",
    caption: "Gold hour blocking on set — Lahore skyline breathing.",
    mediaUrl: "https://picsum.photos/seed/zhig1/640/1138",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
    likeCount: 2400
  },
  {
    id: "mock-2",
    caption: "Anamorphic flares during mehndi chaos — controlled fire.",
    mediaUrl: "https://picsum.photos/seed/zhig2/640/1138",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    likeCount: 5100
  },
  {
    id: "mock-3",
    caption: "AKU convocation — silence before the procession.",
    mediaUrl: "https://picsum.photos/seed/zhig3/640/1138",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    likeCount: 1800
  },
  {
    id: "mock-4",
    caption: "Drone poetry over the courtyard — altitude as emotion.",
    mediaUrl: "https://picsum.photos/seed/zhig4/640/1138",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 0.5 * 86400000).toISOString(),
    likeCount: 3200
  },
  {
    id: "mock-5",
    caption: "Lens tests — Cinema glass leaving the vault.",
    mediaUrl: "https://picsum.photos/seed/zhig5/640/1138",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 8 * 86400000).toISOString(),
    likeCount: 8900
  },
  {
    id: "mock-6",
    caption: "Film Family call sheet — eight seats, one language of light.",
    mediaUrl: "https://picsum.photos/seed/zhig6/640/1138",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    likeCount: 4200
  },
  {
    id: "mock-7",
    caption: "Reception walk — gimbal float through gold practicals.",
    mediaUrl: "https://picsum.photos/seed/zhig7/640/1138",
    permalink: "https://instagram.com",
    timestamp: new Date(Date.now() - 12 * 86400000).toISOString(),
    likeCount: 6700
  },
  {
    id: "mock-8",
    caption: "Behind the FX3 — Zulfikar on A-cam.",
    mediaUrl: "https://picsum.photos/seed/zhig8/640/1138",
    permalink: "https://instagram.com",
    timestamp: new Date().toISOString(),
    likeCount: 1500
  },
  {
    id: "mock-9",
    caption: "Walima exit — FX3 on RS4, gold practicals in the hall.",
    mediaUrl: "https://picsum.photos/seed/zhig9/640/1138",
    permalink: "https://www.instagram.com/zulfiqar_hussain.films/",
    timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
    likeCount: 7300
  },
  {
    id: "mock-10",
    caption: "Lens vault — 24-70 GM leaving the house. Contact Zulfikar.",
    mediaUrl: "https://picsum.photos/seed/zhig10/640/1138",
    permalink: "https://www.instagram.com/zulfiqar_hussain.films/",
    timestamp: new Date(Date.now() - 6 * 86400000).toISOString(),
    likeCount: 2100
  },
  {
    id: "mock-11",
    caption: "Hero car blocking — vintage arrival, one take.",
    mediaUrl: "https://picsum.photos/seed/zhig11/640/1138",
    permalink: "https://www.instagram.com/zulfiqar_hussain.films/",
    timestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
    likeCount: 9700
  },
  {
    id: "mock-12",
    caption: "Editor's bay — Bilal grading the gold hour reel.",
    mediaUrl: "https://picsum.photos/seed/zhig12/640/1138",
    permalink: "https://www.instagram.com/zulfiqar_hussain.films/",
    timestamp: new Date(Date.now() - 0.2 * 86400000).toISOString(),
    likeCount: 3600
  }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") === "famous" ? "famous" : "latest";

  const rawToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
  const rawUser = process.env.INSTAGRAM_USER_ID ?? "";
  const token = rawToken && !rawToken.includes("http") ? rawToken : "";
  const userId = rawUser && !rawUser.includes("http") ? rawUser : "";

  let items: IgItem[] = MOCK_SET;
  let source = "mock";

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
      source = "mock_fallback";
      items = MOCK_SET;
    }
  }

  const sorted = [...items].sort((a, b) => {
    if (sort === "famous") return (b.likeCount ?? 0) - (a.likeCount ?? 0);
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return NextResponse.json({ source, sort, items: sorted });
}
