import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

// Startup may print local API keys and database URLs even on failure. Never
// publish the raw log or enable debug-level credential/configuration dumps.
export function sanitizeStartupLog(input, env = process.env) {
  let output = stripVTControlCharacters(input);
  for (const [name, value] of Object.entries(env)) {
    if (
      /token|key|secret|password|credential|authorization|dsn/i.test(name) &&
      value?.length >= 8
    ) {
      output = output.split(value).join("[REDACTED]");
    }
  }
  return output
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
      "[REDACTED PRIVATE KEY]",
    )
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[REDACTED JWT]")
    .replace(/\bsb_(?:secret|publishable)_[\w-]+/g, "[REDACTED API KEY]")
    .replace(/(\b[a-z][a-z\d+.-]*:\/\/)[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(
      /([?&](?:[^=&\s]*(?:token|key|secret|password|signature|credential)[^=&\s]*)=)[^&\s]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /(\b(?:authorization|cookie|set-cookie)\s*[:=])[^\r\n]*/gi,
      "$1 [REDACTED]",
    )
    .replace(
      /^(.*?\b(?:[\w -]*(?:key|secret|password|token))["']?\s*[=:|│])[^\r\n]*/gim,
      "$1 [REDACTED]",
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  if (process.argv.length !== 3) throw Error("Expected one startup log path");
  process.stdout.write(
    sanitizeStartupLog(fs.readFileSync(process.argv[2], "utf8")),
  );
}
