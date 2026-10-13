import type { Metadata } from "next";
import { CinematicHero } from "@/components/cinematic/CinematicHero";
import { InstagramFeedSection } from "@/components/sections/InstagramFeedSection";
import { MoodTeaserEngine } from "@/components/emotion/MoodTeaserEngine";
import { HouseDirectory } from "@/components/house/HouseDirectory";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Opening Scene",
  description:
    "Living viewfinder hero for ZH Films — directed by Zulfikar Hussain. Cinematic wedding films, AKU events, and commercial cinema in Lahore.",
  path: "/"
});

function SceneDivider({ label }: { label: string }) {
  return (
    <div className="relative border-y border-white/5 bg-gradient-to-r from-black via-zinc-950 to-black py-8 text-center">
      <p className="text-[10px] uppercase tracking-[0.55em] text-zh-gold/80">{label}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }])} />
      <CinematicHero />
      <SceneDivider label="Intermission · 00:01:12" />
      <MoodTeaserEngine />
      <HouseDirectory />
      <InstagramFeedSection />
    </>
  );
}
