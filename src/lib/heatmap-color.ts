function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function hexToRgb(hex: string) {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/**
 * Maps a 0-100 intensity value onto the Evolvr theme gradient:
 * 0 -> text-low (dim/untouched), 50 -> primary (cyan), 100 -> xp-gold (peak).
 * Shared by the muscle heatmap (Gym) and the focus heatmap (Study).
 */
export function colorForIntensity(value: number, max = 100): string {
  const low = hexToRgb("5c7290");
  const mid = hexToRgb("4fd1ff");
  const high = hexToRgb("ffd54a");
  const t = Math.max(0, Math.min(1, value / max));
  let rgb: number[];
  if (t < 0.5) {
    const tt = t / 0.5;
    rgb = low.map((c, i) => lerp(c, mid[i], tt));
  } else {
    const tt = (t - 0.5) / 0.5;
    rgb = mid.map((c, i) => lerp(c, high[i], tt));
  }
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
