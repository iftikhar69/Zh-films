import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
import instagramMedia from "../lib/instagram-media.json";

const igVideos = instagramMedia.items.filter((i) => i.isVideo);
const igPhotos = instagramMedia.items.flatMap((i) => i.images);
const reelVideo = (i: number) => igVideos[i % igVideos.length].video!;
const reelPoster = (i: number) => igVideos[i % igVideos.length].poster;
const img = (seed: string) => `https://picsum.photos/seed/${seed}/1200/675`;
const photo = (i: number) => igPhotos[i % igPhotos.length];

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "1") {
    throw new Error("The seed wipes bookings and content. Set ALLOW_DESTRUCTIVE_SEED=1 to run it on a throwaway database.");
  }
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.sellInquiry.deleteMany();
  await prisma.rentalInquiry.deleteMany();
  await prisma.hireRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.gearItem.deleteMany();
  await prisma.crewMember.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.journalPost.deleteMany();
  await prisma.galleryItem.deleteMany();
  await prisma.reel.deleteMany();

  const reelTitles = [
    "Noor × Ali — Lahore Royal",
    "AKU Convocation — Silver Reel",
    "Sapphire Night — Pre-Event Teaser",
    "Heritage Haveli — 4K Ceremony",
    "Velvet Vows — Cinematic Trailer",
    "Monsoon Monologue — Commercial",
    "Riverside Rukhsati — Drone Poetry",
    "Gold Hour Nikkah — Anamorphic",
    "Studio Z — Brand Film",
    "Midnight Mehndi — Neon Grade",
    "Snowfall Walima — Kashmir Edit",
    "Candlelit Qawwali — Live Mix",
    "Rooftop Reception — City Lights",
    "Vintage Rolls — Car Commercial",
    "Pearl Pavilion — Fashion Film",
    "Desert Dusk — Fashion Editorial",
    "Crimson Corridor — Horror Short",
    "Azure Ballroom — Corporate Gala",
    "Emerald Estate — Real Estate",
    "Ivory Isle — Destination Wedding",
    "Obsidian Opera — Concert Film",
    "Copper Courtyard — Documentary",
    "Marble Masjid — Spiritual Piece",
    "Saffron Streets — Travel Reel",
    "Indigo Ink — Title Sequence"
  ];

  const reelCategoryFor = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("aku")) return "aku";
    if (t.includes("pre-event") || t.includes("mehndi") || t.includes("nikkah") || t.includes("walima"))
      return "pre-events";
    if (t.includes("commercial") || t.includes("brand") || t.includes("fashion"))
      return "commercial";
    return "weddings";
  };

  await prisma.reel.createMany({
    data: reelTitles.map((title, i) => ({
      title,
      category: reelCategoryFor(title),
      description: "Director's cut excerpt — graded in cinematic warm gold.",
      videoUrl: reelVideo(i),
      thumbnail: reelPoster(i),
      durationSec: 45 + (i % 5) * 12,
      featured: i < 6,
      views: 1200 - i * 37 + ((i * 53) % 210)
    }))
  });

  await prisma.review.createMany({
    data: [
      {
        name: "Noor & Ali",
        eventType: "Wedding",
        rating: 5,
        message:
          "We watched our trailer eleven times the night it arrived. Zulfikar caught moments we didn't even know happened — my father's face at the rukhsati still makes us cry."
      },
      {
        name: "Dr. Mahnoor S.",
        eventType: "AKU Convocation",
        rating: 5,
        message:
          "Calm, respectful, and invisible on the floor. The convocation film felt like a documentary, not event coverage. Our faculty shared it everywhere."
      },
      {
        name: "Hassan Raza",
        eventType: "Brand Film",
        rating: 5,
        message:
          "Our product launch needed luxury pacing on a tight timeline. ZH delivered a 60-second spot that outperformed every ad we ran that quarter."
      },
      {
        name: "Ayesha & Umer",
        eventType: "Mehndi",
        rating: 4,
        message:
          "The neon grade on our mehndi teaser is unreal. Dance floor energy, drone shots over the haveli — friends keep asking who filmed it."
      },
      {
        name: "Sana K.",
        eventType: "Gear Rental",
        rating: 5,
        message:
          "Rented the FX3 kit and gimbal for a short film. Everything arrived charged, cleaned, and labelled. Zulfikar even sent LUT tips on WhatsApp."
      },
      {
        name: "Bilal & Hira",
        eventType: "Walima",
        rating: 5,
        message:
          "From the first call to the final edit, the Film Family treated our day like a feature premiere. Worth every rupee."
      }
    ]
  });

  const categories = ["weddings", "aku", "commercial", "pre-events"] as const;
  const gallery = Array.from({ length: 28 }, (_, i) => ({
    title: `Frame ${i + 1} — ${categories[i % categories.length]}`,
    category: categories[i % categories.length],
    mediaType: i % 4 === 0 ? "video" : "photo"
  }));

  await prisma.galleryItem.createMany({
    data: gallery.map((g, i) => ({
      title: g.title,
      category: g.category,
      mediaType: g.mediaType,
      url: g.mediaType === "video" ? reelVideo(i / 4) : photo(i),
      thumbnail: g.mediaType === "video" ? reelPoster(i / 4) : photo(i)
    }))
  });

  await prisma.journalPost.createMany({
    data: [
      {
        slug: "why-we-shoot-on-gold-hour",
        title: "Why We Chase Gold Hour in Lahore",
        excerpt: "Light, haze, and emotion — the trinity of Pakistani wedding cinema.",
        content:
          "Gold hour in Lahore is not a clock — it is a feeling. We block scenes around it, choreograph entrances to it, and grade toward warm film stocks that honour skin tones and silk alike.",
        coverImage: photo(6)
      },
      {
        slug: "aku-events-cinematic-protocol",
        title: "AKU Events: A Cinematic Protocol",
        excerpt: "Precision coverage that still breathes like a feature film.",
        content:
          "Medical campuses demand respect and rhythm. Our team maps sightlines, audio, and safe drone corridors before the first guest arrives.",
        coverImage: photo(12)
      },
      {
        slug: "film-family-manifesto",
        title: "The ZH Film Family Manifesto",
        excerpt: "Not a vendor list — a house of craft under one director.",
        content:
          "Photographers, editors, drone pilots, sound, gaffers — eight seats on the call sheet, one language of light. Zulfikar Hussain builds crews like casts.",
        coverImage: photo(18)
      },
      {
        slug: "renting-cinema-glass",
        title: "Why We Rent Cinema Glass",
        excerpt: "Sony bodies, anamorphics, gimbals — tools with stories.",
        content:
          "Our rental bay keeps working glass in Lahore circulation. Book a body, a gimbal, or a production car — the same kit we trust on set.",
        coverImage: photo(24)
      },
      {
        slug: "selling-used-glass",
        title: "Passing the Torch: Selling Glass",
        excerpt: "Cameras and lenses leaving our vault — contact the director.",
        content:
          "When a body graduates from our A-cam rotation, it finds a new home through ZH Films. Message Zulfikar directly for condition reports and honest pricing.",
        coverImage: photo(30)
      }
    ]
  });

  const crew = [
    {
      slug: "zulfikar-hussain",
      name: "Zulfikar Hussain",
      role: "cinematographer",
      title: "CEO & Lead Cinematographer",
      bio: "Director of ZH Films. Degree in Cinematic Films. 7+ years of wedding epics, AKU protocol, commercial cinema, and drone storytelling in Lahore.",
      image: img("crew-zulfikar"),
      yearsExp: "7+",
      specialty: "weddings",
      whatsapp: "923000000000",
      instagram: "https://instagram.com/zhfilms",
      facebook: "https://facebook.com/zhfilms",
      email: "zulfikar@zhfilms.example",
      featured: true,
      sortOrder: 0
    },
    {
      slug: "aisha-noir",
      name: "Aisha Noir",
      role: "photographer",
      title: "Lead Still Photographer",
      bio: "Editorial portraits and candid ritual frames — film stills that feel like memory.",
      image: img("crew-aisha"),
      yearsExp: "7+",
      specialty: "weddings",
      whatsapp: "923001111111",
      instagram: "https://instagram.com",
      featured: false,
      sortOrder: 1
    },
    {
      slug: "bilal-cut",
      name: "Bilal Cut",
      role: "editor",
      title: "Lead Editor / Colour",
      bio: "Trailer pacing, vertical reels, and gold-hour grades that match Zulfikar's lens language.",
      image: img("crew-bilal"),
      yearsExp: "5+",
      specialty: "commercial",
      whatsapp: "923002222222",
      instagram: "https://instagram.com",
      featured: false,
      sortOrder: 2
    },
    {
      slug: "sara-sky",
      name: "Sara Sky",
      role: "drone",
      title: "Drone Pilot & Aerial DP",
      bio: "Safe corridors, cinematic altitude, and courtyard poetry over Lahore estates.",
      image: img("crew-sara"),
      yearsExp: "5+",
      specialty: "aku",
      whatsapp: "923003333333",
      featured: false,
      sortOrder: 3
    },
    {
      slug: "hamza-wave",
      name: "Hamza Wave",
      role: "sound",
      title: "Location Sound Mixer",
      bio: "Clean vows, live qawwali, and discreet lav coverage when the hall gets loud.",
      image: img("crew-hamza"),
      yearsExp: "5+",
      specialty: "weddings",
      whatsapp: "923004444444",
      featured: false,
      sortOrder: 4
    },
    {
      slug: "omar-lux",
      name: "Omar Lux",
      role: "gaffer",
      title: "Gaffer / Lighting Desk",
      bio: "Practicals, soft boxes, and gold practicals that kiss silk without crushing shadows.",
      image: img("crew-omar"),
      yearsExp: "3+",
      specialty: "commercial",
      whatsapp: "923005555555",
      featured: false,
      sortOrder: 5
    },
    {
      slug: "noor-assist",
      name: "Noor Assist",
      role: "assistant",
      title: "1st AC / DIT",
      bio: "Lenses pulled clean, cards mirrored, the machine that keeps the take alive.",
      image: img("crew-noor"),
      yearsExp: "3+",
      specialty: "pre-events",
      whatsapp: "923006666666",
      featured: false,
      sortOrder: 6
    },
    {
      slug: "farah-expert",
      name: "Farah Expert",
      role: "expert",
      title: "Protocol & Talent Desk",
      bio: "AKU process, VIP guest flow, and client calm — the expert who keeps the day cinematic.",
      image: img("crew-farah"),
      yearsExp: "7+",
      specialty: "aku",
      whatsapp: "923007777777",
      email: "desk@zhfilms.example",
      featured: false,
      sortOrder: 7
    }
  ];

  await prisma.crewMember.createMany({ data: crew });

  const gear = [
    {
      slug: "sony-fx3",
      name: "Sony FX3 Cinema Line",
      brand: "Sony",
      category: "camera",
      listingType: "rent",
      priceLabel: "From PKR 18k / day",
      description: "Full-frame cinema body — the workhorse of ZH Films A-cam packages.",
      image: img("gear-fx3"),
      sortOrder: 0
    },
    {
      slug: "sony-a7siv",
      name: "Sony A7S IV",
      brand: "Sony",
      category: "camera",
      listingType: "rent",
      priceLabel: "From PKR 12k / day",
      description: "Low-light assassin for receptions and candlelit vows.",
      image: img("gear-a7s"),
      sortOrder: 1
    },
    {
      slug: "canon-c70",
      name: "Canon C70",
      brand: "Canon",
      category: "camera",
      listingType: "both",
      priceLabel: "Rent or inquire to buy",
      description: "RF mount cinema compactness — available for rent; ask Zulfikar if selling.",
      image: img("gear-c70"),
      sortOrder: 2
    },
    {
      slug: "sigma-18-35",
      name: "Sigma 18-35 Art",
      brand: "Sigma",
      category: "lens",
      listingType: "sell",
      priceLabel: "Contact for price",
      description: "Beloved zoom leaving our vault — contact Zulfikar for condition & price.",
      image: img("gear-sigma"),
      sortOrder: 3
    },
    {
      slug: "sony-24-70gm",
      name: "Sony 24-70mm GM II",
      brand: "Sony",
      category: "lens",
      listingType: "sell",
      priceLabel: "Contact Zulfikar",
      description: "Ceremony workhorse glass — selling from the ZH vault.",
      image: img("gear-2470"),
      sortOrder: 4
    },
    {
      slug: "dji-rs4",
      name: "DJI RS 4 Pro Gimbal",
      brand: "DJI",
      category: "gimbal",
      listingType: "rent",
      priceLabel: "From PKR 6k / day",
      description: "Stabilised walking shots for mehndi chaos and aisle floats.",
      image: img("gear-rs4"),
      sortOrder: 5
    },
    {
      slug: "ronin-4d-rig",
      name: "Ronin-style Cinema Gimbal Kit",
      brand: "DJI",
      category: "gimbal",
      listingType: "rent",
      priceLabel: "From PKR 15k / day",
      description: "Heavy cinema gimbal package with monitor plate.",
      image: img("gear-ronin"),
      sortOrder: 6
    },
    {
      slug: "production-suv",
      name: "Production SUV — Crew Carrier",
      brand: "Toyota",
      category: "car",
      listingType: "rent",
      priceLabel: "From PKR 10k / day",
      description: "Gear + crew carrier for Lahore shoots — driver optional.",
      image: img("gear-suv"),
      sortOrder: 7
    },
    {
      slug: "vintage-rolls",
      name: "Vintage Rolls-style Hero Car",
      brand: "Classic",
      category: "car",
      listingType: "rent",
      priceLabel: "Quote on request",
      description: "Hero vehicle for bridal arrivals and commercial spots.",
      image: img("gear-rolls"),
      sortOrder: 8
    },
    {
      slug: "anamorphic-adapter",
      name: "Anamorphic Adapter Kit",
      brand: "Sirui",
      category: "lens",
      listingType: "both",
      priceLabel: "Rent / sell inquire",
      description: "Flares and oval bokeh — the ZH signature look.",
      image: img("gear-ana"),
      sortOrder: 9
    }
  ];

  await prisma.gearItem.createMany({ data: gear });

  console.log("Film Family seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
