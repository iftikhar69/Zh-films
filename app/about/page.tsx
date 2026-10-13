import type { Metadata } from "next";
import { AboutStory } from "@/components/about/AboutStory";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About Zulfikar Hussain",
  description:
    "Meet Zulfikar Hussain — CEO & Lead Cinematographer of ZH Films. Degree in Cinematic Films, 7+ years of wedding, AKU, and commercial cinema in Lahore.",
  path: "/about"
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" }
        ])}
      />
      <AboutStory />
    </>
  );
}
