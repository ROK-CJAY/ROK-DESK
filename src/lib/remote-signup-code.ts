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
