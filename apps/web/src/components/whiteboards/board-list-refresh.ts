/** A device-local boolean requests one fresh list read after leaving the editor.
 * It contains no tenant content and never substitutes for server authorization. */
const key = (userId: string, organizationId: string) =>
  `stylus-board-list-changed:${userId}:${organizationId}`;
export function markBoardListChanged(userId: string, organizationId: string) {
  if (!userId) return;
  try {
    sessionStorage.setItem(key(userId, organizationId), "1");
  } catch {
    /* Optional local hint. */
  }
}
export function consumeBoardListChange(userId: string, organizationId: string) {
  try {
    const changed = sessionStorage.getItem(key(userId, organizationId)) === "1";
    sessionStorage.removeItem(key(userId, organizationId));
    return changed;
  } catch {
    return false;
  }
}
