import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { galleriesFor, getViewer } from "@/lib/galleries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your family galleries", robots: { index: false, follow: false } };

export default async function MyGalleriesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?redirect_url=%2Fgalleries");
  const galleries = await galleriesFor(viewer);

  const covers = await Promise.all(
    galleries.map(async (g) => {
      const photo = g.coverPhotoId
        ? await prisma.familyPhoto.findFirst({ where: { id: g.coverPhotoId, galleryId: g.id }, select: { thumbPath: true } })
        : await prisma.familyPhoto.findFirst({ where: { galleryId: g.id }, orderBy: { sortOrder: "asc" }, select: { thumbPath: true } });
      return photo ? photo.thumbPath : null;
    })
  );
  const coverUrls = await signedUrls("family", covers.filter((c): c is string => !!c), 3600).catch(() => []);
  let k = 0;
  const coverFor = covers.map((c) => (c ? (coverUrls[k++] ?? null) : null));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_top,rgba(200,169,106,0.14),transparent_65%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-zh-gold/80">
          <Lock className="h-3 w-3" /> Private · only you and your family
        </p>
        <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-white sm:text-6xl">Your family galleries</h1>
        <p className="mt-4 max-w-xl text-sm text-zinc-400">
          Albums ZH Films has shared with {viewer.emails[0] ?? "your account"}. They aren&apos;t listed anywhere public.
        </p>

        {galleries.length === 0 ? (
          <div className="mt-14 max-w-xl rounded-3xl border border-white/10 bg-zinc-950/60 p-8">
            <p className="font-serif text-2xl text-white">No galleries shared with you yet</p>
            <p className="mt-3 text-sm text-zinc-400">
              When your photos are ready, ZH Films adds your email to the album and it appears here. Make sure you&apos;re signed in
              with the same email you gave us{viewer.emails.length ? "" : " and that it's verified"}.
            </p>
            <Link href="/account" className="mt-6 inline-flex text-xs uppercase tracking-[0.25em] text-zh-gold">
              Back to your account →
            </Link>
          </div>
        ) : (
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {galleries.map((g, i) => (
              <li key={g.id} className={i === 0 && galleries.length > 2 ? "sm:col-span-2 lg:row-span-2" : ""}>
                <Link href={`/galleries/${g.id}`} className="group relative block h-full min-h-[280px] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
                  {coverFor[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverFor[i]!} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="font-serif text-2xl text-white">{g.title}</p>
                    <p className="mt-1 text-xs text-zinc-300">
                      {g.eventDate ? `${g.eventDate} · ` : ""}
                      {g._count.photos} photos
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
