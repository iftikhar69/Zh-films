"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Addon, Catalog } from "@/lib/catalog-shared";

const toLines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

type Editable = Omit<Catalog["packages"][number], "inclusions" | "exclusions" | "price"> & {
  price: string;
  inclusions: string;
  exclusions: string;
};
type EditableAddon = Omit<Addon, "price"> & { price: string };

export function PackagesForm({ initial, images }: { initial: Catalog; images: string[] }) {
  const router = useRouter();
  const [packages, setPackages] = useState<Editable[]>(
    initial.packages.map((p) => ({ ...p, price: String(p.price), inclusions: p.inclusions.join("\n"), exclusions: p.exclusions.join("\n") }))
  );
  const [addons, setAddons] = useState<EditableAddon[]>(initial.addons.map((a) => ({ ...a, price: String(a.price) })));
  const [busy, setBusy] = useState(false);

  const setPkg = (i: number, patch: Partial<Editable>) => setPackages((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const setAddon = (i: number, patch: Partial<EditableAddon>) => setAddons((as) => as.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  async function save() {
    const body: Catalog = {
      packages: packages.map((p) => ({
        ...p,
        price: Number(p.price),
        inclusions: toLines(p.inclusions),
        exclusions: toLines(p.exclusions)
      })),
      addons: addons.map((a) => ({ ...a, price: Number(a.price) }))
    };
    setBusy(true);
    const res = await fetch("/api/admin/catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : { error: "Network error" };
    setBusy(false);
    if (!res?.ok || !json.ok) {
      toast.error(json.error ?? "Could not save");
      return;
    }
    toast.success("Packages saved — the public site now shows these prices");
    router.refresh();
  }

  const missing = packages.filter((p) => p.enabled && !toLines(p.inclusions).length);

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {missing.length ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
          Inclusions are not filled in for {missing.map((p) => p.name).join(", ")}. Customers currently see “inclusions
          are being finalised” instead of a list. Add one inclusion per line when you&apos;re ready to publish them.
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Wedding packages</h2>
        {packages.map((p, i) => (
          <fieldset key={p.id} className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-950/50 p-5 lg:grid-cols-[160px_1fr]">
            <div className="space-y-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10">
                <Image src={p.image} alt="" fill sizes="160px" className="object-cover" />
              </div>
              <select
                aria-label={`${p.name} image`}
                value={p.image}
                onChange={(e) => setPkg(i, { image: e.target.value })}
                className="h-9 w-full rounded-lg border border-white/10 bg-black/60 px-2 text-xs text-zinc-200"
              >
                {[...new Set([p.image, ...images])].map((src) => (
                  <option key={src} value={src}>
                    {src.split("/").pop()}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-zinc-200 sm:col-span-2">
                <input type="checkbox" checked={p.enabled} onChange={(e) => setPkg(i, { enabled: e.target.checked })} className="accent-[#c8a96a]" />
                Show this package on the website
              </label>
              <L label="Name">
                <Input value={p.name} maxLength={80} onChange={(e) => setPkg(i, { name: e.target.value })} />
              </L>
              <L label="Price (PKR)">
                <Input inputMode="numeric" value={p.price} onChange={(e) => setPkg(i, { price: e.target.value.replace(/\D/g, "") })} />
              </L>
              <L label="Tagline" wide>
                <Input value={p.tagline} maxLength={160} onChange={(e) => setPkg(i, { tagline: e.target.value })} />
              </L>
              <L label="Description (optional)" wide>
                <Textarea value={p.description} maxLength={1000} onChange={(e) => setPkg(i, { description: e.target.value })} />
              </L>
              <L label="Included — one per line">
                <Textarea value={p.inclusions} rows={6} onChange={(e) => setPkg(i, { inclusions: e.target.value })} placeholder={"e.g. Baraat & Walima coverage\nHighlight film"} />
              </L>
              <L label="Not included — one per line">
                <Textarea value={p.exclusions} rows={6} onChange={(e) => setPkg(i, { exclusions: e.target.value })} placeholder="e.g. Travel outside Lahore" />
              </L>
            </div>
          </fieldset>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Add-ons</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddons((as) => [...as, { id: `addon-${as.length + 1}`, name: "", price: "", description: "", enabled: true }])}
          >
            <Plus /> Add an add-on
          </Button>
        </div>
        {addons.length === 0 ? (
          <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-500">
            No add-ons yet. Customers see “no add-ons listed” until you add some.
          </p>
        ) : (
          addons.map((a, i) => (
            <fieldset key={i} className="grid gap-3 rounded-xl border border-white/10 bg-black/30 p-4 sm:grid-cols-[1fr_1.4fr_140px_auto] sm:items-end">
              <L label="Short id">
                <Input value={a.id} onChange={(e) => setAddon(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
              </L>
              <L label="Name">
                <Input value={a.name} maxLength={80} onChange={(e) => setAddon(i, { name: e.target.value })} />
              </L>
              <L label="Price (PKR)">
                <Input inputMode="numeric" value={a.price} onChange={(e) => setAddon(i, { price: e.target.value.replace(/\D/g, "") })} />
              </L>
              <div className="flex items-center gap-3 pb-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <input type="checkbox" checked={a.enabled} onChange={(e) => setAddon(i, { enabled: e.target.checked })} className="accent-[#c8a96a]" />
                  On
                </label>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove add-on" onClick={() => setAddons((as) => as.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
              <L label="Description (optional)" wide4>
                <Input value={a.description} maxLength={300} onChange={(e) => setAddon(i, { description: e.target.value })} />
              </L>
            </fieldset>
          ))
        )}
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" disabled={busy} size="lg">
          {busy ? "Saving…" : "Save packages"}
        </Button>
      </div>
    </form>
  );
}

function L({ label, wide, wide4, children }: { label: string; wide?: boolean; wide4?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1 text-xs text-zinc-400 ${wide ? "sm:col-span-2" : ""} ${wide4 ? "sm:col-span-4" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
