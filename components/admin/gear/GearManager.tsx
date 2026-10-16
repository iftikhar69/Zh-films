"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudDownload, ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { GEAR_CATEGORIES, GEAR_STATUS, RENT_UNITS, type GearCategory, type GearStatus } from "@/lib/gear";
import { ACCEPTED_IMAGES, imageExt, postJson, putWithProgress } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  brand: string;
  category: string;
  listingType: string;
  status: string;
  salePrice: number | null;
  rentPrice: number | null;
  rentUnit: string;
  priceLabel: string;
  condition: string;
  includes: string;
  description: string;
  sortOrder: number;
  imageThumb: string;
  demo: boolean;
};

const STATUS_STYLE: Record<string, string> = {
  draft: "border-white/15 text-zinc-400",
  available: "border-emerald-400/40 text-emerald-300",
  enquiry: "border-sky-400/40 text-sky-300",
  unavailable: "border-amber-400/40 text-amber-200"
};

const select = "h-10 w-full rounded-md border border-white/10 bg-black/60 px-2 text-sm text-zinc-100";

export function GearManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [folder, setFolder] = useState("");
  const [files, setFiles] = useState<{ id: string; name: string; imported: boolean }[] | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  async function importAll() {
    for (const f of files?.filter((x) => !x.imported) ?? []) {
      setImporting(f.name);
      try {
        await postJson("/api/admin/gear/import-drive", { action: "import", fileId: f.id, name: f.name });
        setFiles((fs) => fs?.map((x) => (x.id === f.id ? { ...x, imported: true } : x)) ?? null);
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setImporting(null);
    toast.success("Imported as hidden drafts — add details and publish each one");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
        <Button onClick={() => setCreating((v) => !v)} variant={creating ? "outline" : "default"}>
          <Plus /> New listing
        </Button>
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-center">
          <CloudDownload className="hidden h-4 w-4 shrink-0 text-zh-gold sm:block" />
          <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Import product photos from a shared Drive folder link" />
          <Button
            variant="outline"
            disabled={!folder || importing !== null}
            onClick={async () => {
              try {
                const r = await postJson<{ files: { id: string; name: string; imported: boolean }[] }>("/api/admin/gear/import-drive", { action: "list", folder });
                setFiles(r.files);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't read the folder");
              }
            }}
          >
            Check
          </Button>
          {files ? (
            <Button disabled={importing !== null || !files.some((f) => !f.imported)} onClick={() => void importAll()}>
              {importing ? `Importing ${importing.slice(0, 18)}…` : `Import ${files.filter((f) => !f.imported).length} as drafts`}
            </Button>
          ) : null}
        </div>
      </div>

      {creating ? (
        <GearForm
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">No listings yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((g) => (
            <li key={g.id} className="rounded-2xl border border-white/10 bg-zinc-950/50">
              <div className="flex items-center gap-3 p-3">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                  {g.imageThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.imageThumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[9px] text-zinc-500">No photo</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{g.name}</span>
                  <span className="block text-xs text-zinc-500">
                    {GEAR_CATEGORIES[g.category as GearCategory] ?? g.category} · {g.listingType === "both" ? "Sell & rent" : g.listingType === "sell" ? "For sale" : "For rent"}
                    {g.demo ? " · old demo entry (stock photo, invented details)" : ""}
                  </span>
                </span>
                <span className={cn("hidden rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] sm:inline", STATUS_STYLE[g.status])}>
                  {GEAR_STATUS[g.status as GearStatus] ?? g.status}
                </span>
                <Button size="sm" variant="outline" onClick={() => setEditing(editing === g.id ? null : g.id)}>
                  {editing === g.id ? "Close" : "Edit"}
                </Button>
              </div>
              {editing === g.id ? (
                <div className="border-t border-white/10 p-4">
                  <GearForm
                    item={g}
                    onDone={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GearForm({ item, onDone }: { item?: Item; onDone: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: item?.name ?? "",
    brand: item?.brand ?? "",
    category: item?.category && item.category in GEAR_CATEGORIES ? item.category : "camera",
    listingType: item?.listingType ?? "sell",
    status: item?.status ?? "draft",
    salePrice: item?.salePrice?.toString() ?? "",
    rentPrice: item?.rentPrice?.toString() ?? "",
    rentUnit: item?.rentUnit ?? "day",
    priceLabel: item?.priceLabel ?? "",
    condition: item?.condition ?? "",
    includes: item?.includes ?? "",
    description: item?.description ?? "",
    sortOrder: item?.sortOrder?.toString() ?? "0"
  });
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState<number | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const num = (s: string) => (s === "" ? null : Number(s));
  const sells = f.listingType !== "rent";
  const rents = f.listingType !== "sell";

  async function save() {
    setBusy(true);
    try {
      const body = {
        ...f,
        salePrice: sells ? num(f.salePrice) : null,
        rentPrice: rents ? num(f.rentPrice) : null,
        sortOrder: Number(f.sortOrder || 0)
      };
      if (item) await postJson(`/api/admin/gear/${item.id}`, body, "PATCH");
      else await postJson("/api/admin/gear", body);
      toast.success(f.status === "draft" ? "Saved as a hidden draft" : "Saved — live on the website");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!item) return;
    const ext = imageExt(file);
    if (!ext) return toast.error("Use a JPG, PNG or WebP photo");
    try {
      setUpload(0);
      const { path, uploadUrl } = await postJson<{ path: string; uploadUrl: string }>(`/api/admin/gear/${item.id}/image`, { action: "sign", ext });
      await putWithProgress(uploadUrl, file, setUpload);
      setUpload(1);
      await postJson(`/api/admin/gear/${item.id}/image`, { action: "commit", path });
      toast.success("Photo updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUpload(null);
    }
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <F label="Name" wide>
        <Input value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} required />
      </F>
      <F label="Brand">
        <Input value={f.brand} maxLength={60} onChange={(e) => set("brand", e.target.value)} />
      </F>
      <F label="Category">
        <select className={select} value={f.category} onChange={(e) => set("category", e.target.value)}>
          {Object.entries(GEAR_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </F>
      <F label="Offered for">
        <select className={select} value={f.listingType} onChange={(e) => set("listingType", e.target.value)}>
          <option value="sell">Sale</option>
          <option value="rent">Rent</option>
          <option value="both">Sale and rent</option>
        </select>
      </F>
      <F label="Status">
        <select className={select} value={f.status} onChange={(e) => set("status", e.target.value)}>
          {Object.entries(GEAR_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </F>
      {sells ? (
        <F label="Sale price (PKR, empty = on enquiry)">
          <Input inputMode="numeric" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value.replace(/\D/g, ""))} />
        </F>
      ) : null}
      {rents ? (
        <F label="Rental price (PKR, empty = on enquiry)">
          <div className="flex gap-2">
            <Input inputMode="numeric" value={f.rentPrice} onChange={(e) => set("rentPrice", e.target.value.replace(/\D/g, ""))} />
            <select className={cn(select, "w-28")} value={f.rentUnit} onChange={(e) => set("rentUnit", e.target.value)}>
              {Object.entries(RENT_UNITS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </F>
      ) : null}
      <F label="Condition (optional)" wide>
        <Input value={f.condition} maxLength={200} onChange={(e) => set("condition", e.target.value)} placeholder="e.g. Excellent, ~4,000 shutter count" />
      </F>
      <F label="Price note (optional)" wide>
        <Input value={f.priceLabel} maxLength={120} onChange={(e) => set("priceLabel", e.target.value)} placeholder="e.g. Deposit required · Lahore pickup" />
      </F>
      <F label="Included (optional)" wide>
        <Textarea value={f.includes} maxLength={1000} rows={3} onChange={(e) => set("includes", e.target.value)} placeholder="e.g. 2 batteries, charger, box" />
      </F>
      <F label="Description" wide>
        <Textarea value={f.description} maxLength={2000} rows={3} onChange={(e) => set("description", e.target.value)} />
      </F>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
        {item ? (
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 text-sm text-zinc-200 hover:border-zh-gold/50">
            <ImagePlus className="h-4 w-4" />
            {upload != null ? `Uploading ${Math.round(upload * 100)}%` : item.imageThumb && !item.demo ? "Replace photo" : "Add photo"}
            <input
              type="file"
              accept={ACCEPTED_IMAGES}
              className="sr-only"
              disabled={upload != null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadPhoto(file);
              }}
            />
          </label>
        ) : (
          <p className="text-xs text-zinc-500">Save first, then add a photo.</p>
        )}
        <span className="flex-1" />
        {item ? (
          <ConfirmButton
            label="Delete listing"
            title={`Delete “${item.name}”?`}
            body="The listing and its photos are removed. Past enquiries keep the item name."
            confirmLabel="Delete"
            onConfirm={async () => {
              try {
                await postJson(`/api/admin/gear/${item.id}`, {}, "DELETE");
                toast.success("Deleted");
                onDone();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't delete");
              }
            }}
          />
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function F({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("block space-y-1 text-xs text-zinc-400", wide && "sm:col-span-2")}>
      <span>{label}</span>
      {children}
    </label>
  );
}
