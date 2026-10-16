"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CloudDownload, ImagePlus, Star, Trash2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ACCEPTED_IMAGES, imageExt, postJson, putWithProgress } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

type Gallery = { id: string; title: string; eventDate: string; description: string; status: string; allowDownloads: boolean; coverPhotoId: string | null };
type Photo = { id: string; width: number; height: number; source: string; thumb: string | null };
type Job = { name: string; progress: number; state: "waiting" | "uploading" | "processing" | "done" | "error"; error?: string };

export function GalleryManager({ gallery, members, photos }: { gallery: Gallery; members: { email: string; addedBy: string }[]; photos: Photo[] }) {
  const router = useRouter();
  const api = `/api/admin/galleries/${gallery.id}`;
  const [form, setForm] = useState(gallery);
  const [email, setEmail] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [folder, setFolder] = useState("");
  const [driveFiles, setDriveFiles] = useState<{ id: string; name: string; imported: boolean }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast.success(ok);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const setJob = (i: number, patch: Partial<Job>) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...patch } : j)));

  async function upload(files: File[]) {
    const start = jobs.length;
    setJobs((js) => [...js, ...files.map((f) => ({ name: f.name, progress: 0, state: "waiting" as const }))]);
    for (let n = 0; n < files.length; n++) {
      const i = start + n;
      const file = files[n];
      const ext = imageExt(file);
      if (!ext) {
        setJob(i, { state: "error", error: "Use JPG, PNG or WebP (convert HEIC photos first)" });
        continue;
      }
      try {
        setJob(i, { state: "uploading" });
        const { path, uploadUrl } = await postJson<{ path: string; uploadUrl: string }>(`${api}/photos`, { action: "sign", ext });
        await putWithProgress(uploadUrl, file, (p) => setJob(i, { progress: p }));
        setJob(i, { state: "processing", progress: 1 });
        await postJson(`${api}/photos`, { action: "commit", path });
        setJob(i, { state: "done" });
      } catch (e) {
        setJob(i, { state: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    }
    router.refresh();
  }

  async function importDrive() {
    if (!driveFiles) return;
    const todo = driveFiles.filter((f) => !f.imported);
    const start = jobs.length;
    setJobs((js) => [...js, ...todo.map((f) => ({ name: f.name, progress: 0, state: "waiting" as const }))]);
    for (let n = 0; n < todo.length; n++) {
      const i = start + n;
      setJob(i, { state: "processing" });
      try {
        await postJson(`${api}/drive`, { action: "import", fileId: todo[n].id });
        setJob(i, { state: "done", progress: 1 });
        setDriveFiles((fs) => fs?.map((f) => (f.id === todo[n].id ? { ...f, imported: true } : f)) ?? null);
      } catch (e) {
        setJob(i, { state: "error", error: e instanceof Error ? e.message : "Import failed" });
      }
    }
    router.refresh();
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-950/50 p-5 sm:grid-cols-2">
        <label className="block space-y-1 text-xs text-zinc-400">
          <span>Title</span>
          <Input value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="block space-y-1 text-xs text-zinc-400">
          <span>Event date</span>
          <Input value={form.eventDate} maxLength={40} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
        </label>
        <label className="block space-y-1 text-xs text-zinc-400 sm:col-span-2">
          <span>Note for the family (optional)</span>
          <Textarea value={form.description} maxLength={1000} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={form.allowDownloads} onChange={(e) => setForm({ ...form, allowDownloads: e.target.checked })} className="accent-[#c8a96a]" />
          Allow full-resolution downloads
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() =>
              run("status", () => postJson(api, { status: form.status === "active" ? "archived" : "active" }, "PATCH"), form.status === "active" ? "Archived — members can no longer open it" : "Gallery restored").then(() =>
                setForm((f) => ({ ...f, status: f.status === "active" ? "archived" : "active" }))
              )
            }
          >
            {form.status === "active" ? "Archive" : "Restore"}
          </Button>
          <Button
            size="sm"
            disabled={busy !== null}
            onClick={() =>
              run("save", () => postJson(api, { title: form.title, eventDate: form.eventDate, description: form.description, allowDownloads: form.allowDownloads }, "PATCH"), "Saved")
            }
          >
            Save details
          </Button>
        </div>
        {form.status === "archived" ? <p className="text-xs text-amber-200 sm:col-span-2">This gallery is archived. Members can&apos;t open it.</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Who can view</h2>
        <p className="text-xs text-zinc-500">
          Add the email each family member signs in with. Access works only after they sign in and verify that email. Remove an
          email to revoke access immediately.
        </p>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void run("member", () => postJson(`${api}/members`, { email }), "Access granted").then(() => setEmail(""));
          }}
        >
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="family@example.com" required />
          <Button type="submit" disabled={busy !== null}>
            Give access
          </Button>
        </form>
        {members.length === 0 ? (
          <p className="text-sm text-zinc-500">Nobody has access yet.</p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
            {members.map((m) => (
              <li key={m.email} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className="truncate text-zinc-200">{m.email}</span>
                <ConfirmButton
                  label={<UserMinus className="h-4 w-4" />}
                  title="Remove access?"
                  body={`${m.email} will no longer be able to open this gallery.`}
                  confirmLabel="Remove access"
                  onConfirm={() => run("remove", () => postJson(`${api}/members`, { email: m.email }, "DELETE"), "Access removed")}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Add photos</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 p-6 text-center text-sm text-zinc-300 transition hover:border-zh-gold/50">
            <ImagePlus className="h-6 w-6 text-zh-gold" />
            Upload from this device
            <span className="text-xs text-zinc-500">JPG, PNG or WebP · up to 40 MB each · location data is removed</span>
            <input
              type="file"
              accept={ACCEPTED_IMAGES}
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) void upload(files);
              }}
            />
          </label>
          <div className="space-y-2 rounded-2xl border border-white/10 p-4">
            <p className="flex items-center gap-2 text-sm text-zinc-200">
              <CloudDownload className="h-4 w-4 text-zh-gold" /> Import from Google Drive (one time)
            </p>
            <p className="text-xs text-zinc-500">
              The folder must be shared as “Anyone with the link”. Photos are copied into private storage — after importing, set
              the Drive folder back to Restricted.
            </p>
            <div className="flex gap-2">
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" />
              <Button
                variant="outline"
                disabled={busy !== null || !folder}
                onClick={() =>
                  run("list", async () => {
                    const { files } = await postJson<{ files: { id: string; name: string; imported: boolean }[] }>(`${api}/drive`, { action: "list", folder });
                    setDriveFiles(files);
                  })
                }
              >
                Check
              </Button>
            </div>
            {driveFiles ? (
              <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                <span>
                  {driveFiles.length} images found · {driveFiles.filter((f) => f.imported).length} already imported
                </span>
                <Button size="sm" disabled={!driveFiles.some((f) => !f.imported)} onClick={() => void importDrive()}>
                  Import {driveFiles.filter((f) => !f.imported).length} photos
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        {jobs.length ? (
          <ul className="max-h-56 space-y-1 overflow-auto rounded-xl border border-white/10 p-3 text-xs" aria-live="polite">
            {jobs.map((j, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-zinc-300">{j.name}</span>
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <span className={cn("block h-full", j.state === "error" ? "bg-red-500" : "bg-zh-gold")} style={{ width: `${Math.round(j.progress * 100)}%` }} />
                </span>
                <span className={cn("w-40 truncate text-right", j.state === "error" ? "text-red-300" : j.state === "done" ? "text-emerald-300" : "text-zinc-500")}>
                  {j.state === "error" ? j.error : j.state === "processing" ? "Processing…" : j.state === "uploading" ? `${Math.round(j.progress * 100)}%` : j.state}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Photos ({photos.length})</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size !== 1 || busy !== null}
              onClick={() => run("cover", () => postJson(api, { coverPhotoId: [...selected][0] }, "PATCH"), "Cover photo set")}
            >
              <Star /> Set as cover
            </Button>
            <ConfirmButton
              label={
                <>
                  <Trash2 /> Delete {selected.size || ""}
                </>
              }
              disabled={!selected.size}
              title={`Delete ${selected.size} photo${selected.size === 1 ? "" : "s"}?`}
              body="The original, web and thumbnail files are removed from storage. This can't be undone."
              confirmLabel="Delete photos"
              onConfirm={() => run("delete", () => postJson(`${api}/photos`, { action: "delete", photoIds: [...selected] }), "Deleted").then(() => setSelected(new Set()))}
            />
          </div>
        </div>
        {photos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">No photos yet.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {photos.map((p) => {
              const on = selected.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className={cn("relative block aspect-square w-full overflow-hidden rounded-lg border", on ? "border-zh-gold ring-2 ring-zh-gold" : "border-white/10")}
                  >
                    {p.thumb ? (
                      // Signed, expiring URLs from private storage; next/image would cache them publicly.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumb} alt="" width={p.width} height={p.height} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-zinc-500">Unavailable</span>
                    )}
                    {on ? (
                      <span className="absolute right-1 top-1 rounded-full bg-zh-gold p-0.5 text-black">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                    {gallery.coverPhotoId === p.id ? (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] uppercase tracking-wider text-zh-gold">Cover</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/20 p-5">
        <p className="text-sm text-zinc-400">Delete this gallery, its access list and every stored photo.</p>
        <ConfirmButton
          label="Delete gallery"
          title="Delete this gallery permanently?"
          body="All photos are removed from storage and nobody can open the gallery again. Archive it instead if you might need it later."
          typeToConfirm="DELETE"
          confirmLabel="Delete gallery"
          onConfirm={async () => {
            try {
              await postJson(api, {}, "DELETE");
              toast.success("Gallery deleted");
              router.push("/admin/galleries");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't delete");
            }
          }}
        />
      </section>
    </div>
  );
}
