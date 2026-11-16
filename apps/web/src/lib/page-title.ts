/** Text only, bounded and stable across server metadata and authorized live renames. */
export function conciseTitle(
  value: string | null | undefined,
  fallback = "Board",
) {
  const text = (value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(text || fallback);
  return chars.length > 80 ? chars.slice(0, 79).join("") + "…" : chars.join("");
}
export function pageTitle(value: string) {
  return `${conciseTitle(value)} — Stylus`;
}
