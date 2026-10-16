import "server-only";
import { randomBytes } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { clerkConfigured, requireAdmin } from "@/lib/auth";
import { processImage } from "@/lib/image-pipeline";
import { removeObjects, signedUrls, uploadObject } from "@/lib/storage";

export type Viewer = { userId: string; emails: string[]; isAdmin: boolean };

/** The signed-in user and the emails they have verified. Unverified emails never grant access. */
export async function getViewer(): Promise<Viewer | null> {
  if (!clerkConfigured()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  if (!user) return null;
  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  const admin = await requireAdmin();
  return { userId, emails, isAdmin: admin.ok };
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

/** Galleries this viewer is a member of (admins see their own memberships here too). */
export async function galleriesFor(viewer: Viewer) {
  if (!viewer.emails.length) return [];
  return prisma.familyGallery.findMany({
    where: { status: "active", members: { some: { email: { in: viewer.emails } } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, eventDate: true, description: true, coverPhotoId: true, _count: { select: { photos: true } } }
  });
}

/**
 * The only way private gallery data is loaded. Returns null (callers answer 404) when the viewer
 * isn't an admin or a member with a verified email, or the gallery is archived for members.
 */
export async function loadGalleryFor(viewer: Viewer | null, galleryId: string) {
  if (!viewer || typeof galleryId !== "string" || galleryId.length > 40) return null;
  const gallery = await prisma.familyGallery.findUnique({ where: { id: galleryId } });
  if (!gallery) return null;
  if (viewer.isAdmin) return gallery;
  if (gallery.status !== "active" || !viewer.emails.length) return null;
  const member = await prisma.familyGalleryMember.findFirst({ where: { galleryId, email: { in: viewer.emails } }, select: { id: true } });
  return member ? gallery : null;
}

export const PAGE_SIZE = 48;
export const LINK_TTL_SECONDS = 60 * 60;

/** A page of photos with fresh, short-lived signed URLs. Call only after loadGalleryFor(). */
export async function signedPhotoPage(galleryId: string, cursor?: string | null) {
  const rows = await prisma.familyPhoto.findMany({
    where: { galleryId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, thumbPath: true, displayPath: true, width: true, height: true }
  });
  const page = rows.slice(0, PAGE_SIZE);
  const [thumbs, displays] = await Promise.all([
    signedUrls("family", page.map((p) => p.thumbPath), LINK_TTL_SECONDS),
    signedUrls("family", page.map((p) => p.displayPath), LINK_TTL_SECONDS)
  ]);
  return {
    photos: page.map((p, i) => ({ id: p.id, width: p.width, height: p.height, thumb: thumbs[i], display: displays[i] })),
    nextCursor: rows.length > PAGE_SIZE ? page[page.length - 1].id : null
  };
}

const rand = () => randomBytes(10).toString("hex");

/** Processes an image and stores original, web and thumbnail copies in the private bucket. */
export async function addPhoto(galleryId: string, bytes: Buffer, opts: { source: "upload" | "drive"; sourceId?: string; originalPath?: string }) {
  const img = await processImage(bytes);
  const id = rand();
  const base = `galleries/${galleryId}`;
  const originalPath = opts.originalPath ?? `${base}/original/${id}.${img.ext}`;
  const displayPath = `${base}/display/${id}.webp`;
  const thumbPath = `${base}/thumb/${id}.webp`;
  await Promise.all([
    opts.originalPath ? null : uploadObject("family", originalPath, bytes, img.mime),
    uploadObject("family", displayPath, img.display.buffer, "image/webp"),
    uploadObject("family", thumbPath, img.thumb.buffer, "image/webp")
  ]);
  const last = await prisma.familyPhoto.aggregate({ where: { galleryId }, _max: { sortOrder: true } });
  try {
    return await prisma.familyPhoto.create({
      data: {
        galleryId,
        originalPath,
        displayPath,
        thumbPath,
        width: img.width,
        height: img.height,
        bytes: bytes.length,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        source: opts.source,
        sourceId: opts.sourceId ?? null
      }
    });
  } catch (e) {
    await removeObjects("family", [displayPath, thumbPath, opts.originalPath ? "" : originalPath]).catch(() => {});
    throw e;
  }
}

export async function deletePhotos(photos: { originalPath: string; displayPath: string; thumbPath: string }[]) {
  const paths = photos.flatMap((p) => [p.originalPath, p.displayPath, p.thumbPath]);
  for (let i = 0; i < paths.length; i += 900) await removeObjects("family", paths.slice(i, i + 900));
}

export function newUploadPath(galleryId: string, ext: string) {
  return `galleries/${galleryId}/original/${rand()}.${ext}`;
}
