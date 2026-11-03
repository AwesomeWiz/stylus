import type { CSSProperties } from "react";
import styles from "./auth-visual.module.css";

// Deterministic architectural field; no random hydration or generated bitmap.
const field = [
  "paper paper cobalt cobalt deep deep",
  "paper sky cobalt cobalt deep deep",
  "mint mint paper cobalt cobalt deep",
  "mint mint paper paper apricot apricot",
  "deep paper paper butter apricot apricot",
  "deep deep cobalt butter paper paper",
  "deep cobalt cobalt cobalt paper sky",
  "paper cobalt cobalt paper sky sky",
].flatMap((row) => row.split(" "));

export function AuthVisualArtwork() {
  return (
    <div className={styles.field}>
      {field.map((color, index) => (
        <div
          key={index}
          data-auth-tile
          data-column={index % 6}
          data-row={Math.floor(index / 6)}
          className={styles.tile}
          style={
            {
              "--tile-color": `var(--brand-${color})`,
              "--tile-shape":
                index % 7 === 0
                  ? "50% 50% 6% 50%"
                  : index % 5 === 0
                    ? "50% 6% 6% 6%"
                    : "6%",
            } as CSSProperties
          }
        >
          <span className={styles.tileFace} />
        </div>
      ))}
    </div>
  );
}

export function AuthVisualAccent() {
  return (
    <span aria-hidden="true" className={styles.accent}>
      <i />
      <i />
      <i />
    </span>
  );
}
