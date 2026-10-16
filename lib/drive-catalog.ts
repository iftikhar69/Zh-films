/** Team portraits are named "<first>-<role or place>.jpg" in the owner's Drive folder. */
const ROLE_WORDS: Record<string, { role: string; title: string }> = {
  disgner: { role: "designer", title: "Designer" },
  designer: { role: "designer", title: "Designer" },
  videograperher: { role: "videographer", title: "Videographer" },
  videographer: { role: "videographer", title: "Videographer" },
  editor: { role: "editor", title: "Editor" },
  photographer: { role: "photographer", title: "Photographer" }
};
const PLACE_WORDS: Record<string, string> = { karichi: "Karachi", karachi: "Karachi", sakurdu: "Skardu", skardu: "Skardu", hunza: "Hunza", gilgit: "Gilgit", lahore: "Lahore" };

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

export type TeamEntry = { name: string; role: string; title: string; bio: string };

export function teamFromFileName(file: string): TeamEntry {
  const words = file.replace(/\.(jpe?g|png|webp)$/i, "").split(/[-_\s]+/).filter(Boolean);
  const nameParts: string[] = [];
  let role: { role: string; title: string } | undefined;
  let place: string | undefined;
  for (const w of words) {
    const key = w.toLowerCase();
    if (ROLE_WORDS[key]) role = ROLE_WORDS[key];
    else if (PLACE_WORDS[key]) place = PLACE_WORDS[key];
    else nameParts.push(cap(w));
  }
  return {
    name: nameParts.join(" ") || "ZH Film Family",
    role: role?.role ?? "team",
    title: role?.title ?? "ZH Film Family",
    bio: place ? `Part of the ZH Film Family, based in ${place}.` : "Part of the ZH Film Family."
  };
}

/**
 * Names for the owner's equipment photos, keyed by Drive file id. Only what the photo and file name show —
 * no prices, stock or condition. Files not listed here are imported as hidden drafts for the owner to name.
 */
export const GEAR_PHOTOS: Record<string, { name: string; brand: string; category: string }> = {
  "1F6opLDVxM4rjGHloFAdicmbl-tKOKWX5": { name: "Sony FE 85mm F1.4 GM II", brand: "Sony", category: "lens" },
  "1qrQ_deZ1Nvo4Yn_7I0fTnm0i6G2_57sJ": { name: "Sony Alpha body with 24–105mm zoom", brand: "Sony", category: "camera" },
  "1EPXZJe8j9OilVui-mSj_OG8WL57AtFQT": { name: "Fast prime lens", brand: "", category: "lens" },
  "1XlgFf9vZ_ZT9FxgeRXHnbi2e1TQFvUgs": { name: "Gimbal rig for mirrorless cameras", brand: "", category: "gimbal" },
  "1ZvqeByY2FahXtRhkVsc1aKbz0LtCgJrP": { name: "DSLR with zoom lens", brand: "", category: "camera" },
  "1aD-jVhFudZAKatCw63GaXs1SS_ns-_KB": { name: "Sony mirrorless camera", brand: "Sony", category: "camera" },
  "1deu4aIGWlCW4Psbxf1ck8gVVA0g__y9H": { name: "Mirrorless camera with prime lens", brand: "", category: "camera" },
  "1ymuEI8GKPOHFG0DH4FH8LkYF5WJucoL0": { name: "All-in-one DSLR kit with lenses and bag", brand: "Canon", category: "camera" }
};

export const DRIVE_FOLDERS = {
  team: "1lpRFfHJ2_HI0jG3k6xnIGOn1qjvU3Jxg",
  gear: "1fkX5WrVQzv8AI8TIL7_dvaz_T0PjamBu"
} as const;
