import type { Metadata } from "next";
import { InstagramFeedSection } from "@/components/sections/InstagramFeedSection";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Instagram Dailies",
  description:
    "Public ZH Films Instagram — latest drops and famous frames from Zulfikar Hussain and the Film Family.",
  path: "/instagram"
});

export default function InstagramPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Instagram", path: "/instagram" }
        ])}
      />
      <div className="pt-16">
        <InstagramFeedSection variant="page" />
      </div>
    </>
  );
}
