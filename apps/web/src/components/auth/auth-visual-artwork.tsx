import styles from "./auth-visual.module.css";

const field =
  "M-42 170C84 16 352 38 464 174C552 282 602 339 586 438C566 559 412 626 254 584C134 550 156 424 62 386C-146 322-118 262-42 170Z";
const contour =
  "M-90 174C60 12 280 63 400 192S626 376 548 492S288 604 220 486S124 370-48 342";

/** Server-rendered artwork is passed through the small client interaction boundary. */
export function AuthVisualArtwork() {
  return (
    <>
      <svg
        aria-hidden="true"
        className={styles.drawing}
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 720 680"
      >
        <defs>
          <clipPath id="stylus-auth-field">
            <path d={field} />
          </clipPath>
        </defs>
        <g className={styles.far}>
          <path
            d="M136 98C240 30 408 52 494 156L578 292L414 392L216 282Z"
            fill="var(--auth-warm)"
          />
          <path
            d="M420 83H614V297H538V371H462"
            fill="none"
            stroke="var(--auth-rule)"
            strokeWidth="0.8"
          />
          <path
            d="M458 83V297M496 83V297M534 83V297M572 83V297M420 126H614M420 169H614M420 212H614M420 255H614"
            fill="none"
            opacity="0.45"
            stroke="var(--auth-rule)"
            strokeWidth="0.7"
          />
        </g>
        <g className={styles.middle}>
          <path
            d="M-70 230C-8 42 197-14 360 82C534 184 440 298 519 398C594 496 439 647 270 592C78 530 77 405-70 408Z"
            fill="var(--auth-seafoam)"
          />
        </g>
        <g className={styles.front}>
          <path d={field} fill="var(--auth-plane)" />
          <g
            clipPath="url(#stylus-auth-field)"
            fill="none"
            opacity="0.65"
            stroke="var(--auth-contour)"
            strokeWidth="0.9"
          >
            {Array.from({ length: 14 }, (_, i) => (
              <path
                d={contour}
                key={i}
                transform={`translate(${i * 3} ${i * 15})`}
              />
            ))}
          </g>
          <path
            d="M278 563C210 470 323 370 401 334S493 204 459 165"
            fill="none"
            stroke="var(--auth-cyan)"
            strokeWidth="3"
          />
        </g>
        <g className={styles.details}>
          <path
            d="M87 630C72 471 679 558 634 207M468 123H638V229H564V335H490V441H416V547"
            fill="none"
            stroke="var(--auth-ink)"
            strokeWidth="1"
          />
          <circle
            cx="490"
            cy="335"
            fill="var(--auth-ground)"
            r="7"
            stroke="var(--auth-ink)"
          />
          <circle cx="638" cy="123" fill="var(--auth-cyan)" r="4" />
          <path
            d="M76 80H88M82 74V86M613 583H625M619 577V589"
            stroke="var(--auth-rule)"
          />
          <text className={styles.annotation} x="103" y="84">
            S / 01
          </text>
          <text className={styles.annotation} x="531" y="615">
            FORM / 04
          </text>
        </g>
      </svg>
      <svg
        aria-hidden="true"
        className={styles.reveal}
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 720 680"
      >
        <g fill="none" stroke="var(--auth-contour)" strokeWidth="0.8">
          {Array.from({ length: 16 }, (_, i) => (
            <path d={`M${80 + i * 32} 85V620M80 ${100 + i * 32}H650`} key={i} />
          ))}
        </g>
        <g fill="none" stroke="var(--auth-ink)" strokeWidth="0.8">
          <path d="M96 340C231 93 535 174 574 434M131 367C278 140 539 202 546 478M166 394C310 187 543 230 518 522" />
          <circle cx="538" cy="297" r="24" />
          <path d="M500 297H576M538 259V335" />
        </g>
      </svg>
    </>
  );
}

export function AuthVisualAccent() {
  return (
    <svg
      aria-hidden="true"
      className={styles.accent}
      focusable="false"
      viewBox="0 0 80 36"
    >
      <path
        d="M1 26C15-5 36 1 47 16S67 42 79 10"
        fill="none"
        stroke="var(--auth-cyan)"
        strokeWidth="2"
      />
      <path
        d="M1 33C15 2 36 8 47 23S67 49 79 17M1 19C15-12 36-6 47 9S67 35 79 3"
        fill="none"
        stroke="var(--auth-rule)"
        strokeWidth="0.8"
      />
      <path
        d="M60 5H74V19"
        fill="none"
        stroke="var(--auth-ink)"
        strokeWidth="0.8"
      />
    </svg>
  );
}
