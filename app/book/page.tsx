import type { Metadata } from "next";
import { BookExperience } from "@/components/book/BookExperience";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Book Your Film",
  description:
    "Multi-step cinematic booking for weddings, AKU events, pre-events, and commercial films with ZH Films Lahore.",
  path: "/book"
});

export default function BookPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Book", path: "/book" }
        ])}
      />
      <BookExperience />
    </>
  );
}
