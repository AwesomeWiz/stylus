import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { integrationEnvironment } from "./config";
import { IntegrationError } from "./errors";

const envelope = z
  .object({
    v: z.literal(1),
    kid: z.string().regex(/^[\w-]{1,40}$/),
    iv: z.string(),
    tag: z.string(),
    data: z.string(),
  })
  .strict();
function keys() {
  try {
    const e = integrationEnvironment();
    const values = z
      .record(z.string().regex(/^[\w-]{1,40}$/), z.string())
      .parse(JSON.parse(e.STYLUS_INTEGRATION_KEYS ?? "{}"));
    const keys = new Map(
      Object.entries(values).map(([id, value]) => {
        const key = Buffer.from(value, "base64");
        if (key.length !== 32 || key.toString("base64") !== value)
          throw Error();
        return [id, key] as const;
      }),
    );
    if (!e.STYLUS_INTEGRATION_KEY_ID || !keys.has(e.STYLUS_INTEGRATION_KEY_ID))
      throw Error();
    return { active: e.STYLUS_INTEGRATION_KEY_ID, keys };
  } catch {
    throw new IntegrationError("setup");
  }
}
/** AES-256-GCM, random nonce, authenticated record identity, explicit key version. */
export function sealCredential(value: unknown, identity: string): string {
  const { active, keys: keyring } = keys(),
    iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyring.get(active)!, iv);
  cipher.setAAD(Buffer.from(identity));
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    v: 1,
    kid: active,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}
export function openCredential(value: string, identity: string): unknown {
  try {
    const parsed = envelope.parse(JSON.parse(value)),
      key = keys().keys.get(parsed.kid);
    if (!key) throw Error();
    const iv = Buffer.from(parsed.iv, "base64"),
      tag = Buffer.from(parsed.tag, "base64");
    if (iv.length !== 12 || tag.length !== 16) throw Error();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(identity));
    decipher.setAuthTag(tag);
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(parsed.data, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    );
  } catch {
    throw new IntegrationError("authorization");
  }
}
