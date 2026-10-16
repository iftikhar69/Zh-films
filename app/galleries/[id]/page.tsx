import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer, loadGalleryFor, signedPhotoPage } from "@/lib/galleries";
import { FamilyGalleryViewer } from "@/components/galleries/FamilyGalleryViewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private gallery", robots: { index: false, follow: false, nocache: true } };

export default async function FamilyGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/galleries/${id}`)}`);
  const gallery = await loadGalleryFor(viewer, id);
  if (!gallery) notFound();
  const [first, total] = await Promise.all([signedPhotoPage(gallery.id), prisma.familyPhoto.count({ where: { galleryId: gallery.id } })]);

  return (
    <div className="mx-auto max-w-[1500px] px-3 pb-24 pt-24 sm:px-6 sm:pt-32">
      <header className="mb-10 grid gap-6 border-b border-white/10 pb-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link href="/galleries" className="text-xs text-zinc-500 hover:text-zinc-200">
            ← Your galleries
          </Link>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-6xl">{gallery.title}</h1>
          {gallery.description ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">{gallery.description}</p> : null}
        </div>
        <div className="space-y-1 text-right text-xs text-zinc-500">
          {gallery.eventDate ? <p className="font-mono uppercase tracking-[0.25em] text-zh-gold/80">{gallery.eventDate}</p> : null}
          <p>{total} photos</p>
          <p className="flex items-center justify-end gap-1.5">
            <Lock className="h-3 w-3" /> Private — links expire after an hour
          </p>
          {viewer.isAdmin && gallery.status !== "active" ? <p className="text-amber-200">Archived (visible to admins only)</p> : null}
        </div>
      </header>
      <FamilyGalleryViewer
        galleryId={gallery.id}
        initial={first.photos}
        initialCursor={first.nextCursor}
        total={total}
        downloads={gallery.allowDownloads || viewer.isAdmin}
      />
    </div>
  );
}
