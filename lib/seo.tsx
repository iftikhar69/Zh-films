import { BRAND } from "@/lib/constants";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zhfilms.example";
const DEFAULT_OG = `${SITE_URL}/og/default.jpg`;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = absoluteUrl(input.path);
  const image = input.image ?? DEFAULT_OG;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${input.title} · ${BRAND.name}`,
      description: input.description,
      siteName: BRAND.name,
      locale: "en_PK",
      images: [{ url: image, width: 1200, height: 630, alt: `${BRAND.name} — ${input.title}` }]
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} · ${BRAND.name}`,
      description: input.description,
      images: [image]
    }
  };
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MovieTheater",
    "@id": absoluteUrl("/#organization"),
    name: BRAND.name,
    alternateName: "ZH Films Lahore",
    description:
      "Premium cinematic wedding films, AKU events, pre-events, commercial shoots, and drone cinematography in Lahore, Pakistan — directed by Zulfikar Hussain.",
    url: absoluteUrl("/"),
    image: DEFAULT_OG,
    telephone: "+92-300-0000000",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lahore",
      addressRegion: "Punjab",
      addressCountry: "PK"
    },
    founder: {
      "@type": "Person",
      name: BRAND.ceo,
      jobTitle: "CEO & Lead Cinematographer"
    },
    areaServed: "Pakistan",
    sameAs: ["https://instagram.com"]
  };
}

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: BRAND.ceo,
    jobTitle: "CEO & Lead Cinematographer",
    worksFor: { "@type": "Organization", name: BRAND.name },
    alumniOf: "Cinematic Films Degree Program",
    knowsAbout: [
      "Cinematic wedding films",
      "AKU events",
      "Drone cinematography",
      "Commercial filmmaking",
      "Lahore photography"
    ],
    url: absoluteUrl("/about")
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path)
    }))
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
