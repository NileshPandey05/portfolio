import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

// Micro-pixel grid constants inspired by Design-Skill/PixelButton.md
const BOX_SIZE = 2;
const GAP = 2;
const CELL = BOX_SIZE + GAP;
const SPARKLE_RADIUS = 36;
const WAVE_SPEED = 180;
const WAVE_RING_WIDTH = 24;
const WAVE_MAX_RADIUS = 220;
const WAVE_LIFETIME = WAVE_MAX_RADIUS / WAVE_SPEED;

interface Wave {
  x: number;
  y: number;
  birth: number;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Visual style of the button */
  variant?: "glass" | "ghost" | "primary";
  /** Size preset matching the slim navbar or larger CTAs */
  size?: "sm" | "md" | "lg";
  /** Whether the button is in an active/selected state (e.g. inside Navbar) */
  active?: boolean;
  /** Show the minimalistic glowing status dot before the label */
  showDot?: boolean;
  /** Enable standalone interactive micro-pixel canvas inside the button */
  pixelCanvas?: boolean;
  /** Theme mode for adaptive surface & pixel contrast */
  isDark?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = "glass",
      size = "sm",
      active = false,
      showDot = false,
      pixelCanvas = true,
      isDark = true,
      className = "",
      onClick,
      onMouseMove,
      onMouseEnter,
      onMouseLeave,
      style,
      ...rest
    },
    externalRef
  ) {
    const internalBtnRef = useRef<HTMLButtonElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const mouseRef = useRef({ x: -999, y: -999 });
    const hoveredRef = useRef(false);
    const wavesRef = useRef<Wave[]>([]);
    const timeRef = useRef(0);
    const seedsRef = useRef<Float32Array>(new Float32Array(0));
    const [dims, setDims] = useState({ w: 0, h: 0, cols: 0, rows: 0 });

    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        internalBtnRef.current = node;
        if (typeof externalRef === "function") {
          externalRef(node);
        } else if (externalRef) {
          externalRef.current = node;
        }
      },
      [externalRef]
    );

    // Measure button dimensions for the micro-pixel grid
    useEffect(() => {
      if (!pixelCanvas) return;
      const btn = internalBtnRef.current;
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
        for (let i = 0; i < total; i++) {
          seeds[i] = Math.random() * 100;
        }
        seedsRef.current = seeds;
        setDims({ w: width, h: height, cols, rows });
      });

      ro.observe(btn);
      return () => ro.disconnect();
    }, [pixelCanvas]);

    // Interactive micro-pixel animation loop (idle breathing + hover sparkle + click ripple)
    useEffect(() => {
      if (!pixelCanvas) return;
      const canvas = canvasRef.current;
      if (!canvas || dims.cols === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(dims.w * dpr);
      canvas.height = Math.round(dims.h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let rafId = 0;
      let t = timeRef.current;
      let lastTime = performance.now();
      const seeds = seedsRef.current;
      const total = dims.cols * dims.rows;

      const draw = (now: number) => {
        const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        t += dt;
        timeRef.current = t;

        wavesRef.current = wavesRef.current.filter(
          (w) => t - w.birth < WAVE_LIFETIME
        );

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
          const speed = 0.35 + (seed % 0.85);
          let alpha =
            (Math.sin(t * speed + seed) * 0.5 + 0.5) *
            (active ? 0.08 : 0.045);

          // Click wave ripple expansion
          for (const w of wavesRef.current) {
            const distToWave = Math.hypot(cx - w.x, cy - w.y);
            const currentRadius = (t - w.birth) * WAVE_SPEED;
            const ringDist = Math.abs(distToWave - currentRadius);
            if (ringDist < WAVE_RING_WIDTH) {
              const ringFactor = 1 - ringDist / WAVE_RING_WIDTH;
              const ageFactor = Math.max(
                0,
                1 - currentRadius / WAVE_MAX_RADIUS
              );
              alpha += ringFactor * ageFactor * 0.3;
            }
          }

          // Hover proximity sparkle
          if (isHovered) {
            const dist = Math.hypot(mx - cx, my - cy);
            if (dist < SPARKLE_RADIUS) {
              const proximity = 1 - dist / SPARKLE_RADIUS;
              const flicker = Math.sin(t * 6 + seed) * 0.5 + 0.5;
              alpha = Math.min(0.38, alpha + proximity * flicker * 0.24);
            }
          }

          if (alpha > 0.01) {
            const clampedAlpha = Math.min(0.42, alpha);
            ctx.fillStyle = `rgba(255, 255, 255, ${clampedAlpha})`;
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
    }, [pixelCanvas, dims, isDark, active, variant]);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = internalBtnRef.current?.getBoundingClientRect();
        if (rect) {
          mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
        }
        onMouseMove?.(e);
      },
      [onMouseMove]
    );

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        hoveredRef.current = true;
        onMouseEnter?.(e);
      },
      [onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        hoveredRef.current = false;
        mouseRef.current = { x: -999, y: -999 };
        onMouseLeave?.(e);
      },
      [onMouseLeave]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = internalBtnRef.current?.getBoundingClientRect();
        if (rect) {
          wavesRef.current.push({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            birth: timeRef.current,
          });
        }
        onClick?.(e);
      },
      [onClick]
    );

    const sizeClasses =
      size === "sm"
        ? "px-4 py-1 text-xs leading-5"
        : size === "md"
          ? "px-5 py-2 text-sm leading-5"
          : "px-6 py-2.5 text-sm leading-6";

    const textColors =
      variant === "primary"
        ? "text-white"
        : active
          ? "text-white"
          : isDark
            ? "text-neutral-400 hover:text-neutral-200"
            : "text-white/75 hover:text-white";

    const variantSurfaceStyle: React.CSSProperties =
      variant === "glass"
        ? {
          background: isDark
            ? "rgba(17, 17, 20, 0.62)"
            : "rgba(15, 45, 125, 0.48)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(255, 255, 255, 0.22)",
          boxShadow: isDark
            ? "0 6px 24px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)"
            : "0 6px 20px -4px rgba(10, 30, 90, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)",
        }
        : variant === "primary"
          ? {
            background: isDark
              ? "linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)"
              : "linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 6px 20px -4px rgba(0, 0, 0, 0.35)",
          }
          : {};

    return (
      <button
        ref={setRefs}
        type="button"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative z-10 inline-flex items-center justify-center rounded-full font-medium tracking-tight overflow-hidden select-none transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${sizeClasses} ${textColors} ${className}`}
        style={{
          ...variantSurfaceStyle,
          ...style,
        }}
        {...rest}
      >
        {pixelCanvas && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
          />
        )}

        <span className="relative z-10 flex items-center gap-1.5">
          {showDot && (
            <span
              className={`w-1 h-1 rounded-full transition-all duration-300 ${active
                ? "bg-white scale-100 opacity-100 shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                : "bg-neutral-500 scale-0 opacity-0 w-0 -mr-1.5"
                }`}
            />
          )}
          {children}
        </span>
      </button>
    );
  }
);

export default Button;
