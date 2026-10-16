import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { storageConfigured } from "@/lib/storage";
import { CreateGalleryForm } from "@/components/admin/galleries/CreateGalleryForm";

export const dynamic = "force-dynamic";

export default async function AdminGalleriesPage() {
  await adminPageGuard("/admin/galleries");
  const galleries = await prisma.familyGallery.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { photos: true, members: true } } }
  });
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-white">Family galleries</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Private albums for a family or event. Photos are stored in private storage and shown only to people whose verified
          account email you add to the gallery. Nothing here appears on the public site or in search engines.
        </p>
      </header>
      {!storageConfigured() ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
          Storage isn&apos;t configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to upload photos.
        </p>
      ) : null}
      <CreateGalleryForm />
      {galleries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
          No galleries yet. Create one above, then upload photos or import them from a shared Drive folder.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {galleries.map((g) => (
            <li key={g.id}>
              <Link
                href={`/admin/galleries/${g.id}`}
                className="block rounded-2xl border border-white/10 bg-zinc-950/60 p-5 transition hover:border-zh-gold/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-serif text-lg text-white">{g.title}</p>
                  {g.status === "archived" ? (
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">Archived</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {g.eventDate ? `${g.eventDate} · ` : ""}
                  {g._count.photos} photos · {g._count.members} {g._count.members === 1 ? "person" : "people"} with access
                  {g.allowDownloads ? " · downloads on" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
