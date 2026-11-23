export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = parseInt(clean, 16);
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  };
}

/**
 * Packs RGBA into little-endian ABGR Uint32 (Canvas ImageData byte order on x86/ARM little-endian).
 */
export function rgbToU32(r: number, g: number, b: number, a = 255): number {
  return (
    ((a & 0xff) << 24) |
    ((b & 0xff) << 16) |
    ((g & 0xff) << 8) |
    (r & 0xff)
  ) >>> 0;
}

export function hexToU32(hex: string, a = 255): number {
  const { r, g, b } = hexToRgb(hex);
  return rgbToU32(r, g, b, a);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const ct = clamp01(t);
  return {
    r: Math.round(lerp(a.r, b.r, ct)),
    g: Math.round(lerp(a.g, b.g, ct)),
    b: Math.round(lerp(a.b, b.b, ct)),
  };
}

export function lerpU32(uA: number, uB: number, t: number): number {
  const ct = clamp01(t);
  if (ct <= 0) return uA;
  if (ct >= 1) return uB;
  const rA = uA & 0xff;
  const gA = (uA >>> 8) & 0xff;
  const bA = (uA >>> 16) & 0xff;
  const aA = (uA >>> 24) & 0xff;

  const rB = uB & 0xff;
  const gB = (uB >>> 8) & 0xff;
  const bB = (uB >>> 16) & 0xff;
  const aB = (uB >>> 24) & 0xff;

  return rgbToU32(
    Math.round(rA + (rB - rA) * ct),
    Math.round(gA + (gB - gA) * ct),
    Math.round(bA + (bB - bA) * ct),
    Math.round(aA + (aB - aA) * ct)
  );
}

export function rgbToCss({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// Reference Palette (timeline.json + key_frames)
// ============================================================================

export const PALETTE_HEX = {
  pageDay: "#FFFFFF",
  pageDuskMid: "#DED6CB",
  pageGreyMid: "#858488",
  pageNightDusk: "#202334",
  pageNight: "#0A0B1F",

  rimDayHighlight: "#F7F4EC",
  rimDayMid: "#EEEAE1",
  rimDayShadow: "#D1CEC5",

  rimNightHighlight: "#38345D",
  rimNightMid: "#2B2748",
  rimNightShadow: "#17152D",
} as const;

const BG_STOPS: ReadonlyArray<{ readonly p: number; readonly rgb: Rgb }> = [
  { p: 0.0, rgb: hexToRgb(PALETTE_HEX.pageDay) },
  { p: 0.45, rgb: hexToRgb(PALETTE_HEX.pageDuskMid) },
  { p: 0.62, rgb: hexToRgb(PALETTE_HEX.pageGreyMid) },
  { p: 0.78, rgb: hexToRgb(PALETTE_HEX.pageNightDusk) },
  { p: 1.0, rgb: hexToRgb(PALETTE_HEX.pageNight) },
];

export function getPageBgColor(p: number): string {
  const cp = clamp01(p);
  for (let i = 0; i < BG_STOPS.length - 1; i++) {
    const a = BG_STOPS[i]!;
    const b = BG_STOPS[i + 1]!;
    if (cp <= b.p) {
      const localT = (cp - a.p) / (b.p - a.p);
      return rgbToCss(lerpRgb(a.rgb, b.rgb, localT));
    }
  }
  return PALETTE_HEX.pageNight;
}

const RIM_DAY_TOP = hexToRgb(PALETTE_HEX.rimDayHighlight);
const RIM_DAY_MID = hexToRgb(PALETTE_HEX.rimDayMid);
const RIM_DAY_BOT = hexToRgb(PALETTE_HEX.rimDayShadow);

const RIM_NIGHT_TOP = hexToRgb(PALETTE_HEX.rimNightHighlight);
const RIM_NIGHT_MID = hexToRgb(PALETTE_HEX.rimNightMid);
const RIM_NIGHT_BOT = hexToRgb(PALETTE_HEX.rimNightShadow);

export interface ShellVisualStyle {
  readonly background: string;
  readonly boxShadow: string;
  readonly innerShadow: string;
}

export function getShellStyle(
  p: number,
  windowGlow: number,
  scale: number
): ShellVisualStyle {
  // Rim transitions rapidly from ivory to dark indigo across p in [0.46, 0.82]
  const nightMix = smoothstep(0.46, 0.82, p);
  const top = rgbToCss(lerpRgb(RIM_DAY_TOP, RIM_NIGHT_TOP, nightMix));
  const mid = rgbToCss(lerpRgb(RIM_DAY_MID, RIM_NIGHT_MID, nightMix));
  const bot = rgbToCss(lerpRgb(RIM_DAY_BOT, RIM_NIGHT_BOT, nightMix));

  const dayDropAlpha = (1 - nightMix) * 0.19;
  const nightDropAlpha = nightMix * 0.55;
  const glow = clamp01(windowGlow) * smoothstep(0.45, 0.85, p);

  const shadowScale = Math.max(0.28, scale);
  const s = (v: number) => `${(v * shadowScale).toFixed(2)}px`;

  const shadows = [
    `inset 0 ${s(2.5)} ${s(2)} rgba(255, 255, 255, ${(0.92 * (1 - nightMix) + 0.14 * nightMix).toFixed(3)})`,
    `inset 0 ${s(-5)} ${s(10)} rgba(0, 0, 0, ${(0.12 * (1 - nightMix) + 0.48 * nightMix).toFixed(3)})`,
  ];

  if (dayDropAlpha > 0.005) {
    shadows.push(`0 ${s(16)} ${s(26)} rgba(60, 50, 30, ${dayDropAlpha.toFixed(3)})`);
  }
  if (nightDropAlpha > 0.005) {
    shadows.push(`0 ${s(16)} ${s(30)} rgba(0, 0, 10, ${nightDropAlpha.toFixed(3)})`);
  }
  if (glow > 0.01) {
    // Asymmetric warm amber bleed strongest around left/bottom-left near the lit window
    shadows.push(
      `${s(-18)} ${s(8)} ${s(42)} rgba(165, 105, 24, ${(0.42 * glow).toFixed(3)})`,
      `0 0 ${s(30)} rgba(125, 81, 18, ${(0.28 * glow).toFixed(3)})`
    );
  }

  const innerShadows = [
    `inset 0 ${s(4)} ${s(8)} rgba(0, 0, 0, ${(0.26 * (1 - nightMix) + 0.58 * nightMix).toFixed(3)})`,
    `inset 0 ${s(-2)} ${s(4)} rgba(255, 255, 255, ${(0.35 * (1 - nightMix) + 0.08 * nightMix).toFixed(3)})`,
  ];

  return {
    background: `linear-gradient(180deg, ${top} 0%, ${mid} 48%, ${bot} 100%)`,
    boxShadow: shadows.join(", "),
    innerShadow: innerShadows.join(", "),
  };
}

// ============================================================================
// Packed Uint32 Scene Colors (for 175x91 pixel-art canvas)
// ============================================================================

export const SCENE_COLORS = {
  // Day Sky
  daySky0: hexToU32("#667291"),
  daySky1: hexToU32("#93A4C2"),
  daySky2: hexToU32("#BCD0EC"),
  daySky3: hexToU32("#F4EFE2"),
  dayHillLight: hexToU32("#8094B6"),
  dayHillDark: hexToU32("#647699"),
  dayCloudMain: hexToU32("#FBF8EF"),
  dayCloudShade: hexToU32("#DCE3EA"),

  // Dusk Sky (with signature wide orange band)
  duskSky0: hexToU32("#3E4966"),
  duskSky1: hexToU32("#6C809B"),
  duskBandTop: hexToU32("#BB7C1B"),
  duskBandBot: hexToU32("#ECA43E"),
  duskHorizon: hexToU32("#768BA3"),
  duskHillLight: hexToU32("#5C6F8C"),
  duskHillDark: hexToU32("#45546F"),
  duskCloudMain: hexToU32("#FBE8CE"),
  duskCloudShade: hexToU32("#DF9C44"),

  // Dawn / Grey intermediate (night -> day)
  dawnSky0: hexToU32("#2D3354"),
  dawnSky1: hexToU32("#525F80"),
  dawnSky2: hexToU32("#7689A4"),
  dawnSky3: hexToU32("#9AB0C6"),
  dawnHillLight: hexToU32("#596889"),
  dawnHillDark: hexToU32("#3F4C6A"),
  dawnCloudMain: hexToU32("#B4C0D2"),
  dawnCloudShade: hexToU32("#7E8CA8"),

  // Night Sky
  nightSky0: hexToU32("#0B0B2D"),
  nightSky1: hexToU32("#171B3E"),
  nightHillLight: hexToU32("#15193D"),
  nightHillDark: hexToU32("#0D1030"),
  nightCloudMain: hexToU32("#2A3056"),
  nightCloudShade: hexToU32("#1A1F42"),

  // Sun & Moon & Stars
  sunCore: hexToU32("#FFFDF4"),
  sunEdge: hexToU32("#FCE7AE"),
  sunHalo: hexToU32("#F3C26A"),
  moonCore: hexToU32("#FEF7ED"),
  moonCrater: hexToU32("#DFD9C8"),
  moonHalo: hexToU32("#98A2C4"),
  starBright: hexToU32("#FEF7ED"),
  starSoft: hexToU32("#9EAAD2"),

  // Grass & Path
  dayGrassTop: hexToU32("#6C7D40"),
  dayGrassMid: hexToU32("#53672E"),
  dayGrassDark: hexToU32("#3E5020"),
  dayGrassShadow: hexToU32("#2E3D16"),
  dayPathLight: hexToU32("#CFCBC0"),
  dayPathDark: hexToU32("#A8A498"),

  duskGrassTop: hexToU32("#55612D"),
  duskGrassMid: hexToU32("#404E20"),
  duskGrassDark: hexToU32("#2F3C16"),
  duskGrassShadow: hexToU32("#232C11"),
  duskPathLight: hexToU32("#B7AE9B"),
  duskPathDark: hexToU32("#8D8374"),

  dawnGrassTop: hexToU32("#3E4A4D"),
  dawnGrassMid: hexToU32("#2F3A44"),
  dawnGrassDark: hexToU32("#222B3A"),
  dawnGrassShadow: hexToU32("#171E30"),
  dawnPathLight: hexToU32("#747F96"),
  dawnPathDark: hexToU32("#58627A"),

  nightGrassTop: hexToU32("#1B2145"),
  nightGrassMid: hexToU32("#121637"),
  nightGrassDark: hexToU32("#0B0D2A"),
  nightGrassShadow: hexToU32("#070820"),
  nightPathLight: hexToU32("#2A3054"),
  nightPathDark: hexToU32("#1A1F40"),

  // Flowers
  flowerWhite: hexToU32("#FAF6EB"),
  flowerYellow: hexToU32("#F2C94C"),
  flowerOrange: hexToU32("#D9822B"),
  flowerDuskWhite: hexToU32("#E5D6B8"),
  flowerNightDim: hexToU32("#2C3258"),

  // House
  roofDarkDay: hexToU32("#323B5E"),
  roofMidDay: hexToU32("#566386"),
  roofEaveDay: hexToU32("#232944"),

  roofDarkNight: hexToU32("#141736"),
  roofMidNight: hexToU32("#262B4E"),
  roofEaveNight: hexToU32("#0C0E28"),

  wallDayLight: hexToU32("#FAF7EE"),
  wallDayShade: hexToU32("#E1DDD1"),
  wallDuskLight: hexToU32("#FDEAC0"),
  wallDuskShade: hexToU32("#E0A545"),
  wallDawnLight: hexToU32("#8694AC"),
  wallDawnShade: hexToU32("#66738E"),
  wallNightLight: hexToU32("#2E3458"),
  wallNightShade: hexToU32("#1F2444"),

  shutterDay: hexToU32("#C88920"),
  shutterDayDark: hexToU32("#8A5810"),
  shutterDusk: hexToU32("#B87416"),
  shutterDuskDark: hexToU32("#7A490D"),
  shutterNight: hexToU32("#252B4C"),
  shutterNightDark: hexToU32("#151936"),

  windowDayFrame: hexToU32("#2E385C"),
  windowDayGlass: hexToU32("#414E7A"),
  windowDayGlint: hexToU32("#92A5CC"),

  windowLitCore: hexToU32("#FFFBEB"),
  windowLitMain: hexToU32("#FCF4CF"),
  windowLitWarm: hexToU32("#F5D376"),
  windowLitEdge: hexToU32("#D99B26"),
  windowGlowGroundBright: hexToU32("#B87C1D"),
  windowGlowGround: hexToU32("#7D5112"),

  doorDayWood: hexToU32("#825E3B"),
  doorDayDark: hexToU32("#5E4126"),
  doorDayFrame: hexToU32("#3C4875"),
  doorKnob: hexToU32("#E6B84D"),

  doorNightWood: hexToU32("#181C38"),
  doorNightDark: hexToU32("#0E1128"),
  doorNightFrame: hexToU32("#23284A"),

  fenceDay: hexToU32("#D39535"),
  fenceDayShade: hexToU32("#9E6B1D"),
  fenceDusk: hexToU32("#C88422"),
  fenceDuskShade: hexToU32("#8E5812"),
  fenceNight: hexToU32("#222749"),
  fenceNightShade: hexToU32("#141835"),

  mailboxDay: hexToU32("#5B688A"),
  mailboxDayDark: hexToU32("#3D4663"),
  mailboxNight: hexToU32("#1F2445"),
  mailboxNightDark: hexToU32("#121530"),

  // Tree & Bushes
  treeDay0: hexToU32("#97AC5B"),
  treeDay1: hexToU32("#6C8239"),
  treeDay2: hexToU32("#4E6322"),
  treeDay3: hexToU32("#344615"),
  trunkDay: hexToU32("#9E6E24"),
  trunkDayDark: hexToU32("#6E4A14"),

  treeAutumn0: hexToU32("#E28B24"),
  treeAutumn1: hexToU32("#BE6816"),
  treeAutumn2: hexToU32("#8A4812"),
  treeAutumnShade: hexToU32("#4E5F21"),
  trunkDusk: hexToU32("#845718"),
  trunkDuskDark: hexToU32("#58380D"),

  treeDawn0: hexToU32("#363E62"),
  treeDawn1: hexToU32("#282F50"),
  treeDawn2: hexToU32("#1B2140"),
  treeDawn3: hexToU32("#131734"),

  treeNight0: hexToU32("#1F244A"),
  treeNight1: hexToU32("#161A3B"),
  treeNight2: hexToU32("#0F1230"),
  treeNight3: hexToU32("#090B24"),
  trunkNight: hexToU32("#131636"),
  trunkNightDark: hexToU32("#0B0D26"),

  // Character
  charHair: hexToU32("#171A2E"),
  charSkin: hexToU32("#F5D8B8"),
  charSkinShade: hexToU32("#D9B28C"),
  charShirt: hexToU32("#CC8A26"),
  charShirtShade: hexToU32("#966114"),
  charPants: hexToU32("#2E385C"),
  laptopWhite: hexToU32("#F5F2E8"),
  laptopShade: hexToU32("#B6BAC4"),
  emoteWhite: hexToU32("#FFFFFF"),
  emoteDark: hexToU32("#181C34"),
} as const;
