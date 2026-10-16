import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { signedUrls } from "@/lib/storage";
import { GalleryManager } from "@/components/admin/galleries/GalleryManager";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await adminPageGuard(`/admin/galleries/${id}`);
  const gallery = await prisma.familyGallery.findUnique({
    where: { id },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, thumbPath: true, width: true, height: true, source: true } }
    }
  });
  if (!gallery) notFound();
  const thumbs = await signedUrls("family", gallery.photos.map((p) => p.thumbPath), 3600).catch(() => gallery.photos.map(() => null));
  return (
    <div className="space-y-6">
      <Link href="/admin/galleries" className="text-xs text-zinc-400 hover:text-white">
        ← All galleries
      </Link>
      <GalleryManager
        gallery={{
          id: gallery.id,
          title: gallery.title,
          eventDate: gallery.eventDate,
          description: gallery.description,
          status: gallery.status,
          allowDownloads: gallery.allowDownloads,
          coverPhotoId: gallery.coverPhotoId
        }}
        members={gallery.members.map((m) => ({ email: m.email, addedBy: m.addedBy }))}
        photos={gallery.photos.map((p, i) => ({ id: p.id, width: p.width, height: p.height, source: p.source, thumb: thumbs[i] }))}
      />
    </div>
  );
}
