import { bayerDissolveBuffers, ditherPick } from "./dither";
import { clamp01, lerp, lerpU32, SCENE_COLORS, smoothstep } from "./palette";
import {
  CLOUDS,
  drawCharacter,
  drawCloud,
  drawDitherCircle,
  drawExclamation,
  drawWindowPeekCharacter,
  fillCircle,
  fillRect,
  FLOWERS,
  hash2D,
  SCENE_H,
  SCENE_W,
  setPx,
  STARS,
  TREE_AUTUMN_MASK,
  TREE_MASK,
} from "./sprites";

export type TransitionDirection = "to-night" | "to-day";

export interface SceneState {
  readonly p: number;
  readonly t: number;
  readonly direction: TransitionDirection;
  readonly isDragging: boolean;
  readonly velocity: number;
  readonly settleTime: number;
  readonly reducedMotion: boolean;
}

type SceneVariant = "day" | "dusk" | "dawn" | "night";

interface SkyBand {
  readonly yStart: number;
  readonly color: number;
  readonly ditherRows: number;
}

/**
 * Shared window-glow curve so the scene window, pill shell amber bleed, and lens rim bounce stay synced.
 */
export function computeWindowGlow(p: number, direction: TransitionDirection): number {
  if (direction === "to-day") {
    // On night -> day, window light dithers out FIRST (frames 498-504)
    return smoothstep(0.76, 0.96, p);
  }
  // On day -> night, window light turns on as dusk yields to night
  return smoothstep(0.56, 0.9, p);
}

export class SceneRenderer {
  public readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly imageData: ImageData;
  private readonly imageU32: Uint32Array;

  private readonly bufA = new Uint32Array(SCENE_W * SCENE_H);
  private readonly bufB = new Uint32Array(SCENE_W * SCENE_H);
  public readonly output = new Uint32Array(SCENE_W * SCENE_H);

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = SCENE_W;
    this.canvas.height = SCENE_H;
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Could not create 2D context for scene renderer");
    }
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.imageData = ctx.createImageData(SCENE_W, SCENE_H);
    this.imageU32 = new Uint32Array(this.imageData.data.buffer);
  }

  public render(state: SceneState): Uint32Array {
    const p = clamp01(state.p);

    if (state.reducedMotion) {
      this.renderVariant(this.bufA, "day", state);
      this.renderVariant(this.bufB, "night", state);
      const len = this.output.length;
      for (let i = 0; i < len; i++) {
        this.output[i] = lerpU32(this.bufA[i] ?? 0, this.bufB[i] ?? 0, p);
      }
    } else if (state.direction === "to-night") {
      if (p <= 0.14) {
        this.renderVariant(this.output, "day", state);
      } else if (p < 0.5) {
        const localT = smoothstep(0.14, 0.5, p);
        this.renderVariant(this.bufA, "day", state);
        this.renderVariant(this.bufB, "dusk", state);
        bayerDissolveBuffers(this.bufA, this.bufB, this.output, SCENE_W, SCENE_H, localT);
      } else if (p <= 0.58) {
        this.renderVariant(this.output, "dusk", state);
      } else if (p < 0.92) {
        const localT = smoothstep(0.58, 0.92, p);
        this.renderVariant(this.bufA, "dusk", state);
        this.renderVariant(this.bufB, "night", state);
        bayerDissolveBuffers(this.bufA, this.bufB, this.output, SCENE_W, SCENE_H, localT);
      } else {
        this.renderVariant(this.output, "night", state);
      }
    } else {
      // direction === "to-day": night -> dawn grey -> brief sunrise/dusk flash -> morning day
      if (p >= 0.78) {
        this.renderVariant(this.output, "night", state);
      } else if (p >= 0.36) {
        const localT = smoothstep(0.78, 0.36, p);
        this.renderVariant(this.bufA, "night", state);
        this.renderVariant(this.bufB, "dawn", state);
        bayerDissolveBuffers(this.bufA, this.bufB, this.output, SCENE_W, SCENE_H, localT);
      } else if (p >= 0.18) {
        const localT = smoothstep(0.36, 0.18, p);
        this.renderVariant(this.bufA, "dawn", state);
        this.renderVariant(this.bufB, "dusk", state);
        bayerDissolveBuffers(this.bufA, this.bufB, this.output, SCENE_W, SCENE_H, localT);
      } else if (p > 0.02) {
        const localT = smoothstep(0.18, 0.02, p);
        this.renderVariant(this.bufA, "dusk", state);
        this.renderVariant(this.bufB, "day", state);
        bayerDissolveBuffers(this.bufA, this.bufB, this.output, SCENE_W, SCENE_H, localT);
      } else {
        this.renderVariant(this.output, "day", state);
      }
    }

    this.imageU32.set(this.output);
    this.ctx.putImageData(this.imageData, 0, 0);
    return this.output;
  }

  private renderVariant(
    buf: Uint32Array,
    variant: SceneVariant,
    state: SceneState
  ): void {
    const p = clamp01(state.p);
    const t = state.t;

    // 1. Banded pixel sky
    this.drawSky(buf, variant);

    // 2. Stars (night + faint early stars in dawn)
    if (variant === "night" || variant === "dawn") {
      const starDensity =
        variant === "night"
          ? state.direction === "to-night"
            ? smoothstep(0.54, 0.94, p)
            : smoothstep(0.35, 0.75, p)
          : 0.28;
      this.drawStars(buf, t, starDensity);
    }

    // 3. Sun (day/dusk) or Moon (night/dawn)
    if (variant === "day" || variant === "dusk") {
      this.drawSun(buf, variant, state);
    }
    if (variant === "night" || variant === "dawn") {
      this.drawMoon(buf, state);
    }

    // 4. Drifting clouds (~1 art px every 3 s)
    this.drawClouds(buf, variant, t);

    // 5. Distant hills
    this.drawHills(buf, variant);

    // 6. Ground, grass, winding path & swaying wildflowers
    this.drawGroundAndFlowers(buf, variant, t);

    // 7. House (roof, clapboard, shutters, window, door, chimney)
    const windowGlow = computeWindowGlow(p, state.direction);
    this.drawHouse(buf, variant, state, windowGlow);

    // 8. Mailbox & picket fence
    this.drawFenceAndMailbox(buf, variant);

    // 9. Bushes & big multi-lobed tree
    this.drawBushesAndTree(buf, variant, p);

    // 10. Tiny character choreography
    this.drawSceneCharacter(buf, variant, state);

    // 11. Night window glow spill + warm dithered ground light pool
    if (variant === "night" && windowGlow > 0.02) {
      this.drawWindowLightPool(buf, windowGlow, t);
    }
  }

  private drawSky(buf: Uint32Array, variant: SceneVariant): void {
    let bands: readonly SkyBand[];
    if (variant === "day") {
      bands = [
        { yStart: 0, color: SCENE_COLORS.daySky0, ditherRows: 6 },
        { yStart: 9, color: SCENE_COLORS.daySky1, ditherRows: 6 },
        { yStart: 24, color: SCENE_COLORS.daySky2, ditherRows: 6 },
        { yStart: 42, color: SCENE_COLORS.daySky3, ditherRows: 6 },
      ];
    } else if (variant === "dusk") {
      bands = [
        { yStart: 0, color: SCENE_COLORS.duskSky0, ditherRows: 6 },
        { yStart: 10, color: SCENE_COLORS.duskSky1, ditherRows: 6 },
        { yStart: 31, color: SCENE_COLORS.duskBandTop, ditherRows: 6 },
        { yStart: 46, color: SCENE_COLORS.duskBandBot, ditherRows: 6 },
        { yStart: 59, color: SCENE_COLORS.duskHorizon, ditherRows: 5 },
      ];
    } else if (variant === "dawn") {
      bands = [
        { yStart: 0, color: SCENE_COLORS.dawnSky0, ditherRows: 6 },
        { yStart: 13, color: SCENE_COLORS.dawnSky1, ditherRows: 6 },
        { yStart: 32, color: SCENE_COLORS.dawnSky2, ditherRows: 6 },
        { yStart: 50, color: SCENE_COLORS.dawnSky3, ditherRows: 6 },
      ];
    } else {
      bands = [
        { yStart: 0, color: SCENE_COLORS.nightSky0, ditherRows: 6 },
        { yStart: 18, color: SCENE_COLORS.nightSky1, ditherRows: 6 },
      ];
    }

    for (let y = 0; y < 70; y++) {
      let bandIdx = 0;
      for (let b = 1; b < bands.length; b++) {
        if (y >= bands[b]!.yStart) bandIdx = b;
      }
      const curBand = bands[bandIdx]!;
      const prevBand = bandIdx > 0 ? bands[bandIdx - 1]! : curBand;
      const distIntoBand = y - curBand.yStart;
      const rowOff = y * SCENE_W;

      if (bandIdx > 0 && distIntoBand < curBand.ditherRows) {
        const ratio = (distIntoBand + 0.5) / curBand.ditherRows;
        for (let x = 0; x < SCENE_W; x++) {
          buf[rowOff + x] = ditherPick(ratio, x, y) ? curBand.color : prevBand.color;
        }
      } else {
        for (let x = 0; x < SCENE_W; x++) {
          buf[rowOff + x] = curBand.color;
        }
      }
    }
  }

  private drawStars(buf: Uint32Array, t: number, density: number): void {
    for (let i = 0; i < STARS.length; i++) {
      const s = STARS[i]!;
      // Stagger star emergence deterministically as night settles
      const appearThreshold = ((i * 7) % STARS.length) / STARS.length;
      if (density < appearThreshold * 0.85) continue;

      const twinkle = 0.5 + 0.5 * Math.sin(t * 2.4 + s.phase);
      const col =
        s.bright && twinkle > 0.35 ? SCENE_COLORS.starBright : SCENE_COLORS.starSoft;

      if (s.isCross && twinkle > 0.65 && density > 0.72) {
        setPx(buf, s.x, s.y, SCENE_COLORS.starBright);
        setPx(buf, s.x - 1, s.y, SCENE_COLORS.starSoft);
        setPx(buf, s.x + 1, s.y, SCENE_COLORS.starSoft);
        setPx(buf, s.x, s.y - 1, SCENE_COLORS.starSoft);
        setPx(buf, s.x, s.y + 1, SCENE_COLORS.starSoft);
      } else if (twinkle > 0.14) {
        setPx(buf, s.x, s.y, col);
      }
    }
  }

  private drawSun(buf: Uint32Array, variant: SceneVariant, state: SceneState): void {
    const p = clamp01(state.p);
    let sx = 73;
    let sy = 12;

    if (state.direction === "to-night") {
      // Sun arcs smoothly right and downward toward dusk horizon
      const slide = smoothstep(0.02, 0.56, p);
      sx = 73 + slide * 83;
      sy = 12 + slide * 29;
    } else {
      // Returning to day: rises on left sky then gently ascends to noon
      const riseT = p < 0.03 ? smoothstep(0, 2.6, state.settleTime) : 0;
      const arcStart = smoothstep(0.32, 0.02, p);
      sx = lerp(26, 73, riseT);
      sy = lerp(36 - arcStart * 5, 12, riseT);
    }

    const pulse = 0.85 + 0.15 * Math.sin(state.t * 2.1);
    const haloColor =
      variant === "dusk" ? SCENE_COLORS.duskBandBot : SCENE_COLORS.sunHalo;
    drawDitherCircle(buf, sx, sy, 3.8, 7.6 * pulse, haloColor, 0.78);
    fillCircle(buf, sx, sy, 4.1, SCENE_COLORS.sunEdge);
    fillCircle(buf, sx, sy, 3.1, SCENE_COLORS.sunCore);
  }

  private drawMoon(buf: Uint32Array, state: SceneState): void {
    const p = clamp01(state.p);
    let mx = 40;
    let my = 23;

    if (state.direction === "to-night") {
      const rise = smoothstep(0.46, 0.94, p);
      mx = lerp(17, 40, rise);
      my = lerp(44, 23, rise);
    } else {
      // Night -> day: moon arcs up toward top-center and glides off top-right
      const exit = smoothstep(0.98, 0.56, p);
      mx = lerp(40, 174, exit);
      my = 23 - Math.sin(exit * Math.PI) * 21 + exit * 12;
    }

    if (mx < -8 || mx > SCENE_W + 8 || my < -8) return;

    drawDitherCircle(buf, mx, my, 4.3, 8.2, SCENE_COLORS.moonHalo, 0.65);
    fillCircle(buf, mx, my, 4.6, SCENE_COLORS.moonCore);
    // Subtle pixel craters matching key_frames/05_night_idle
    setPx(buf, Math.round(mx - 2), Math.round(my - 1), SCENE_COLORS.moonCrater);
    setPx(buf, Math.round(mx - 1), Math.round(my - 1), SCENE_COLORS.moonCrater);
    setPx(buf, Math.round(mx + 1), Math.round(my + 2), SCENE_COLORS.moonCrater);
    setPx(buf, Math.round(mx + 2), Math.round(my), SCENE_COLORS.moonCrater);
  }

  private drawClouds(buf: Uint32Array, variant: SceneVariant, t: number): void {
    const main =
      variant === "day"
        ? SCENE_COLORS.dayCloudMain
        : variant === "dusk"
          ? SCENE_COLORS.duskCloudMain
          : variant === "dawn"
            ? SCENE_COLORS.dawnCloudMain
            : SCENE_COLORS.nightCloudMain;
    const shade =
      variant === "day"
        ? SCENE_COLORS.dayCloudShade
        : variant === "dusk"
          ? SCENE_COLORS.duskCloudShade
          : variant === "dawn"
            ? SCENE_COLORS.dawnCloudShade
            : SCENE_COLORS.nightCloudShade;

    for (const c of CLOUDS) {
      drawCloud(buf, c, t * c.speed, main, shade);
    }
  }

  private drawHills(buf: Uint32Array, variant: SceneVariant): void {
    const light =
      variant === "day"
        ? SCENE_COLORS.dayHillLight
        : variant === "dusk"
          ? SCENE_COLORS.duskHillLight
          : variant === "dawn"
            ? SCENE_COLORS.dawnHillLight
            : SCENE_COLORS.nightHillLight;
    const dark =
      variant === "day"
        ? SCENE_COLORS.dayHillDark
        : variant === "dusk"
          ? SCENE_COLORS.duskHillDark
          : variant === "dawn"
            ? SCENE_COLORS.dawnHillDark
            : SCENE_COLORS.nightHillDark;

    for (let x = 0; x < SCENE_W; x++) {
      const hillTop = Math.round(
        59 + Math.sin(x * 0.045) * 3.0 + Math.cos(x * 0.11 + 1.2) * 1.6
      );
      const ridgeY = Math.round(63 + Math.sin(x * 0.065 + 2.0) * 2.2);
      for (let y = hillTop; y < 70; y++) {
        if (y === hillTop && ditherPick(0.55, x, y)) continue;
        setPx(buf, x, y, y >= ridgeY ? dark : light);
      }
    }
  }

  private drawGroundAndFlowers(
    buf: Uint32Array,
    variant: SceneVariant,
    t: number
  ): void {
    const gTop =
      variant === "day"
        ? SCENE_COLORS.dayGrassTop
        : variant === "dusk"
          ? SCENE_COLORS.duskGrassTop
          : variant === "dawn"
            ? SCENE_COLORS.dawnGrassTop
            : SCENE_COLORS.nightGrassTop;
    const gMid =
      variant === "day"
        ? SCENE_COLORS.dayGrassMid
        : variant === "dusk"
          ? SCENE_COLORS.duskGrassMid
          : variant === "dawn"
            ? SCENE_COLORS.dawnGrassMid
            : SCENE_COLORS.nightGrassMid;
    const gDark =
      variant === "day"
        ? SCENE_COLORS.dayGrassDark
        : variant === "dusk"
          ? SCENE_COLORS.duskGrassDark
          : variant === "dawn"
            ? SCENE_COLORS.dawnGrassDark
            : SCENE_COLORS.nightGrassDark;
    const gShadow =
      variant === "day"
        ? SCENE_COLORS.dayGrassShadow
        : variant === "dusk"
          ? SCENE_COLORS.duskGrassShadow
          : variant === "dawn"
            ? SCENE_COLORS.dawnGrassShadow
            : SCENE_COLORS.nightGrassShadow;
    const pLight =
      variant === "day"
        ? SCENE_COLORS.dayPathLight
        : variant === "dusk"
          ? SCENE_COLORS.duskPathLight
          : variant === "dawn"
            ? SCENE_COLORS.dawnPathLight
            : SCENE_COLORS.nightPathLight;
    const pDark =
      variant === "day"
        ? SCENE_COLORS.dayPathDark
        : variant === "dusk"
          ? SCENE_COLORS.duskPathDark
          : variant === "dawn"
            ? SCENE_COLORS.dawnPathDark
            : SCENE_COLORS.nightPathDark;

    for (let x = 0; x < SCENE_W; x++) {
      const grassHorizon = Math.round(67 + Math.sin(x * 0.055) * 1.4);
      for (let y = grassHorizon; y < SCENE_H; y++) {
        const depth = y - grassHorizon;
        const n = hash2D(x, y);
        let col = gMid;
        if (depth < 3) {
          col = n > 0.45 ? gTop : gMid;
        } else if (depth < 9) {
          col = n > 0.65 ? gTop : n > 0.25 ? gMid : gDark;
        } else if (depth < 16) {
          col = n > 0.68 ? gMid : n > 0.22 ? gDark : gShadow;
        } else {
          col = n > 0.55 ? gDark : gShadow;
        }
        // Subtle shade under the house and tree trunk
        if ((x >= 36 && x <= 74 && y <= 73) || (x >= 118 && x <= 142 && y <= 75)) {
          if (n > 0.35) col = gDark;
        }
        setPx(buf, x, y, col);
      }
    }

    // Winding dirt path from door (64, 70) -> right along fence (95, 76) -> lower-right exit (114, 90)
    for (let y = 69; y < SCENE_H; y++) {
      const progress = (y - 69) / (SCENE_H - 69);
      const center =
        y < 76
          ? lerp(65, 92, (y - 69) / 7)
          : lerp(92, 114, (y - 76) / (SCENE_H - 76));
      const halfWidth = 4.2 + progress * 4.4;
      for (let x = Math.floor(center - halfWidth - 1); x <= Math.ceil(center + halfWidth + 1); x++) {
        const d = Math.abs(x - center);
        if (d <= halfWidth) {
          const edgeFade = 1 - Math.max(0, (d - (halfWidth - 1.5)) / 1.5);
          if (edgeFade >= 1 || ditherPick(edgeFade, x, y)) {
            const speck = hash2D(x * 3, y * 5);
            setPx(buf, x, y, speck > 0.38 ? pLight : pDark);
          }
        }
      }
    }

    // Wildflowers swaying gently
    for (const f of FLOWERS) {
      const sway = Math.round(Math.sin(t * 1.6 + f.phase) * 0.6);
      const fx = f.x + sway;
      let fCol: number;
      if (variant === "night" || variant === "dawn") {
        fCol = SCENE_COLORS.flowerNightDim;
      } else if (f.kind === 0) {
        fCol = variant === "dusk" ? SCENE_COLORS.flowerDuskWhite : SCENE_COLORS.flowerWhite;
      } else if (f.kind === 1) {
        fCol = SCENE_COLORS.flowerYellow;
      } else {
        fCol = SCENE_COLORS.flowerOrange;
      }
      setPx(buf, fx, f.y, fCol);
      if (f.kind === 0) setPx(buf, fx, f.y + 1, gDark);
    }
  }

  private drawHouse(
    buf: Uint32Array,
    variant: SceneVariant,
    state: SceneState,
    windowGlow: number
  ): void {
    const isDark = variant === "night" || variant === "dawn";

    const roofDark = isDark ? SCENE_COLORS.roofDarkNight : SCENE_COLORS.roofDarkDay;
    const roofMid = isDark ? SCENE_COLORS.roofMidNight : SCENE_COLORS.roofMidDay;
    const roofEave = isDark ? SCENE_COLORS.roofEaveNight : SCENE_COLORS.roofEaveDay;

    const wallLight =
      variant === "day"
        ? SCENE_COLORS.wallDayLight
        : variant === "dusk"
          ? SCENE_COLORS.wallDuskLight
          : variant === "dawn"
            ? SCENE_COLORS.wallDawnLight
            : SCENE_COLORS.wallNightLight;
    const wallShade =
      variant === "day"
        ? SCENE_COLORS.wallDayShade
        : variant === "dusk"
          ? SCENE_COLORS.wallDuskShade
          : variant === "dawn"
            ? SCENE_COLORS.wallDawnShade
            : SCENE_COLORS.wallNightShade;

    const shutterCol =
      variant === "day"
        ? SCENE_COLORS.shutterDay
        : variant === "dusk"
          ? SCENE_COLORS.shutterDusk
          : SCENE_COLORS.shutterNight;
    const shutterDark =
      variant === "day"
        ? SCENE_COLORS.shutterDayDark
        : variant === "dusk"
          ? SCENE_COLORS.shutterDuskDark
          : SCENE_COLORS.shutterNightDark;

    // Chimney on upper-right slope
    fillRect(buf, 64, 22, 5, 7, roofDark);
    fillRect(buf, 63, 22, 7, 1, roofMid);

    // Subtle animated smoke wisps in night / dusk
    if (variant === "night" || variant === "dusk") {
      const sOff = Math.floor(state.t * 1.4) % 4;
      setPx(buf, 66, 20 - sOff, roofMid);
      setPx(buf, 67, 18 - sOff, roofMid);
    }

    // Trapezoid shingle roof (y = 28..43)
    for (let y = 28; y <= 43; y++) {
      const k = (y - 28) / 15;
      const xL = Math.round(lerp(46, 34, k));
      const xR = Math.round(lerp(68, 78, k));
      const isHighlightRow = (y - 28) % 3 === 0;
      for (let x = xL; x <= xR; x++) {
        let col = roofDark;
        if (y >= 42) col = roofEave;
        else if (isHighlightRow && (x + y) % 5 !== 0) col = roofMid;
        setPx(buf, x, y, col);
      }
    }

    // Clapboard walls (x = 39..71, y = 44..68)
    for (let y = 44; y <= 68; y++) {
      const isLine = y % 2 === 1;
      for (let x = 39; x <= 71; x++) {
        let col = isLine || y === 44 ? wallShade : wallLight;
        // Subtle eaves shadow
        if (y === 44) col = roofEave;
        setPx(buf, x, y, col);
      }
    }

    // Foundation stone sill
    fillRect(buf, 39, 69, 33, 1, roofMid);
    fillRect(buf, 38, 70, 34, 1, roofEave);

    // Louvered Shutters flanking the window
    for (let y = 48; y <= 57; y++) {
      const col = y % 2 === 0 ? shutterCol : shutterDark;
      fillRect(buf, 42, y, 3, 1, col);
      fillRect(buf, 56, y, 3, 1, col);
    }

    // Window frame & glass (x = 45..55, y = 48..57)
    const frameCol = isDark ? SCENE_COLORS.doorNightFrame : SCENE_COLORS.windowDayFrame;
    fillRect(buf, 45, 48, 11, 10, frameCol);

    if (variant === "night" && windowGlow > 0.04) {
      // Glowing warm interior window with cozy lampshade cone & subtle flicker
      const glassFill = windowGlow >= 0.96 ? 1 : windowGlow;
      const warmthShift = 0.94 + 0.06 * Math.sin(state.t * 6.8);
      for (let wy = 49; wy <= 56; wy++) {
        for (let wx = 46; wx <= 54; wx++) {
          if (ditherPick(glassFill, wx, wy)) {
            const dx = Math.abs(wx - 50);
            const isLampCone = wy >= 51 && wy <= 54 && dx <= wy - 51;
            let wCol: number = SCENE_COLORS.windowLitMain;
            if (isLampCone || (wx === 50 && wy === 52)) {
              wCol = SCENE_COLORS.windowLitCore;
            } else if (wx === 50 && wy <= 50) {
              wCol = SCENE_COLORS.windowLitEdge;
            } else if (wy === 56 && wx >= 48 && wx <= 52) {
              wCol = SCENE_COLORS.windowLitEdge;
            } else if (wy === 49 || wx === 46 || wx === 54 || warmthShift < 0.92) {
              wCol = SCENE_COLORS.windowLitWarm;
            }
            setPx(buf, wx, wy, wCol);
          } else {
            setPx(buf, wx, wy, SCENE_COLORS.windowDayGlass);
          }
        }
      }
    } else if (
      variant === "day" &&
      state.direction === "to-day" &&
      state.p < 0.04 &&
      state.settleTime < 0.85
    ) {
      // Morning character peeking out window right after night -> day return (11_day_idle_return)
      drawWindowPeekCharacter(buf, 45, 48);
    } else if (variant === "dusk") {
      // Warm amber sunset reflection inside window
      fillRect(buf, 46, 49, 9, 8, SCENE_COLORS.duskBandTop);
      for (let i = 0; i < 4; i++) {
        setPx(buf, 47 + i, 54 - i, SCENE_COLORS.duskBandBot);
      }
      // Subtle mullion cross
      fillRect(buf, 50, 49, 1, 8, frameCol);
      fillRect(buf, 46, 52, 9, 1, frameCol);
    } else {
      // Day or unlit dawn/night glass with diagonal specular streaks
      fillRect(buf, 46, 49, 9, 8, SCENE_COLORS.windowDayGlass);
      if (!isDark) {
        setPx(buf, 48, 51, SCENE_COLORS.windowDayGlint);
        setPx(buf, 49, 50, SCENE_COLORS.windowDayGlint);
        setPx(buf, 49, 54, SCENE_COLORS.windowDayGlint);
        setPx(buf, 50, 53, SCENE_COLORS.windowDayGlint);
        setPx(buf, 51, 52, SCENE_COLORS.windowDayGlint);
        setPx(buf, 52, 51, SCENE_COLORS.windowDayGlint);
      }
    }

    // Window flowerbox
    fillRect(buf, 44, 58, 13, 2, shutterCol);
    fillRect(buf, 45, 59, 11, 1, shutterDark);
    if (!isDark) {
      setPx(buf, 47, 57, SCENE_COLORS.treeDay2);
      setPx(buf, 50, 57, SCENE_COLORS.flowerYellow);
      setPx(buf, 53, 57, SCENE_COLORS.treeDay2);
    }

    // Door (x = 61..68, y = 49..68)
    const doorFrame = isDark ? SCENE_COLORS.doorNightFrame : SCENE_COLORS.doorDayFrame;
    const doorWood = isDark ? SCENE_COLORS.doorNightWood : SCENE_COLORS.doorDayWood;
    const doorDark = isDark ? SCENE_COLORS.doorNightDark : SCENE_COLORS.doorDayDark;

    fillRect(buf, 61, 49, 8, 20, doorFrame);
    fillRect(buf, 62, 50, 6, 19, doorWood);
    fillRect(buf, 64, 50, 1, 19, doorDark);
    fillRect(buf, 66, 50, 1, 19, doorDark);
    // Small top panes & brass knob
    fillRect(buf, 63, 51, 2, 2, isDark ? SCENE_COLORS.nightSky1 : SCENE_COLORS.windowDayGlass);
    fillRect(buf, 66, 51, 1, 2, isDark ? SCENE_COLORS.nightSky1 : SCENE_COLORS.windowDayGlass);
    setPx(buf, 67, 59, SCENE_COLORS.doorKnob);

    // Porch lantern / sconce left of door (x = 59..60, y = 50..52)
    fillRect(buf, 59, 50, 2, 2, roofDark);
    if (variant === "night" && windowGlow > 0.1) {
      setPx(buf, 59, 51, SCENE_COLORS.windowLitCore);
      setPx(buf, 60, 51, SCENE_COLORS.windowLitWarm);
    }
  }

  private drawFenceAndMailbox(buf: Uint32Array, variant: SceneVariant): void {
    const mbMain =
      variant === "night" || variant === "dawn"
        ? SCENE_COLORS.mailboxNight
        : SCENE_COLORS.mailboxDay;
    const mbDark =
      variant === "night" || variant === "dawn"
        ? SCENE_COLORS.mailboxNightDark
        : SCENE_COLORS.mailboxDayDark;

    // Mailbox at x = 73..76, y = 63..72
    fillRect(buf, 74, 66, 1, 7, mbDark);
    fillRect(buf, 73, 63, 4, 3, mbMain);
    setPx(buf, 73, 63, mbDark);
    setPx(buf, 76, 65, mbDark);

    const fenceMain =
      variant === "day"
        ? SCENE_COLORS.fenceDay
        : variant === "dusk"
          ? SCENE_COLORS.fenceDusk
          : SCENE_COLORS.fenceNight;
    const fenceShade =
      variant === "day"
        ? SCENE_COLORS.fenceDayShade
        : variant === "dusk"
          ? SCENE_COLORS.fenceDuskShade
          : SCENE_COLORS.fenceNightShade;

    // Horizontal rails (x = 77..106)
    fillRect(buf, 77, 63, 29, 1, fenceShade);
    fillRect(buf, 77, 67, 29, 1, fenceShade);

    // Vertical pointed pickets
    for (let px = 78; px <= 105; px += 3) {
      setPx(buf, px, 60, fenceMain);
      fillRect(buf, px, 61, 2, 8, fenceMain);
      fillRect(buf, px + 1, 62, 1, 7, fenceShade);
    }
  }

  private drawBushesAndTree(
    buf: Uint32Array,
    variant: SceneVariant,
    p: number
  ): void {
    const isNight = variant === "night";
    const isDawn = variant === "dawn";

    // Left bush (25, 67) & Right bush (151, 67)
    const bushLight = isNight
      ? SCENE_COLORS.treeNight1
      : isDawn
        ? SCENE_COLORS.treeDawn1
        : variant === "dusk"
          ? SCENE_COLORS.treeAutumn1
          : SCENE_COLORS.treeDay1;
    const bushDark = isNight
      ? SCENE_COLORS.treeNight3
      : isDawn
        ? SCENE_COLORS.treeDawn3
        : SCENE_COLORS.treeDay3;

    this.drawBushCluster(buf, 25, 67, 7, 5, bushLight, bushDark);
    this.drawBushCluster(buf, 151, 67, 9, 5.5, bushLight, bushDark);

    // Tree trunk (x = 128..135, y = 52..72)
    const trunkMain = isNight
      ? SCENE_COLORS.trunkNight
      : variant === "dusk"
        ? SCENE_COLORS.trunkDusk
        : isDawn
          ? SCENE_COLORS.treeDawn2
          : SCENE_COLORS.trunkDay;
    const trunkDark = isNight
      ? SCENE_COLORS.trunkNightDark
      : variant === "dusk"
        ? SCENE_COLORS.trunkDuskDark
        : isDawn
          ? SCENE_COLORS.treeDawn3
          : SCENE_COLORS.trunkDayDark;

    fillRect(buf, 129, 52, 5, 19, trunkMain);
    fillRect(buf, 132, 52, 2, 19, trunkDark);
    // Flared roots
    fillRect(buf, 127, 70, 9, 2, trunkMain);
    fillRect(buf, 126, 72, 11, 1, trunkDark);

    // Tree canopy using precomputed mask
    const autumnProgress = variant === "dusk" ? smoothstep(0.18, 0.52, p) : 0;

    for (let y = 12; y <= 57; y++) {
      const row = y * SCENE_W;
      for (let x = 95; x <= 158; x++) {
        const tone = TREE_MASK[row + x] ?? 0;
        if (tone === 0) continue;

        let col: number;
        if (isNight) {
          col =
            tone === 1
              ? SCENE_COLORS.treeNight0
              : tone === 2
                ? SCENE_COLORS.treeNight1
                : tone === 3
                  ? SCENE_COLORS.treeNight2
                  : SCENE_COLORS.treeNight3;
        } else if (isDawn) {
          col =
            tone === 1
              ? SCENE_COLORS.treeDawn0
              : tone === 2
                ? SCENE_COLORS.treeDawn1
                : tone === 3
                  ? SCENE_COLORS.treeDawn2
                  : SCENE_COLORS.treeDawn3;
        } else if (
          variant === "dusk" &&
          (TREE_AUTUMN_MASK[row + x] ?? 0) === 1 &&
          ditherPick(autumnProgress * 0.95, x, y)
        ) {
          col =
            tone === 1
              ? SCENE_COLORS.treeAutumn0
              : tone === 2
                ? SCENE_COLORS.treeAutumn1
                : SCENE_COLORS.treeAutumn2;
        } else {
          col =
            tone === 1
              ? SCENE_COLORS.treeDay0
              : tone === 2
                ? SCENE_COLORS.treeDay1
                : tone === 3
                  ? SCENE_COLORS.treeDay2
                  : SCENE_COLORS.treeDay3;
        }
        buf[row + x] = col;
      }
    }
  }

  private drawBushCluster(
    buf: Uint32Array,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    light: number,
    dark: number
  ): void {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const n = hash2D(x >> 1, y >> 1);
        if (dx * dx + dy * dy <= 1.0 + (n - 0.5) * 0.25) {
          const isLit = y < cy - 1 || (y <= cy + 1 && n > 0.4);
          setPx(buf, x, y, isLit ? light : dark);
        }
      }
    }
  }

  private drawSceneCharacter(
    buf: Uint32Array,
    variant: SceneVariant,
    state: SceneState
  ): void {
    const p = clamp01(state.p);

    // Night idle: character is inside house, except for brief lingering "!" right after fast click
    if (variant === "night") {
      if (state.direction === "to-night" && (p < 0.96 || state.settleTime < 0.28)) {
        drawCharacter(buf, 114, 62, "stand", 0.55);
        drawExclamation(buf, 117, 54, true);
      }
      return;
    }

    if (variant === "dawn") return;

    // Day settled return from night: walk back from door (64) to tree (114)
    if (
      variant === "day" &&
      state.direction === "to-day" &&
      p < 0.04 &&
      state.settleTime >= 0.85 &&
      state.settleTime < 2.2
    ) {
      const walkT = (state.settleTime - 0.85) / 1.35;
      const cx = Math.round(lerp(66, 114, walkT));
      const frame = Math.floor(state.t * 8) % 2 === 0 ? "walk0" : "walk1";
      drawCharacter(buf, cx, 62, frame, 0);
      return;
    }

    if (
      variant === "day" &&
      state.direction === "to-day" &&
      p < 0.04 &&
      state.settleTime < 0.85
    ) {
      // Currently peeking inside the window
      return;
    }

    // Active transition day -> dusk
    if (p > 0.04) {
      if (!state.isDragging && Math.abs(state.velocity) > 0.25) {
        // Fast click launch: character stands startled with "!" under tree
        drawCharacter(buf, 114, 62, "stand", variant === "dusk" ? 0.2 : 0);
        drawExclamation(buf, 117, 54, variant === "dusk" && p > 0.48);
      } else if (p < 0.78) {
        // Slow drag dusk scrub: character walks left along path toward house door (07_dusk_held_orange_band)
        const walkProgress = smoothstep(0.08, 0.72, p);
        const cx = Math.round(lerp(114, 68, walkProgress));
        const stepPhase = Math.floor(walkProgress * 10 + state.t * 4) % 2;
        drawCharacter(buf, cx, 62, stepPhase === 0 ? "walk0" : "walk1", 0);
      }
      return;
    }

    // Settled Day Idle: typing with laptop under the tree (~500ms 2-frame bob)
    const typingFrame = Math.floor(state.t * 2) % 2 === 0 ? "sit0" : "sit1";
    drawCharacter(buf, 113, 62, typingFrame, 0);
  }

  private drawWindowLightPool(
    buf: Uint32Array,
    windowGlow: number,
    t: number
  ): void {
    const flicker = 0.94 + 0.06 * Math.sin(t * 6.2);
    const strength = clamp01(windowGlow * flicker);

    // 1. Warm spill over left & right shutters and adjacent clapboard
    for (let y = 47; y <= 63; y++) {
      for (let x = 39; x <= 62; x++) {
        // Skip interior glass itself (already drawn bright)
        if (x >= 46 && x <= 54 && y >= 49 && y <= 56) continue;
        const dist = Math.hypot((x - 50) * 0.85, (y - 53) * 1.05);
        if (dist < 10.5) {
          const falloff = (1 - dist / 10.5) * strength * 0.85;
          if (ditherPick(falloff, x, y)) {
            setPx(
              buf,
              x,
              y,
              dist < 6.8 ? SCENE_COLORS.windowLitWarm : SCENE_COLORS.windowGlowGround
            );
          }
        }
      }
    }

    // 2. Elliptical golden light pool cast on the ground in front of the house (key_frames/05_night_idle)
    const poolCx = 50;
    const poolCy = 76;
    const poolRx = 23;
    const poolRy = 9.5;

    for (let y = 67; y <= 87; y++) {
      for (let x = 25; x <= 75; x++) {
        const dx = (x - poolCx) / poolRx;
        const dy = (y - poolCy) / poolRy;
        const r = Math.hypot(dx, dy);
        if (r <= 1.05) {
          const density = clamp01((1.05 - r) * 0.92) * strength;
          if (ditherPick(density, x, y)) {
            const col =
              r < 0.45
                ? SCENE_COLORS.windowGlowGroundBright
                : SCENE_COLORS.windowGlowGround;
            setPx(buf, x, y, col);
          }
        }
      }
    }
  }
}
