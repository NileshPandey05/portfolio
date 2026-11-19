import { clamp01, smoothstep } from "./palette";
import { computeWindowGlow, type TransitionDirection } from "./sceneRenderer";
import { SCENE_H, SCENE_W } from "./sprites";

export const LENS_WINDOW_W = 700;
export const LENS_WINDOW_H = 364;

// Half-res pixel pass (2x art grid resolution) for crisp curved pixel-art blocks at <0.25ms/frame
const REFRACT_W = 350;
const REFRACT_H = 182;

const REST_RADIUS_WIN = 172; // diameter 344px inside 700x364 window
const LENS_START_X_WIN = 175;
const LENS_TRAVEL_WIN = 350;
const LENS_CY_WIN = 182;

export interface LensRenderState {
  readonly p: number;
  readonly velocity: number;
  readonly direction: TransitionDirection;
  readonly t: number;
  readonly reducedMotion: boolean;
}

function traceCapsulePath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number
): void {
  const cap = Math.max(0, halfW - halfH);
  ctx.beginPath();
  if (cap <= 0.5) {
    ctx.arc(cx, cy, halfH, 0, Math.PI * 2);
  } else {
    ctx.moveTo(cx - cap, cy - halfH);
    ctx.lineTo(cx + cap, cy - halfH);
    ctx.arc(cx + cap, cy, halfH, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(cx - cap, cy + halfH);
    ctx.arc(cx - cap, cy, halfH, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.closePath();
  }
}

export class LensRenderer {
  public readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private readonly refractCanvas: HTMLCanvasElement;
  private readonly refractCtx: CanvasRenderingContext2D;
  private readonly refractImageData: ImageData;
  private readonly refractU32: Uint32Array;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = LENS_WINDOW_W;
    this.canvas.height = LENS_WINDOW_H;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create 2D context for lens canvas");
    }
    this.ctx = ctx;

    this.refractCanvas = document.createElement("canvas");
    this.refractCanvas.width = REFRACT_W;
    this.refractCanvas.height = REFRACT_H;
    const rCtx = this.refractCanvas.getContext("2d");
    if (!rCtx) {
      throw new Error("Could not create 2D context for offscreen lens buffer");
    }
    this.refractCtx = rCtx;
    this.refractImageData = rCtx.createImageData(REFRACT_W, REFRACT_H);
    this.refractU32 = new Uint32Array(this.refractImageData.data.buffer);
  }

  public render(scenePixels: Uint32Array, state: LensRenderState): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, LENS_WINDOW_W, LENS_WINDOW_H);

    // Allow slight elastic travel beyond [0, 1] during drag rubber-band
    const cxWin = LENS_START_X_WIN + state.p * LENS_TRAVEL_WIN;
    const cyWin = LENS_CY_WIN;

    // Velocity-based liquid capsule stretch (disabled for reduced-motion)
    const velMag = state.reducedMotion ? 0 : Math.abs(state.velocity);
    const stretch = Math.min(0.21, velMag * 0.048);
    const halfHWin = REST_RADIUS_WIN * (1 - stretch * 0.36);
    const halfWWin = REST_RADIUS_WIN * (1 + stretch);

    // 1. Soft ambient drop shadow cast by the glass lens onto the pixel world
    ctx.save();
    traceCapsulePath(ctx, cxWin + 2, cyWin + 6, halfWWin + 2, halfHWin + 2);
    const shadowGrad = ctx.createRadialGradient(
      cxWin + 2,
      cyWin + 6,
      halfHWin * 0.72,
      cxWin + 2,
      cyWin + 6,
      halfWWin + 12
    );
    const nightMix = smoothstep(0.45, 0.85, state.p);
    shadowGrad.addColorStop(0, `rgba(8, 10, 24, ${(0.22 + 0.16 * nightMix).toFixed(3)})`);
    shadowGrad.addColorStop(0.82, `rgba(8, 10, 24, ${(0.18 + 0.14 * nightMix).toFixed(3)})`);
    shadowGrad.addColorStop(1, "rgba(8, 10, 24, 0)");
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();

    // 2. Low-level fisheye / barrel refraction into 350x182 Uint32Array
    const halfHR = halfHWin * 0.5;
    const halfWR = halfWWin * 0.5;
    const cxR = cxWin * 0.5;
    const cyR = cyWin * 0.5;
    const capR = Math.max(0, halfWR - halfHR);

    const x0 = Math.max(0, Math.floor(cxR - halfWR - 2));
    const x1 = Math.min(REFRACT_W - 1, Math.ceil(cxR + halfWR + 2));
    const y0 = Math.max(0, Math.floor(cyR - halfHR - 2));
    const y1 = Math.min(REFRACT_H - 1, Math.ceil(cyR + halfHR + 2));

    // Only clear the dirty bounding area? Clearing full small array (63k ints) is <0.03ms.
    this.refractU32.fill(0);

    const smearArtX = state.reducedMotion
      ? 0
      : Math.max(-5, Math.min(5, -state.velocity * 1.15));

    for (let py = y0; py <= y1; py++) {
      const dy = py - cyR;
      const rowOff = py * REFRACT_W;
      for (let px = x0; px <= x1; px++) {
        const dx = px - cxR;
        const dxCap = Math.max(0, Math.abs(dx) - capR);
        const r = Math.hypot(dxCap, dy) / halfHR;
        if (r > 1.015) continue;

        const rClamped = r > 1 ? 1 : r;
        const alpha = r > 0.985 ? Math.max(0, Math.round(((1.015 - r) / 0.03) * 255)) : 255;
        if (alpha <= 0) continue;

        // Convex barrel magnification: ~1.28x center magnification, squashed rim compression
        const rSq = rClamped * rClamped;
        const sampleScale = 0.77 + 0.36 * rSq * Math.sqrt(rClamped);

        // Convert refract coords (0.5x window) -> art scene coords (0.25x window = 0.5x refract)
        const artCx = cxR * 0.5;
        const artCy = cyR * 0.5;
        const artDx = dx * 0.5;
        const artDy = dy * 0.5;

        const baseArtX = artCx + artDx * sampleScale + smearArtX * (1 - 0.3 * rClamped);
        const baseArtY = artCy + artDy * sampleScale;

        // Subtle chromatic dispersion near outer lens edge (r > 0.64)
        const edge = rClamped > 0.64 ? (rClamped - 0.64) / 0.36 : 0;
        if (edge > 0.02) {
          const disp = edge * edge * 0.038;
          const rX = Math.max(
            0,
            Math.min(SCENE_W - 1, Math.round(artCx + artDx * (sampleScale + disp) + smearArtX))
          );
          const rY = Math.max(
            0,
            Math.min(SCENE_H - 1, Math.round(artCy + artDy * (sampleScale + disp)))
          );
          const gX = Math.max(0, Math.min(SCENE_W - 1, Math.round(baseArtX)));
          const gY = Math.max(0, Math.min(SCENE_H - 1, Math.round(baseArtY)));
          const bX = Math.max(
            0,
            Math.min(SCENE_W - 1, Math.round(artCx + artDx * (sampleScale - disp) + smearArtX))
          );
          const bY = Math.max(
            0,
            Math.min(SCENE_H - 1, Math.round(artCy + artDy * (sampleScale - disp)))
          );

          const pR = scenePixels[rY * SCENE_W + rX] ?? 0;
          const pG = scenePixels[gY * SCENE_W + gX] ?? 0;
          const pB = scenePixels[bY * SCENE_W + bX] ?? 0;

          const rCh = pR & 0xff;
          const gCh = (pG >>> 8) & 0xff;
          const bCh = (pB >>> 16) & 0xff;

          this.refractU32[rowOff + px] =
            ((alpha << 24) | (bCh << 16) | (gCh << 8) | rCh) >>> 0;
        } else {
          const sx = Math.max(0, Math.min(SCENE_W - 1, Math.round(baseArtX)));
          const sy = Math.max(0, Math.min(SCENE_H - 1, Math.round(baseArtY)));
          const col = scenePixels[sy * SCENE_W + sx] ?? 0;
          this.refractU32[rowOff + px] = ((alpha << 24) | (col & 0x00ffffff)) >>> 0;
        }
      }
    }

    this.refractCtx.putImageData(this.refractImageData, 0, 0);

    // 3. Draw refracted scene + glass optics clipped cleanly to the capsule silhouette
    ctx.save();
    traceCapsulePath(ctx, cxWin, cyWin, halfWWin, halfHWin);
    ctx.clip();

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      this.refractCanvas,
      0,
      0,
      REFRACT_W,
      REFRACT_H,
      0,
      0,
      LENS_WINDOW_W,
      LENS_WINDOW_H
    );

    // 4. Fresnel inner rim darkening + dome depth
    const rimShade = ctx.createRadialGradient(
      cxWin - halfWWin * 0.18,
      cyWin - halfHWin * 0.22,
      halfHWin * 0.35,
      cxWin,
      cyWin,
      halfWWin * 1.02
    );
    rimShade.addColorStop(0, "rgba(255, 255, 255, 0)");
    rimShade.addColorStop(0.68, `rgba(20, 26, 48, ${(0.04 + 0.1 * nightMix).toFixed(3)})`);
    rimShade.addColorStop(0.92, `rgba(12, 16, 36, ${(0.22 + 0.16 * nightMix).toFixed(3)})`);
    rimShade.addColorStop(1, `rgba(6, 8, 22, ${(0.34 + 0.2 * nightMix).toFixed(3)})`);
    ctx.fillStyle = rimShade;
    ctx.fillRect(
      cxWin - halfWWin - 4,
      cyWin - halfHWin - 4,
      halfWWin * 2 + 8,
      halfHWin * 2 + 8
    );

    // 5. Large soft upper-left specular dome reflection
    const specAlpha = 0.44 * (1 - nightMix * 0.55);
    const specGrad = ctx.createRadialGradient(
      cxWin - halfWWin * 0.32,
      cyWin - halfHWin * 0.54,
      4,
      cxWin - halfWWin * 0.24,
      cyWin - halfHWin * 0.45,
      halfHWin * 0.72
    );
    specGrad.addColorStop(0, `rgba(255, 255, 255, ${specAlpha.toFixed(3)})`);
    specGrad.addColorStop(0.45, `rgba(255, 255, 255, ${(specAlpha * 0.35).toFixed(3)})`);
    specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = specGrad;
    ctx.fillRect(
      cxWin - halfWWin - 4,
      cyWin - halfHWin - 4,
      halfWWin * 2 + 8,
      halfHWin * 2 + 8
    );

    // 6. Crisp curved crescent specular highlight near top-left rim (matches 01_day_idle.jpg)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      cxWin - halfWWin * 0.24,
      cyWin - halfHWin * 0.62,
      halfWWin * 0.42,
      halfHWin * 0.15,
      -0.24,
      Math.PI * 1.08,
      Math.PI * 1.92
    );
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.62 * (1 - nightMix * 0.58)).toFixed(3)})`;
    ctx.lineWidth = 6.5;
    ctx.lineCap = "round";
    ctx.stroke();

    // Subtle secondary top highlight strip
    ctx.beginPath();
    ctx.ellipse(
      cxWin + halfWWin * 0.08,
      cyWin - halfHWin * 0.88,
      halfWWin * 0.34,
      halfHWin * 0.06,
      0.08,
      Math.PI * 1.1,
      Math.PI * 1.9
    );
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.42 * (1 - nightMix * 0.48)).toFixed(3)})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();

    // 7. Faint cyan / pink chromatic rim fringe (screen blend)
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    traceCapsulePath(ctx, cxWin - 1.2, cyWin - 0.8, halfWWin - 1, halfHWin - 1);
    ctx.strokeStyle = `rgba(120, 220, 255, ${(0.16 * (1 - nightMix * 0.4)).toFixed(3)})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    traceCapsulePath(ctx, cxWin + 1.2, cyWin + 0.8, halfWWin - 1, halfHWin - 1);
    ctx.strokeStyle = `rgba(255, 165, 210, ${(0.14 * (1 - nightMix * 0.4)).toFixed(3)})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();

    // 8. Night warm amber side-rim light facing the lit house window (left edge of right lens)
    const windowGlow = computeWindowGlow(state.p, state.direction);
    const amberRimStrength = windowGlow * smoothstep(0.32, 0.88, state.p);
    if (amberRimStrength > 0.01) {
      const amberGrad = ctx.createRadialGradient(
        cxWin - halfWWin * 0.94,
        cyWin + halfHWin * 0.14,
        2,
        cxWin - halfWWin * 0.82,
        cyWin + halfHWin * 0.14,
        halfHWin * 0.65
      );
      amberGrad.addColorStop(0, `rgba(252, 210, 120, ${(0.58 * amberRimStrength).toFixed(3)})`);
      amberGrad.addColorStop(0.35, `rgba(217, 138, 36, ${(0.28 * amberRimStrength).toFixed(3)})`);
      amberGrad.addColorStop(1, "rgba(217, 138, 36, 0)");
      ctx.fillStyle = amberGrad;
      ctx.fillRect(
        cxWin - halfWWin - 4,
        cyWin - halfHWin - 4,
        halfWWin * 2 + 8,
        halfHWin * 2 + 8
      );
    }

    // 9. Crisp outer glass rim bevel stroke
    traceCapsulePath(ctx, cxWin, cyWin, halfWWin - 0.8, halfHWin - 0.8);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.36 * (1 - nightMix * 0.45)).toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 10. Subtle rim edge sparkles in night mode (matching 05_night_idle.jpg)
    if (nightMix > 0.45) {
      const spAlpha = (nightMix - 0.45) / 0.55;
      const glintPulse = 0.65 + 0.35 * Math.sin(state.t * 3.1);
      ctx.fillStyle = `rgba(255, 248, 232, ${(0.75 * spAlpha * glintPulse).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cxWin - halfWWin * 0.93, cyWin + 8, 2.1, 0, Math.PI * 2);
      ctx.arc(cxWin + halfWWin * 0.86, cyWin - halfHWin * 0.46, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
