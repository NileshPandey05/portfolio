import { bayerThreshold, ditherPick } from "./dither";
import { SCENE_COLORS } from "./palette";

export const SCENE_W = 175;
export const SCENE_H = 91;

// ============================================================================
// Low-level Uint32 Pixel Primitives
// ============================================================================

export function setPx(buf: Uint32Array, x: number, y: number, color: number): void {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || ix >= SCENE_W || iy < 0 || iy >= SCENE_H) return;
  buf[iy * SCENE_W + ix] = color;
}

export function fillRect(
  buf: Uint32Array,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number
): void {
  const x0 = Math.max(0, x | 0);
  const y0 = Math.max(0, y | 0);
  const x1 = Math.min(SCENE_W, (x + w) | 0);
  const y1 = Math.min(SCENE_H, (y + h) | 0);
  for (let py = y0; py < y1; py++) {
    const row = py * SCENE_W;
    for (let px = x0; px < x1; px++) {
      buf[row + px] = color;
    }
  }
}

export function fillCircle(
  buf: Uint32Array,
  cx: number,
  cy: number,
  r: number,
  color: number
): void {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(SCENE_W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(SCENE_H - 1, Math.ceil(cy + r));
  for (let py = y0; py <= y1; py++) {
    const dy = py - cy;
    const row = py * SCENE_W;
    for (let px = x0; px <= x1; px++) {
      const dx = px - cx;
      if (dx * dx + dy * dy <= r2) {
        buf[row + px] = color;
      }
    }
  }
}

export function drawDitherCircle(
  buf: Uint32Array,
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  color: number,
  strength = 1
): void {
  const x0 = Math.max(0, Math.floor(cx - rOuter));
  const x1 = Math.min(SCENE_W - 1, Math.ceil(cx + rOuter));
  const y0 = Math.max(0, Math.floor(cy - rOuter));
  const y1 = Math.min(SCENE_H - 1, Math.ceil(cy + rOuter));
  const span = Math.max(0.001, rOuter - rInner);

  for (let py = y0; py <= y1; py++) {
    const dy = py - cy;
    const row = py * SCENE_W;
    for (let px = x0; px <= x1; px++) {
      const dx = px - cx;
      const dist = Math.hypot(dx, dy);
      if (dist <= rOuter) {
        const density =
          dist <= rInner ? strength : strength * (1 - (dist - rInner) / span);
        if (ditherPick(density, px, py)) {
          buf[row + px] = color;
        }
      }
    }
  }
}

/**
 * Deterministic 2D hash returning [0..1)
 */
export function hash2D(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}

// ============================================================================
// Clouds (flat-bottom pixel silhouettes with optional under-shadow)
// ============================================================================

export interface CloudDef {
  readonly baseX: number;
  readonly baseY: number;
  readonly rows: readonly string[];
  readonly speed: number;
}

export const CLOUDS: readonly CloudDef[] = [
  {
    baseX: 19,
    baseY: 11,
    speed: 0.34,
    rows: [
      "......#####.......",
      "....#########.....",
      "..##############..",
      "##################",
      ".dddddddddddddddd.",
      "..dd..dd..dd..dd..",
    ],
  },
  {
    baseX: 78,
    baseY: 23,
    speed: 0.25,
    rows: [
      "........####........",
      ".....##########.....",
      "..################..",
      "####################",
      ".dddddddddddddddddd.",
    ],
  },
  {
    baseX: 132,
    baseY: 8,
    speed: 0.4,
    rows: [
      ".....######.......",
      "..############....",
      "################..",
      "##################",
      ".dddddddddddddddd.",
    ],
  },
];

export function drawCloud(
  buf: Uint32Array,
  cloud: CloudDef,
  offsetX: number,
  mainColor: number,
  shadeColor: number
): void {
  const startX = Math.round(cloud.baseX + offsetX);
  const startY = cloud.baseY;
  for (let ry = 0; ry < cloud.rows.length; ry++) {
    const rowStr = cloud.rows[ry];
    if (!rowStr) continue;
    for (let rx = 0; rx < rowStr.length; rx++) {
      const ch = rowStr[rx];
      if (ch === ".") continue;
      // Wrap clouds seamlessly across the 175px scene width + margin
      let px = (startX + rx) % (SCENE_W + 24);
      if (px < -18) px += SCENE_W + 24;
      else if (px >= SCENE_W) px -= SCENE_W + 24;
      setPx(buf, px, startY + ry, ch === "d" ? shadeColor : mainColor);
    }
  }
}

// ============================================================================
// Deterministic Stars (sky y = 2..46)
// ============================================================================

export interface StarDef {
  readonly x: number;
  readonly y: number;
  readonly phase: number;
  readonly isCross: boolean;
  readonly bright: boolean;
}

export const STARS: readonly StarDef[] = [
  { x: 11, y: 15, phase: 0.2, isCross: false, bright: false },
  { x: 18, y: 29, phase: 1.4, isCross: false, bright: true },
  { x: 25, y: 11, phase: 2.3, isCross: false, bright: false },
  { x: 31, y: 21, phase: 3.1, isCross: false, bright: true },
  { x: 36, y: 7, phase: 0.9, isCross: false, bright: false },
  { x: 43, y: 13, phase: 4.1, isCross: false, bright: false },
  { x: 52, y: 6, phase: 1.7, isCross: true, bright: true },
  { x: 59, y: 16, phase: 5.0, isCross: false, bright: false },
  { x: 64, y: 8, phase: 2.8, isCross: false, bright: true },
  { x: 71, y: 11, phase: 0.6, isCross: true, bright: true },
  { x: 77, y: 4, phase: 3.8, isCross: false, bright: false },
  { x: 84, y: 14, phase: 1.2, isCross: false, bright: true },
  { x: 91, y: 7, phase: 4.5, isCross: false, bright: false },
  { x: 98, y: 18, phase: 2.0, isCross: false, bright: true },
  { x: 105, y: 6, phase: 5.4, isCross: true, bright: true },
  { x: 112, y: 15, phase: 0.5, isCross: false, bright: false },
  { x: 119, y: 9, phase: 3.4, isCross: false, bright: true },
  { x: 126, y: 4, phase: 1.9, isCross: false, bright: false },
  { x: 136, y: 12, phase: 4.8, isCross: false, bright: false },
  { x: 144, y: 6, phase: 2.6, isCross: false, bright: true },
  { x: 152, y: 17, phase: 0.1, isCross: false, bright: false },
  { x: 159, y: 10, phase: 3.9, isCross: true, bright: true },
  { x: 165, y: 22, phase: 1.6, isCross: false, bright: true },
  { x: 16, y: 39, phase: 4.2, isCross: false, bright: false },
  { x: 24, y: 34, phase: 2.1, isCross: false, bright: true },
  { x: 35, y: 41, phase: 5.7, isCross: false, bright: false },
  { x: 79, y: 34, phase: 0.8, isCross: false, bright: true },
  { x: 86, y: 27, phase: 3.3, isCross: true, bright: true },
  { x: 93, y: 38, phase: 1.5, isCross: false, bright: false },
  { x: 99, y: 29, phase: 4.7, isCross: false, bright: true },
  { x: 158, y: 31, phase: 2.4, isCross: false, bright: true },
  { x: 163, y: 37, phase: 5.2, isCross: false, bright: false },
  { x: 154, y: 44, phase: 0.4, isCross: false, bright: true },
  { x: 10, y: 23, phase: 3.6, isCross: false, bright: true },
];

// ============================================================================
// Wildflowers on grass (y = 70..89)
// ============================================================================

export interface FlowerDef {
  readonly x: number;
  readonly y: number;
  readonly kind: 0 | 1 | 2; // 0 white, 1 yellow, 2 orange/red
  readonly phase: number;
}

export const FLOWERS: readonly FlowerDef[] = [
  { x: 13, y: 74, kind: 0, phase: 0.1 },
  { x: 17, y: 79, kind: 1, phase: 1.2 },
  { x: 22, y: 76, kind: 0, phase: 2.4 },
  { x: 26, y: 81, kind: 2, phase: 0.7 },
  { x: 30, y: 75, kind: 0, phase: 3.1 },
  { x: 33, y: 83, kind: 1, phase: 1.8 },
  { x: 37, y: 78, kind: 0, phase: 2.9 },
  { x: 41, y: 85, kind: 0, phase: 0.4 },
  { x: 46, y: 81, kind: 1, phase: 4.0 },
  { x: 51, y: 84, kind: 2, phase: 1.1 },
  { x: 56, y: 79, kind: 0, phase: 3.6 },
  { x: 78, y: 71, kind: 1, phase: 0.9 },
  { x: 83, y: 73, kind: 0, phase: 2.2 },
  { x: 88, y: 71, kind: 2, phase: 3.8 },
  { x: 93, y: 73, kind: 1, phase: 1.4 },
  { x: 98, y: 71, kind: 0, phase: 4.5 },
  { x: 104, y: 73, kind: 1, phase: 0.3 },
  { x: 112, y: 79, kind: 0, phase: 2.7 },
  { x: 118, y: 82, kind: 1, phase: 1.9 },
  { x: 124, y: 76, kind: 2, phase: 3.3 },
  { x: 131, y: 81, kind: 0, phase: 0.6 },
  { x: 136, y: 77, kind: 1, phase: 2.0 },
  { x: 141, y: 84, kind: 0, phase: 4.1 },
  { x: 145, y: 79, kind: 0, phase: 1.5 },
  { x: 151, y: 82, kind: 1, phase: 3.0 },
  { x: 156, y: 76, kind: 2, phase: 0.8 },
  { x: 161, y: 79, kind: 0, phase: 2.5 },
  { x: 138, y: 87, kind: 1, phase: 3.9 },
  { x: 129, y: 86, kind: 0, phase: 1.0 },
  { x: 97, y: 86, kind: 0, phase: 2.8 },
];

// ============================================================================
// Precomputed Multi-Lobed Tree Canopy Mask (exact 175x91 spatial layout)
// ============================================================================

export const TREE_MASK = new Uint8Array(SCENE_W * SCENE_H); // 0=empty, 1..4=shade level (1=sunlit top-left, 4=deepest shadow)
export const TREE_AUTUMN_MASK = new Uint8Array(SCENE_W * SCENE_H); // 0=stays olive, 1=sunlit autumn orange cluster

interface EllipticalLobe {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

const TREE_LOBES: readonly EllipticalLobe[] = [
  { cx: 126, cy: 22, rx: 10.5, ry: 8.5 }, // top crown peak
  { cx: 114, cy: 33, rx: 16.5, ry: 12.5 }, // big upper-left lobe
  { cx: 109, cy: 42, rx: 10.5, ry: 6.5 }, // lower-left overhang
  { cx: 133, cy: 34, rx: 14.0, ry: 12.0 }, // main center-right canopy
  { cx: 147, cy: 31, rx: 8.5, ry: 7.5 }, // iconic far-right knob
  { cx: 138, cy: 45, rx: 10.5, ry: 8.5 }, // lower-right bulge
];

(() => {
  for (let y = 12; y <= 57; y++) {
    for (let x = 95; x <= 158; x++) {
      let inside = false;
      for (const l of TREE_LOBES) {
        const dx = (x - l.cx) / l.rx;
        const dy = (y - l.cy) / l.ry;
        // Slight pixel edge irregularity using deterministic cluster noise
        const edgeJitter = (hash2D(x >> 1, y >> 1) - 0.5) * 0.22;
        if (dx * dx + dy * dy <= 1.0 + edgeJitter) {
          inside = true;
          break;
        }
      }
      if (!inside) continue;

      // Directional sunlight from top-left + organic leaf-clump noise
      const normX = (x - 97) / 58;
      const normY = (y - 14) / 42;
      const cluster = hash2D((x + 3) >> 1, (y + 5) >> 1);
      const fine = hash2D(x, y);
      const shadeScore =
        normY * 0.55 + normX * 0.25 + (1 - cluster) * 0.42 + (1 - fine) * 0.12;

      let tone = 2;
      if (shadeScore < 0.42) tone = 1;
      else if (shadeScore < 0.68) tone = 2;
      else if (shadeScore < 0.92) tone = 3;
      else tone = 4;

      // Darken underside slightly
      if (y > 46 && tone < 4 && hash2D(x + 11, y) > 0.35) {
        tone = 4;
      }

      const idx = y * SCENE_W + x;
      TREE_MASK[idx] = tone;

      // Sunlit upper-left & mid clusters turn warm autumn orange in dusk (matching 07_dusk_held_orange_band)
      const autumnBias = (1 - normY * 0.85) * 0.65 + (1 - normX * 0.65) * 0.35;
      if (autumnBias + (cluster - 0.5) * 0.55 > 0.48) {
        TREE_AUTUMN_MASK[idx] = 1;
      }
    }
  }
})();

// ============================================================================
// Character Pixel Maps (10px tall, anchored top-left)
// Legend:
//  '.' = transparent
//  'H' = hair (#171A2E)
//  'S' = skin (#F5D8B8)
//  's' = shaded skin (#D9B28C)
//  'T' = orange shirt (#CC8A26)
//  't' = shaded shirt (#966114)
//  'P' = pants (#2E385C)
//  'L' = laptop white (#F5F2E8)
//  'l' = laptop shade (#B6BAC4)
// ============================================================================

const CHAR_SITTING_0: readonly string[] = [
  "....HHH...",
  "...HHHHH..",
  "...HSSSH..",
  "...HSSsH..",
  "....TTT...",
  ".LLTTTT...",
  ".LllTTT...",
  "..llPPPP..",
  "....PP....",
];

const CHAR_SITTING_1: readonly string[] = [
  "..........",
  "....HHH...",
  "...HHHHH..",
  "...HSSSH..",
  "...HSSsH..",
  ".LL.TTT...",
  ".LllTTT...",
  "..llPPPP..",
  "....PP....",
];

const CHAR_STANDING: readonly string[] = [
  "..HHH..",
  ".HHHHH.",
  ".HSSSH.",
  ".HSSsH.",
  "..TTT..",
  ".tTTTt.",
  "..TTT..",
  "..P.P..",
  "..P.P..",
];

const CHAR_WALK_0: readonly string[] = [
  "..HHH..",
  ".HHHHH.",
  ".HSSSH.",
  ".HSSsH.",
  "..TTT..",
  ".tTTTt.",
  "..TTT..",
  ".P...P.",
  ".P...P.",
];

const CHAR_WALK_1: readonly string[] = [
  "..HHH..",
  ".HHHHH.",
  ".HSSSH.",
  ".HSSsH.",
  "..TTT..",
  "..TTT..",
  "..TTT..",
  "..PP...",
  "..P.P..",
];

export type CharacterPose = "sit0" | "sit1" | "stand" | "walk0" | "walk1";

export function drawCharacter(
  buf: Uint32Array,
  x: number,
  y: number,
  pose: CharacterPose,
  dimFactor = 0
): void {
  const rows =
    pose === "sit0"
      ? CHAR_SITTING_0
      : pose === "sit1"
        ? CHAR_SITTING_1
        : pose === "stand"
          ? CHAR_STANDING
          : pose === "walk0"
            ? CHAR_WALK_0
            : CHAR_WALK_1;

  for (let ry = 0; ry < rows.length; ry++) {
    const rowStr = rows[ry];
    if (!rowStr) continue;
    for (let rx = 0; rx < rowStr.length; rx++) {
      const ch = rowStr[rx];
      if (!ch || ch === ".") continue;

      let col = SCENE_COLORS.charHair;
      if (ch === "S") col = SCENE_COLORS.charSkin;
      else if (ch === "s") col = SCENE_COLORS.charSkinShade;
      else if (ch === "T") col = SCENE_COLORS.charShirt;
      else if (ch === "t") col = SCENE_COLORS.charShirtShade;
      else if (ch === "P") col = SCENE_COLORS.charPants;
      else if (ch === "L") col = SCENE_COLORS.laptopWhite;
      else if (ch === "l") col = SCENE_COLORS.laptopShade;

      if (dimFactor > 0.05 && ditherPick(dimFactor, (x + rx) | 0, (y + ry) | 0)) {
        col = SCENE_COLORS.treeNight1;
      }
      setPx(buf, x + rx, y + ry, col);
    }
  }
}

export function drawExclamation(
  buf: Uint32Array,
  x: number,
  y: number,
  isWhite: boolean
): void {
  const c = isWhite ? SCENE_COLORS.emoteWhite : SCENE_COLORS.emoteDark;
  fillRect(buf, x, y, 1, 4, c);
  setPx(buf, x, y + 5, c);
}

/**
 * Draws the character peeking from inside the house window on morning return (11_day_idle_return).
 */
export function drawWindowPeekCharacter(buf: Uint32Array, wx: number, wy: number): void {
  // Warm interior backing inside the open window
  fillRect(buf, wx + 2, wy + 1, 7, 7, SCENE_COLORS.wallDuskLight);
  // Head & hair silhouette
  fillRect(buf, wx + 4, wy + 2, 3, 2, SCENE_COLORS.charHair);
  fillRect(buf, wx + 3, wy + 3, 5, 1, SCENE_COLORS.charHair);
  fillRect(buf, wx + 4, wy + 4, 3, 1, SCENE_COLORS.charSkin);
  // Shoulders
  fillRect(buf, wx + 3, wy + 5, 5, 3, SCENE_COLORS.charShirt);
}

export { bayerThreshold };
