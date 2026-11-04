import type { BoardElementRow } from "@/lib/supabase/database.types";
import { boardTextStyle } from "@/modules/whiteboards/typography";
/** Measure only at a text/property intent boundary, never during pointer frames. */
export async function measureBoardText(row: BoardElementRow) {
  const style = boardTextStyle(row.style),
    text = String(row.content.text ?? "").slice(0, 5000);
  const family =
    row.style.family && row.style.family !== "geist"
      ? style.fontFamily
      : getComputedStyle(document.body).fontFamily;
  if (document.fonts?.load)
    await document.fonts.load(
      `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${family}`,
      text,
    );
  const sample = document.createElement("div");
  sample.setAttribute("aria-hidden", "true");
  Object.assign(sample.style, style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    visibility: "hidden",
    pointerEvents: "none",
    width: `${row.width}px`,
    height: "auto",
    boxSizing: "border-box",
    padding: "12px",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  });
  sample.textContent = text || " ";
  document.body.appendChild(sample);
  try {
    return Math.max(
      24,
      Math.min(10000, Math.ceil(sample.getBoundingClientRect().height)),
    );
  } finally {
    sample.remove();
  }
}
