/**
 * 4x4 Bayer ordered-dithering matrix normalized to [0..15] / 16.
 * Used for retro pixel-art gradient bands, window glow spill, and scene transitions.
 */
export const BAYER_4X4_RAW = new Uint8Array([
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
]);

export const BAYER_4X4_NORM = new Float32Array(
  Array.from(BAYER_4X4_RAW, (v) => (v + 0.5) / 16)
);

export function bayerThreshold(x: number, y: number): number {
  const idx = ((y & 3) << 2) | (x & 3);
  return BAYER_4X4_NORM[idx] ?? 0.5;
}

/**
 * Returns true if pixel (x, y) should take the target layer given progress t in [0..1].
 */
export function ditherPick(t: number, x: number, y: number): boolean {
  if (t <= 0) return false;
  if (t >= 1) return true;
  return bayerThreshold(x, y) < t;
}

/**
 * Dissolves pixel buffer A into pixel buffer B in-place into `dst` using the 4x4 Bayer mask.
 */
export function bayerDissolveBuffers(
  srcA: Uint32Array,
  srcB: Uint32Array,
  dst: Uint32Array,
  w: number,
  h: number,
  t: number
): void {
  if (t <= 0) {
    dst.set(srcA);
    return;
  }
  if (t >= 1) {
    dst.set(srcB);
    return;
  }
  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    const bayerRow = (y & 3) << 2;
    for (let x = 0; x < w; x++) {
      const thresh = BAYER_4X4_NORM[bayerRow | (x & 3)] ?? 0.5;
      const idx = rowOff + x;
      dst[idx] = (thresh < t ? srcB[idx] : srcA[idx]) ?? 0;
    }
  }
}
