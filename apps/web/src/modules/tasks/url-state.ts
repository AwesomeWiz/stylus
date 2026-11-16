/** Patch only requested keys so list context and unrelated query state survive. */
export function taskHref(
  current: string,
  patch: Record<string, string | null>,
) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  return query ? (`/tasks?${query}` as const) : "/tasks";
}
