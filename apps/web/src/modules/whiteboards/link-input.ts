import { safeBoardUrl } from "./schemas";
/** Normalize explicit user input only; persisted/action URL validation stays strict. */
export function normalizeBoardLinkInput(value: string) {
  const input = value.trim();
  if (/[\u0000-\u0020\u007f]/.test(input))
    throw Error(
      "Enter a domain or an http/https URL without spaces or credentials.",
    );
  const bare =
    /^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,63}(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(
      input,
    );
  return safeBoardUrl.parse(bare ? `https://${input}` : input);
}
export function boardLinkInputError(value: string) {
  try {
    normalizeBoardLinkInput(value);
    return null;
  } catch {
    return "Enter a domain or an http/https URL without credentials.";
  }
}
