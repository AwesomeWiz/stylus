import "server-only";

import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCronRequest(
  authorization: string | null,
  secret: string | undefined,
) {
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}
