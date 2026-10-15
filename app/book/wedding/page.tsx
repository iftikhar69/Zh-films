import type { Metadata } from "next";
import { getCatalog, publicCatalog } from "@/lib/catalog";
import { WeddingBookingForm } from "@/components/booking/WeddingBookingForm";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Wedding Package Booking",
  description: "Request a ZH Films wedding package: choose your package, add your Nikah, Mehndi, Baraat and Walima dates, and get an estimate.",
  path: "/book/wedding"
});

export default async function WeddingBookingPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const { package: pkg } = await searchParams;
  const catalog = publicCatalog(await getCatalog());
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Book", path: "/book" },
          { name: "Wedding packages", path: "/book/wedding" }
        ])}
      />
      <WeddingBookingForm catalog={catalog} initialPackage={pkg ?? null} />
    </>
  );
}
