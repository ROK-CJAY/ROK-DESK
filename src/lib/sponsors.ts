export type Sponsor = {
  id: string;
  name: string;
  logo: string;
};

export function blankSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: `sp-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    logo: "",
    ...overrides,
  };
}

export function liveSponsors(rows: Sponsor[] | undefined): Sponsor[] {
  return (rows ?? []).filter((row) => row.name.trim() || row.logo.trim());
}

export const ROK_SPONSOR: Sponsor = {
  id: "rok-gaming-lounge",
  name: "ROK Gaming Lounge",
  logo: "/overlays/rok-wordmark.png",
};

function isRokSponsor(row: Sponsor): boolean {
  return row.id === ROK_SPONSOR.id || row.name.trim().toLowerCase() === ROK_SPONSOR.name.toLowerCase();
}

/** When an event logo replaces the ROK mark, ROK Gaming Lounge is the first Presented by sponsor. */
export function presentedSponsors(rows: Sponsor[] | undefined, eventLogo?: string): Sponsor[] {
  const live = liveSponsors(rows);
  if (!eventLogo?.trim()) return live;
  return [ROK_SPONSOR, ...live.filter((row) => !isRokSponsor(row))];
}

export function currentSponsor(rows: Sponsor[] | undefined, now: number, seconds: number): Sponsor | null {
  const live = liveSponsors(rows);
  if (live.length === 0) return null;
  const dwell = Math.max(2, seconds || 8) * 1000;
  return live[Math.floor(now / dwell) % live.length] ?? null;
}

export function currentPresentedSponsor(
  rows: Sponsor[] | undefined,
  eventLogo: string,
  now: number,
  seconds: number,
): Sponsor | null {
  const live = presentedSponsors(rows, eventLogo);
  if (live.length === 0) return null;
  const dwell = Math.max(2, seconds || 8) * 1000;
  return live[Math.floor(now / dwell) % live.length] ?? null;
}

export function readOverlayImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const img = new Image();
      img.onload = () => {
        const max = 640;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export const readSponsorLogo = readOverlayImage;
