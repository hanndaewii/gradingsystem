/** Join conditional class names (local twin of the UI kit's internal cx). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
