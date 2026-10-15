import { prisma } from "@/lib/prisma";
import { DEFAULT_CATALOG, PACKAGE_IDS, catalogSchema, type Catalog } from "@/lib/catalog-shared";

export * from "@/lib/catalog-shared";

const KEY = "catalog";

export async function getCatalog(): Promise<Catalog> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!row) return DEFAULT_CATALOG;
  try {
    const parsed = catalogSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : DEFAULT_CATALOG;
  } catch {
    return DEFAULT_CATALOG;
  }
}

export async function saveCatalog(value: Catalog, updatedBy: string) {
  const ordered = { ...value, packages: PACKAGE_IDS.map((id) => value.packages.find((p) => p.id === id)!) };
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(ordered), updatedBy },
    update: { value: JSON.stringify(ordered), updatedBy }
  });
}

