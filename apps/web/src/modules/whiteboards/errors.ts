import { WhiteboardMutationDeniedError } from "./authorization";

export type BoardErrorCode =
  | "AUTHORIZATION"
  | "LOCKED"
  | "LIMIT"
  | "CONFLICT"
  | "VALIDATION"
  | "SCHEMA"
  | "INFRASTRUCTURE";
export const boardErrorMessages: Record<BoardErrorCode, string> = {
  AUTHORIZATION: "You no longer have permission to edit this board.",
  LOCKED: "Unlock the selected object before changing it.",
  LIMIT:
    "This action affects more than 200 objects. Reduce the selection and try again.",
  CONFLICT:
    "This object changed elsewhere. Reload the latest version before retrying.",
  VALIDATION: "This change is not valid.",
  SCHEMA:
    "This change could not be saved. Your previous saved state has been restored.",
  INFRASTRUCTURE:
    "This change could not be saved. Your previous saved state has been restored.",
};

/** Never return a provider body or SQL message to the client. */
export function classifyBoardError(error: unknown): {
  code: BoardErrorCode;
  message: string;
} {
  const value =
    error && typeof error === "object"
      ? (error as {
          code?: string;
          message?: string;
          issues?: { code?: string; path?: PropertyKey[] }[];
        })
      : {};
  const message = value.message ?? "";
  let code: BoardErrorCode = "INFRASTRUCTURE";
  if (
    error instanceof WhiteboardMutationDeniedError ||
    value.code === "42501" ||
    value.code === "PGRST301"
  )
    code = "AUTHORIZATION";
  else if (
    ["PGRST202", "PGRST204", "42883", "42703"].includes(value.code ?? "")
  )
    code = "SCHEMA";
  else if (/unlock|locked object|locked container/i.test(message))
    code = "LOCKED";
  else if (
    /200 objects|199 descendants|at most 200/i.test(message) ||
    value.issues?.some(
      (i) =>
        i.code === "too_big" &&
        ["upserts", "archiveIds"].includes(String(i.path?.[0])),
    )
  )
    code = "LIMIT";
  else if (
    ["40001", "40P01"].includes(value.code ?? "") ||
    /changed elsewhere|version conflict/i.test(message)
  )
    code = "CONFLICT";
  else if (
    value.issues ||
    ["23514", "23503", "22P02", "22023", "23505"].includes(value.code ?? "")
  )
    code = "VALIDATION";
  return { code, message: boardErrorMessages[code] };
}
