import { useState, useRef, useCallback, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: (nextDark: boolean) => void;
}

// Micro-pixel grid constants from Design-Skill/PixelButton.md
const BOX_SIZE = 2;
const GAP = 2;
const CELL = BOX_SIZE + GAP;
const SPARKLE_RADIUS = 32;

interface StarPoint {
  x: number;
  y: number;
  r: number;
  phase: number;
}

/**
 * Fullscreen canvas animation simulating a Solar Eclipse:
 * - The Moon glides across to occult (hide) the Sun.
 * - A Diamond Ring glint & pearlescent Solar Corona flare at totality.
 * - The Moon's penumbra and umbra shadow slowly sweeps across "Earth" (the viewport),
 *   gradually plunging the page into darkness (or revealing golden daylight in reverse).
 */
function runSolarEclipseTransition({
  originX,
  originY,
  toDark,
  applyTheme,
  onProgress,
  onComplete,
  duration = 2100,
}: {
  originX: number;
  originY: number;
  toDark: boolean;
  applyTheme: () => void;
  onProgress?: (p: number) => void;
  onComplete?: () => void;
  duration?: number;
}) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    applyTheme();
    onComplete?.();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: `${W}px`,
    height: `${H}px`,
    zIndex: "99999",
    pointerEvents: "none",
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    applyTheme();
    onComplete?.();
    return;
  }

  document.body.appendChild(canvas);

  // Generate subtle background stars that briefly appear during totality
  const stars: StarPoint[] = Array.from({ length: 48 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.75,
    r: 0.6 + Math.random() * 1.2,
    phase: Math.random() * Math.PI * 2,
  }));

  const maxCornerDist = Math.hypot(
    Math.max(originX, W - originX),
    Math.max(originY, H - originY)
  );

  // Celestial disc radius in the sky around the toggle button
  const sunRadius = 34;
  const moonRadius = 35.5;

  let themeSwitched = false;
  let startTime: number | null = null;

  const easeInOutCubic = (x: number) =>
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  const frame = (now: number) => {
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;
    const rawP = Math.min(1, elapsed / duration);
    const p = easeInOutCubic(rawP);
    onProgress?.(p);

    // Switch the underlying DOM theme right when totality covers the viewport
    const switchThreshold = toDark ? 0.56 : 0.44;
    if (!themeSwitched && rawP >= switchThreshold) {
      themeSwitched = true;
      applyTheme();
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Compute how much the Moon overlaps the Sun:
    // eclipseFactor: 0 = full Sun visible, 1 = total solar eclipse (Sun completely hidden by Moon)
    let eclipseFactor: number;
    let moonOffset: number; // px offset of Moon center relative to Sun center
    let fadeOutEnvelope = 1;

    if (toDark) {
      // Light -> Dark:
      // 0.0 -> 0.58: Moon slides in from top-right to completely cover the Sun (Totality)
      // 0.58 -> 1.0: Totality holds briefly while Earth is dark, then overlay gently dissolves into dark mode
      if (rawP <= 0.58) {
        const t = easeInOutCubic(rawP / 0.58);
        eclipseFactor = t;
        moonOffset = (1 - t) * (sunRadius * 2.35);
      } else {
        eclipseFactor = 1;
        moonOffset = 0;
        const fadeT = (rawP - 0.58) / 0.42;
        fadeOutEnvelope = 1 - easeInOutCubic(fadeT);
      }
    } else {
      // Dark -> Light:
      // 0.0 -> 0.22: Totality forms around the Moon
      // 0.22 -> 0.80: Moon slides away off the Sun, unveiling golden daylight across Earth
      // 0.80 -> 1.0: Daylight glow settles into crisp light mode
      if (rawP <= 0.22) {
        const t = easeInOutCubic(rawP / 0.22);
        eclipseFactor = 1;
        moonOffset = 0;
        fadeOutEnvelope = t;
      } else if (rawP <= 0.82) {
        const t = easeInOutCubic((rawP - 0.22) / 0.6);
        eclipseFactor = 1 - t;
        moonOffset = -t * (sunRadius * 2.35);
        fadeOutEnvelope = 1;
      } else {
        eclipseFactor = 0;
        moonOffset = -sunRadius * 2.35;
        const fadeT = (rawP - 0.82) / 0.18;
        fadeOutEnvelope = 1 - easeInOutCubic(fadeT);
      }
    }

    // 1. EARTH SHADOW (Penumbra & Umbra sweeping across the viewport as Sun gets hidden)
    // As eclipseFactor goes from 0 -> 1, Earth slowly goes from warm twilight to deep totality night
    const darkness = Math.pow(eclipseFactor, 1.35) * fadeOutEnvelope;

    if (darkness > 0.005) {
      // Sweeping penumbra/umbra radial gradient originating from the eclipsed Sun
      const umbraRadius =
        maxCornerDist * (0.15 + 1.15 * Math.pow(eclipseFactor, 0.85));
      const skyGrad = ctx.createRadialGradient(
        originX,
        originY,
        sunRadius * 0.8,
        originX,
        originY,
        Math.max(sunRadius * 2, umbraRadius)
      );

      // Deep totality core near the Moon's shadow cone + twilight horizon glow at the penumbra edge
      const coreAlpha = Math.min(0.96, darkness * 0.96);
      const midAlpha = Math.min(0.9, darkness * 0.82);
      const edgeAlpha = Math.min(0.85, Math.pow(eclipseFactor, 1.8) * 0.85 * fadeOutEnvelope);

      skyGrad.addColorStop(0, `rgba(5, 5, 10, ${coreAlpha})`);
      skyGrad.addColorStop(0.45, `rgba(8, 10, 20, ${midAlpha})`);
      skyGrad.addColorStop(0.78, `rgba(22, 18, 38, ${ (midAlpha + edgeAlpha) * 0.5 })`);
      skyGrad.addColorStop(1, `rgba(10, 10, 14, ${edgeAlpha})`);

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle horizon sunset/twilight band ("360-degree sunset" seen on Earth during a total solar eclipse)
      const twilightIntensity =
        Math.sin(eclipseFactor * Math.PI) * 0.32 * fadeOutEnvelope;
      if (twilightIntensity > 0.01) {
        const horizonGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
        horizonGrad.addColorStop(0, "rgba(251, 146, 60, 0)");
        horizonGrad.addColorStop(
          0.65,
          `rgba(234, 88, 12, ${twilightIntensity * 0.45})`
        );
        horizonGrad.addColorStop(
          1,
          `rgba(251, 191, 36, ${twilightIntensity * 0.75})`
        );
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Golden daylight wave when Sun is emerging (Dark -> Light)
    if (!toDark && rawP > 0.22) {
      const sunlightProgress = 1 - eclipseFactor;
      const waveAlpha = Math.sin(sunlightProgress * Math.PI) * 0.35 * fadeOutEnvelope;
      if (waveAlpha > 0.01) {
        const dayGrad = ctx.createRadialGradient(
          originX,
          originY,
          sunRadius,
          originX,
          originY,
          maxCornerDist * Math.max(0.1, sunlightProgress * 1.1)
        );
        dayGrad.addColorStop(0, `rgba(253, 224, 71, ${waveAlpha * 1.2})`);
        dayGrad.addColorStop(0.4, `rgba(251, 146, 60, ${waveAlpha * 0.6})`);
        dayGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = dayGrad;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // 2. TWINKLING STARS during deep totality
    const starVisibility =
      Math.max(0, (eclipseFactor - 0.65) / 0.35) * fadeOutEnvelope;
    if (starVisibility > 0.01) {
      for (const s of stars) {
        const twinkle =
          0.55 + 0.45 * Math.sin(elapsed * 0.006 + s.phase);
        ctx.fillStyle = `rgba(255, 255, 255, ${
          starVisibility * twinkle * 0.75
        })`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. SOLAR DISC & CORONA AT ORIGIN
    ctx.save();
    ctx.globalAlpha = fadeOutEnvelope;

    // Outer ambient solar glow (shrinks as Moon covers Sun, transforms into pearly corona at totality)
    const unobscured = 1 - eclipseFactor;
    const coronaStrength = Math.pow(eclipseFactor, 2.2);

    // Warm solar atmosphere when partially visible
    if (unobscured > 0.01) {
      const sunHalo = ctx.createRadialGradient(
        originX,
        originY,
        sunRadius * 0.5,
        originX,
        originY,
        sunRadius * (3.2 + unobscured * 2.5)
      );
      sunHalo.addColorStop(0, `rgba(253, 224, 71, ${0.75 * unobscured})`);
      sunHalo.addColorStop(0.35, `rgba(251, 146, 60, ${0.42 * unobscured})`);
      sunHalo.addColorStop(1, "rgba(251, 146, 60, 0)");
      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(
        originX,
        originY,
        sunRadius * (3.2 + unobscured * 2.5),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Pearly-white & amber Solar Corona streamers during totality
    if (coronaStrength > 0.02) {
      const coronaGrad = ctx.createRadialGradient(
        originX,
        originY,
        moonRadius * 0.92,
        originX,
        originY,
        moonRadius * 3.4
      );
      coronaGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * coronaStrength})`);
      coronaGrad.addColorStop(
        0.18,
        `rgba(254, 243, 199, ${0.65 * coronaStrength})`
      );
      coronaGrad.addColorStop(
        0.48,
        `rgba(148, 163, 184, ${0.24 * coronaStrength})`
      );
      coronaGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(originX, originY, moonRadius * 3.4, 0, Math.PI * 2);
      ctx.fill();

      // Subtle coronal rays
      ctx.save();
      ctx.translate(originX, originY);
      ctx.rotate(elapsed * 0.00015);
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const rayLen =
          moonRadius * (1.7 + 0.55 * Math.sin(i * 2.3 + elapsed * 0.002));
        const rayGrad = ctx.createLinearGradient(
          Math.cos(angle) * moonRadius * 0.95,
          Math.sin(angle) * moonRadius * 0.95,
          Math.cos(angle) * rayLen,
          Math.sin(angle) * rayLen
        );
        rayGrad.addColorStop(
          0,
          `rgba(255, 255, 255, ${0.38 * coronaStrength})`
        );
        rayGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.strokeStyle = rayGrad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(
          Math.cos(angle) * moonRadius * 0.95,
          Math.sin(angle) * moonRadius * 0.95
        );
        ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bright Solar Disc
    const sunDiscGrad = ctx.createRadialGradient(
      originX,
      originY,
      2,
      originX,
      originY,
      sunRadius
    );
    sunDiscGrad.addColorStop(0, "#ffffff");
    sunDiscGrad.addColorStop(0.65, "#fde047");
    sunDiscGrad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = sunDiscGrad;
    ctx.beginPath();
    ctx.arc(originX, originY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // 4. THE OCCULTING MOON DISC (gliding across the Sun at a slight celestial angle)
    const orbitAngle = -0.28; // ~16 deg celestial path
    const moonX = originX + Math.cos(orbitAngle) * moonOffset;
    const moonY = originY + Math.sin(orbitAngle) * moonOffset;

    ctx.fillStyle = "#09090d";
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Thin golden-white chromosphere / limb rim around the Moon during high eclipse
    if (eclipseFactor > 0.65) {
      const rimAlpha = ((eclipseFactor - 0.65) / 0.35) * 0.85;
      ctx.strokeStyle = `rgba(254, 240, 138, ${rimAlpha})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. DIAMOND RING GLINT (occurs right around 2nd/3rd contact: eclipseFactor ~ 0.82 - 0.98)
    const diamondWindow = 1 - Math.abs(eclipseFactor - 0.9) / 0.12;
    if (diamondWindow > 0) {
      const dIntensity = Math.max(0, Math.min(1, diamondWindow));
      const glintAngle = moonOffset >= 0 ? orbitAngle + Math.PI : orbitAngle;
      const gx = originX + Math.cos(glintAngle) * (sunRadius * 0.96);
      const gy = originY + Math.sin(glintAngle) * (sunRadius * 0.96);

      const diamondGrad = ctx.createRadialGradient(
        gx,
        gy,
        1,
        gx,
        gy,
        sunRadius * 1.4
      );
      diamondGrad.addColorStop(0, `rgba(255, 255, 255, ${dIntensity})`);
      diamondGrad.addColorStop(
        0.25,
        `rgba(254, 240, 138, ${dIntensity * 0.85})`
      );
      diamondGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.fillStyle = diamondGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, sunRadius * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();

    if (rawP < 1) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
      onComplete?.();
    }
  };

  requestAnimationFrame(frame);
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const hoveredRef = useRef(false);
  const seedsRef = useRef<Float32Array>(new Float32Array(0));
  const [dims, setDims] = useState({ w: 0, h: 0, cols: 0, rows: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  // Measure button for the Design-Skill micro-pixel canvas
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const box = entry.borderBoxSize?.[0];
      const width = box ? box.inlineSize : btn.offsetWidth;
      const height = box ? box.blockSize : btn.offsetHeight;
      const cols = Math.ceil(width / CELL);
      const rows = Math.ceil(height / CELL);
      const total = cols * rows;
      const seeds = new Float32Array(total);
      for (let i = 0; i < total; i++) seeds[i] = Math.random() * 100;
      seedsRef.current = seeds;
      setDims({ w: width, h: height, cols, rows });
    });

    ro.observe(btn);
    return () => ro.disconnect();
  }, []);

  // Micro-pixel shimmer + hover sparkle inside the toggle button
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.cols === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(dims.w * dpr);
    canvas.height = Math.round(dims.h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let t = 0;
    let lastTime = performance.now();
    const seeds = seedsRef.current;
    const total = dims.cols * dims.rows;

    const draw = (now: number) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;
      t += dt;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, dims.w, dims.h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const isHovered = hoveredRef.current;

      for (let i = 0; i < total; i++) {
        const col = i % dims.cols;
        const row = Math.floor(i / dims.cols);
        const cx = col * CELL + BOX_SIZE / 2;
        const cy = row * CELL + BOX_SIZE / 2;

        const seed = seeds[i] ?? 0;
        const speed = 0.4 + (seed % 0.8);
        let alpha = (Math.sin(t * speed + seed) * 0.5 + 0.5) * 0.06;

        if (isHovered) {
          const dist = Math.hypot(mx - cx, my - cy);
          if (dist < SPARKLE_RADIUS) {
            const proximity = 1 - dist / SPARKLE_RADIUS;
            const flicker = Math.sin(t * 6 + seed) * 0.5 + 0.5;
            alpha = Math.min(0.38, alpha + proximity * flicker * 0.26);
          }
        }

        if (alpha > 0.01) {
          ctx.fillStyle = isDark
            ? `rgba(255, 255, 255, ${alpha})`
            : `rgba(24, 24, 27, ${alpha * 0.85})`;
          ctx.beginPath();
          ctx.roundRect(col * CELL, row * CELL, BOX_SIZE, BOX_SIZE, 0.75);
          ctx.fill();
        }
      }

      ctx.restore();
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [dims, isDark]);

  const handleTriggerEclipse = useCallback(() => {
    if (isAnimating) return;
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const nextDark = !isDark;

    setIsAnimating(true);

    runSolarEclipseTransition({
      originX,
      originY,
      toDark: nextDark,
      applyTheme: () => {
        onToggle(nextDark);
      },
      onComplete: () => {
        setIsAnimating(false);
      },
    });
  }, [isAnimating, isDark, onToggle]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleTriggerEclipse}
      onMouseMove={(e) => {
        const rect = btnRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }}
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        mouseRef.current = { x: -999, y: -999 };
      }}
      aria-label={isDark ? "Switch to daylight mode" : "Trigger solar eclipse dark mode"}
      title={isDark ? "End Eclipse (Light Mode)" : "Solar Eclipse (Dark Mode)"}
      className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full overflow-hidden cursor-pointer select-none outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-400/50"
      style={{
        background: isDark
          ? "rgba(17, 17, 20, 0.62)"
          : "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: isDark
          ? "1px solid rgba(255, 255, 255, 0.08)"
          : "1px solid rgba(24, 24, 27, 0.09)",
        boxShadow: isDark
          ? "0 6px 24px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)"
          : "0 6px 20px -4px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)",
      }}
    >
      {/* Micro-pixel canvas layer */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Celestial Eclipse Icon Stage (Sun occulted by Moon) */}
      <span className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full overflow-hidden">
        {/* Corona ring glow around the icon during dark/eclipse state */}
        <span
          aria-hidden="true"
          className={`absolute inset-0.5 rounded-full transition-all duration-700 ${
            isDark
              ? "opacity-90 scale-100 shadow-[0_0_10px_1px_rgba(251,191,36,0.45)] border border-amber-300/40"
              : "opacity-0 scale-75"
          }`}
        />

        {/* Lucide Sun Icon (gets covered/occulted as the Moon slides over it) */}
        <Sun
          size={15}
          strokeWidth={2}
          className={`absolute transition-all duration-700 ease-in-out ${
            isDark
              ? "text-amber-300/35 scale-75 opacity-35 rotate-45"
              : "text-amber-500 scale-100 opacity-100 rotate-0 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
          }`}
        />

        {/* Lucide Moon Icon (glides across the Sun like a real lunar occultation) */}
        <Moon
          size={14}
          strokeWidth={2}
          className={`absolute transition-all duration-700 ease-in-out ${
            isDark
              ? "translate-x-0 translate-y-0 scale-100 opacity-100 text-amber-100 drop-shadow-[0_0_6px_rgba(254,243,199,0.5)]"
              : "translate-x-4 -translate-y-3 scale-50 opacity-0 text-neutral-700"
          }`}
        />
      </span>

      <span
        className={`relative z-10 text-xs font-medium tracking-tight leading-5 transition-colors duration-300 ${
          isDark
            ? "text-neutral-300 group-hover:text-white"
            : "text-neutral-700 group-hover:text-neutral-950"
        }`}
      >
        {isDark ? "Eclipse" : "Daylight"}
      </span>
    </button>
  );
}

export default ThemeToggle;
