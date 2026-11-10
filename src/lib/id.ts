/**
 * Collision-resistant id generator. `crypto.randomUUID()` where available,
 * with a small RFC-4122-v4 fallback for non-secure contexts. Prefix optional,
 * e.g. uid("gr") → "gr_3f8a…".
 */
export function uid(prefix?: string): string {
  const c = globalThis.crypto;
  let raw: string;
  if (c && typeof c.randomUUID === "function") {
    raw = c.randomUUID();
  } else {
    const bytes = new Uint8Array(16);
    if (c && typeof c.getRandomValues === "function") {
      c.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    raw = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return prefix ? `${prefix}_${raw}` : raw;
}
