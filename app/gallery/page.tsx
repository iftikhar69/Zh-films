import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getLoveCounts } from "@/lib/queries";
import { GALLERY_CATEGORIES, GALLERY_PAGE_SIZE, type GalleryCategory } from "@/lib/constants";
import { GalleryExperience } from "@/components/gallery/GalleryExperience";
import { FilmDustGallery } from "@/components/gallery/FilmDustGallery";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Gallery",
  description:
    "Hybrid photo and video gallery with category filters and theater viewing — ZH Films, Lahore.",
  path: "/gallery"
});

type Props = { searchParams: Promise<{ page?: string; category?: string }> };

export default async function GalleryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const raw = (sp.category ?? "all").toLowerCase();
  const category = (GALLERY_CATEGORIES.includes(raw as GalleryCategory) ? raw : "all") as GalleryCategory;
  const where = category === "all" ? {} : { category };

  const [total, items] = await Promise.all([
    prisma.galleryItem.count({ where }),
    prisma.galleryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * GALLERY_PAGE_SIZE,
      take: GALLERY_PAGE_SIZE
    })
  ]);
  const loves = await getLoveCounts(
    "gallery",
    items.map((i) => i.id)
  );

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Gallery", path: "/gallery" }
        ])}
      />
      <div className="pt-28 sm:pt-32">
        <FilmDustGallery />
      </div>
      <GalleryExperience key={`${category}-${page}`} initial={items} loves={loves} total={total} category={category} page={page} />
    </>
  );
}
