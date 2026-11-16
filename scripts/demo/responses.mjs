export function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error(`STOP: ${label} must be an object`);
  return value;
}
export function requireRows(value, label) {
  if (
    !Array.isArray(value) ||
    value.some((row) => !row || typeof row !== "object" || Array.isArray(row))
  )
    throw Error(`STOP: ${label} must be an array of row objects`);
  return value;
}
export function requireSingleRow(value, label) {
  const rows = requireRows(value, label);
  if (rows.length !== 1)
    throw Error(`STOP: ${label} must contain exactly one row`);
  return rows[0];
}
export function requireUuid(value, label) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw Error(`STOP: ${label} must be a UUID`);
  return value;
}
export function requireData(result, label) {
  requireObject(result, label);
  if (result.error) {
    const code =
      typeof result.error.code === "string" &&
      /^[a-zA-Z0-9_]{1,80}$/.test(result.error.code)
        ? result.error.code
        : "request";
    throw Error(`STOP: ${label} failed (${code})`);
  }
  if (!Object.hasOwn(result, "data") || result.data === undefined)
    throw Error(`STOP: ${label} has no response data`);
  return result.data; // null is a valid response for a PostgreSQL void RPC.
}
// Auth signOut is intentionally error-only; database/query reads still require
// their own explicit data field and must never use this validator as a fallback.
export function requireSuccess(result, label) {
  requireObject(result, label);
  if (!Object.hasOwn(result, "error"))
    throw Error(`STOP: ${label} has no success status`);
  if (result.error === null) return;
  if (result.error) requireData(result, label);
  throw Error(`STOP: ${label} has an invalid success status`);
}
