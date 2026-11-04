export type BoardHSV = { h: number; s: number; v: number; a: number };
export function isBoardHex(value: string) {
  return /^#(?:[a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value);
}
const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
export function hexToHSV(value: string, previousHue = 0): BoardHSV {
  if (!isBoardHex(value)) throw Error("Invalid HEX color");
  let hex = value.slice(1);
  if (hex.length <= 4) hex = [...hex].map((char) => char + char).join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255,
    g = parseInt(hex.slice(2, 4), 16) / 255,
    b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  let h = previousHue;
  if (delta) {
    h =
      max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return {
    h,
    s: max ? delta / max : 0,
    v: max,
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}
export function hsvToHex({ h, s, v, a }: BoardHSV) {
  const hue = (((h % 360) + 360) % 360) / 60,
    saturation = clamp(s),
    value = clamp(v),
    c = value * saturation,
    x = c * (1 - Math.abs((hue % 2) - 1)),
    m = value - c;
  const rgb =
    hue < 1
      ? [c, x, 0]
      : hue < 2
        ? [x, c, 0]
        : hue < 3
          ? [0, c, x]
          : hue < 4
            ? [0, x, c]
            : hue < 5
              ? [x, 0, c]
              : [c, 0, x];
  const byte = (n: number) =>
    Math.round(clamp(n) * 255)
      .toString(16)
      .padStart(2, "0");
  return (
    "#" +
    rgb.map((channel) => byte(channel + m)).join("") +
    (a < 1 ? byte(a) : "")
  );
}
export function sampleColorSquare(
  hsv: BoardHSV,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    ...hsv,
    s: clamp(x / Math.max(1, width)),
    v: 1 - clamp(y / Math.max(1, height)),
  };
}
