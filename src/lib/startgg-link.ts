const ENABLED = "rok-fgc-startgg-api";
const TOKEN = "rok-fgc-startgg-token";

export function readStartggLink(): { enabled: boolean; token: string } {
  if (typeof window === "undefined") return { enabled: false, token: "" };
  return {
    enabled: window.localStorage.getItem(ENABLED) === "1",
    token: window.localStorage.getItem(TOKEN) ?? "",
  };
}

export function writeStartggLink(enabled: boolean, token: string) {
  window.localStorage.setItem(ENABLED, enabled ? "1" : "0");
  window.localStorage.setItem(TOKEN, token);
}

const TO_TOKEN = "rok-fgc-to-token";
const TO_REFRESH = "rok-fgc-to-refresh";
const TO_EXP = "rok-fgc-to-exp";

export function readToToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TO_TOKEN) ?? "";
}

export function writeToToken(token: string) {
  const next = token.trim();
  if (next) window.localStorage.setItem(TO_TOKEN, next);
  else window.localStorage.removeItem(TO_TOKEN);
}

export function writeToSession(accessToken: string, refreshToken: string, expiresAt: number) {
  writeToToken(accessToken);
  if (refreshToken) window.localStorage.setItem(TO_REFRESH, refreshToken);
  else window.localStorage.removeItem(TO_REFRESH);
  if (expiresAt) window.localStorage.setItem(TO_EXP, String(expiresAt));
  else window.localStorage.removeItem(TO_EXP);
}

export function readToRefresh(): { refreshToken: string; expiresAt: number } {
  if (typeof window === "undefined") return { refreshToken: "", expiresAt: 0 };
  return {
    refreshToken: window.localStorage.getItem(TO_REFRESH) ?? "",
    expiresAt: Number(window.localStorage.getItem(TO_EXP) || "0"),
  };
}

export function clearToSession() {
  writeToToken("");
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TO_REFRESH);
  window.localStorage.removeItem(TO_EXP);
}

/** Sent only when the optional API link is on and a token is saved. */
export function startggAuthBody(): { token?: string } {
  const link = readStartggLink();
  const token = link.token.trim();
  if (!link.enabled || !token) return {};
  return { token };
}
