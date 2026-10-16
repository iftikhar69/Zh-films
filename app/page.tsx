import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getLoveCounts, getMostLovedReels, getReviewStats } from "@/lib/queries";
import { HomeHero } from "@/components/home/HomeHero";
import { CustomerWelcome } from "@/components/home/CustomerWelcome";
import { ServicesBand } from "@/components/home/ServicesBand";
import { FeaturedReels } from "@/components/home/FeaturedReels";
import { ProcessTimeline } from "@/components/home/ProcessTimeline";
import { ReserveYourDate } from "@/components/home/ReserveYourDate";
import { WeddingPackages } from "@/components/home/WeddingPackages";
import { confirmedDatesAhead } from "@/lib/booking-availability";
import { MostLoved } from "@/components/home/MostLoved";
import { ReviewsWall } from "@/components/home/ReviewsWall";
import { InstagramFeedSection } from "@/components/sections/InstagramFeedSection";
import { MoodTeaserEngine } from "@/components/emotion/MoodTeaserEngine";
import { HouseDirectory } from "@/components/house/HouseDirectory";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Opening Scene",
  description:
    "ZH Films — directed by Zulfikar Hussain. Cinematic wedding films, AKU events, and commercial cinema in Lahore.",
  path: "/"
});

export default async function HomePage() {
  const [featured, loved, reviews, stats, reelCount, confirmedDates, crewCount] = await Promise.all([
    prisma.reel.findMany({ where: { featured: true }, orderBy: { views: "desc" }, take: 6 }),
    getMostLovedReels(6),
    prisma.review.findMany({ where: { approved: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    getReviewStats(),
    prisma.reel.count(),
    confirmedDatesAhead(90),
    prisma.crewMember.count({ where: { published: true } })
  ]);
  const loves = await getLoveCounts(
    "reel",
    featured.map((r) => r.id)
  );

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }])} />
      <HomeHero reviewAverage={stats.average} reviewCount={stats.count} reelCount={reelCount} crewCount={crewCount} />
      <CustomerWelcome />
      <ServicesBand />
      <FeaturedReels reels={featured} loves={loves} />
      <ProcessTimeline />
      <WeddingPackages />
      <ReserveYourDate confirmedDates={confirmedDates} />
      <MoodTeaserEngine />
      <MostLoved reels={loved} />
      <HouseDirectory />
      <ReviewsWall initial={reviews} stats={stats} />
      <InstagramFeedSection />
    </>
  );
}
