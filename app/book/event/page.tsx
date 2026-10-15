import type { Metadata } from "next";
import { getCatalog, publicCatalog } from "@/lib/catalog";
import { EVENT_TYPES, type EventType } from "@/lib/enquiry";
import { EventBookingForm } from "@/components/booking/EventBookingForm";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Book an Event in Advance",
  description: "Request a quote from ZH Films for a Nikah, engagement, birthday, corporate event or custom cinematic shoot.",
  path: "/book/event"
});

export default async function EventBookingPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const catalog = publicCatalog(await getCatalog());
  const initialType = type && type in EVENT_TYPES ? (type as EventType) : null;
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Book", path: "/book" },
          { name: "Event booking", path: "/book/event" }
        ])}
      />
      <EventBookingForm catalog={catalog} initialType={initialType} />
    </>
  );
}
