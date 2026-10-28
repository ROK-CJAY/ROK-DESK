export const PUBLIC_SIGNUP_ORIGIN = "https://rok-desk.vercel.app";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function makeSignupCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");
}

export function normalizeSignupCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function signupLink(origin: string, code: string): string {
  const host = origin.trim().replace(/\/+$/, "");
  return `${host}/join/${normalizeSignupCode(code)}`;
}

/** A code, or a full /join/CODE link. A link also returns the site it came from. */
export function parseSignupTarget(raw: string): { host?: string; code: string } {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed) || /\/join\//i.test(trimmed)) {
    try {
      const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
      const parts = url.pathname.split("/").filter(Boolean);
      const join = parts.findIndex((part) => part.toLowerCase() === "join");
      const code = join >= 0 ? parts[join + 1] ?? "" : "";
      return { host: url.origin, code: normalizeSignupCode(code) };
    } catch {
      return { code: "" };
    }
  }
  return { code: normalizeSignupCode(trimmed) };
}
