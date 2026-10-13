import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Syne } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BRAND } from "@/lib/constants";
import { JsonLd, absoluteUrl, localBusinessJsonLd, personJsonLd } from "@/lib/seo";
import { introScript } from "@/components/motion/Preloader";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-play",
  display: "swap"
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap"
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zhfilms.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — Cinematic Wedding & Commercial Films | Lahore`,
    template: `%s · ${BRAND.name}`
  },
  description:
    "Premium cinematic wedding films, AKU events, pre-events, commercial storytelling and drone cinema led by Zulfikar Hussain in Lahore, Pakistan.",
  keywords: [
    "ZH Films",
    "Zulfikar Hussain",
    "cinematic wedding films Lahore",
    "AKU event cinematography",
    "Pakistani filmmaker",
    "drone cinematography Pakistan"
  ],
  authors: [{ name: BRAND.ceo }],
  creator: BRAND.ceo,
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: absoluteUrl("/"),
    siteName: BRAND.name,
    title: `${BRAND.name} — Directed by ${BRAND.ceo}`,
    description:
      "Step into a Lahore cinema at golden hour. Wedding films, AKU events, commercial cinema — 7+ years of craft.",
    images: [
      {
        url: "/og/default.svg",
        width: 1200,
        height: 630,
        alt: "ZH Films — Directed by Zulfikar Hussain"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — Directed by ${BRAND.ceo}`,
    description: "Cinematic wedding & commercial films in Lahore.",
    images: ["/og/default.svg"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${playfair.variable} ${syne.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body className="min-h-[100svh] bg-zh-black font-sans text-zinc-100 antialiased">
        <JsonLd data={[localBusinessJsonLd(), personJsonLd()]} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
