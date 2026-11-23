import { useState, useRef, useCallback, useEffect } from "react";

export type NavSection = "home" | "project";

interface NavbarProps {
  activeSection?: NavSection;
  onSelectSection?: (section: NavSection) => void;
  isDark?: boolean;
}

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "project", label: "Project" },
];

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

export function Navbar({
  activeSection: controlledActive,
  onSelectSection,
  isDark = true,
}: NavbarProps) {
  const [internalActive, setInternalActive] = useState<NavSection>("home");
  const active = controlledActive ?? internalActive;

  const navRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemRefs = useRef<Record<NavSection, HTMLButtonElement | null>>({
    home: null,
    project: null,
  });

  const mouseRef = useRef({ x: -999, y: -999 });
  const hoveredRef = useRef(false);
  const wavesRef = useRef<Wave[]>([]);
  const timeRef = useRef(0);
  const seedsRef = useRef<Float32Array>(new Float32Array(0));
  const [dims, setDims] = useState({ w: 0, h: 0, cols: 0, rows: 0 });

  // Spring physics state for the active sliding pill (inspired by Design-Skill/GravityImageTrail.md)
  const pillSpringRef = useRef({
    x: 4,
    w: 76,
    vx: 0,
    vw: 0,
    targetX: 4,
    targetW: 76,
    initialized: false,
  });
  const [pillStyle, setPillStyle] = useState({ x: 4, w: 76 });

  const syncTargetBounds = useCallback(() => {
    const navEl = navRef.current;
    const activeBtn = itemRefs.current[active];
    if (!navEl || !activeBtn) return;

    const navRect = navEl.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const nextX = btnRect.left - navRect.left;
    const nextW = btnRect.width;

    const s = pillSpringRef.current;
    s.targetX = nextX;
    s.targetW = nextW;
    if (!s.initialized) {
      s.x = nextX;
      s.w = nextW;
      s.initialized = true;
      setPillStyle({ x: nextX, w: nextW });
    }
  }, [active]);

  useEffect(() => {
    syncTargetBounds();
  }, [active, dims.w, syncTargetBounds]);

  // Observe navbar dimensions and initialize deterministic pixel seeds
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const box = entry.borderBoxSize?.[0];
      const width = box ? box.inlineSize : nav.offsetWidth;
      const height = box ? box.blockSize : nav.offsetHeight;
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

    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // Unified 60fps animation loop: subtle pixel shimmer + hover sparkle + click ripple + spring pill
  useEffect(() => {
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

      // 1. Update underdamped spring for the sliding active indicator
      const s = pillSpringRef.current;
      const stiffness = 180;
      const damping = 18;
      const fx = (s.targetX - s.x) * stiffness;
      const fw = (s.targetW - s.w) * stiffness;
      s.vx = (s.vx + fx * dt) * Math.exp(-damping * dt);
      s.vw = (s.vw + fw * dt) * Math.exp(-damping * dt);
      s.x += s.vx * dt;
      s.w += s.vw * dt;

      if (
        Math.abs(s.targetX - s.x) > 0.05 ||
        Math.abs(s.targetW - s.w) > 0.05 ||
        Math.abs(s.vx) > 0.1
      ) {
        setPillStyle({ x: s.x, w: s.w });
      }

      // 2. Prune expired click ripple waves
      wavesRef.current = wavesRef.current.filter(
        (w) => t - w.birth < WAVE_LIFETIME
      );

      // 3. Render minimalistic pixel matrix
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
        // Ultra-subtle idle organic breathing
        let alpha = (Math.sin(t * speed + seed) * 0.5 + 0.5) * 0.045;

        // Soft boost inside the active sliding pill region
        if (cx >= s.x && cx <= s.x + s.w) {
          alpha += 0.055;
        }

        // Click wave ripple expansion
        for (const w of wavesRef.current) {
          const distToWave = Math.hypot(cx - w.x, cy - w.y);
          const currentRadius = (t - w.birth) * WAVE_SPEED;
          const ringDist = Math.abs(distToWave - currentRadius);
          if (ringDist < WAVE_RING_WIDTH) {
            const ringFactor = 1 - ringDist / WAVE_RING_WIDTH;
            const ageFactor = Math.max(0, 1 - currentRadius / WAVE_MAX_RADIUS);
            alpha += ringFactor * ageFactor * 0.28;
          }
        }

        // Hover proximity sparkle
        if (isHovered) {
          const dist = Math.hypot(mx - cx, my - cy);
          if (dist < SPARKLE_RADIUS) {
            const proximity = 1 - dist / SPARKLE_RADIUS;
            const flicker = Math.sin(t * 6 + seed) * 0.5 + 0.5;
            alpha = Math.min(0.35, alpha + proximity * flicker * 0.22);
          }
        }

        if (alpha > 0.01) {
          const clampedAlpha = Math.min(0.4, alpha);
          ctx.fillStyle = isDark
            ? `rgba(255, 255, 255, ${clampedAlpha})`
            : `rgba(24, 24, 27, ${clampedAlpha * 0.8})`;
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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = navRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseEnter = useCallback(() => {
    hoveredRef.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = false;
    mouseRef.current = { x: -999, y: -999 };
  }, []);

  const handleSelect = useCallback(
    (section: NavSection, e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = navRef.current?.getBoundingClientRect();
      if (rect) {
        wavesRef.current.push({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          birth: timeRef.current,
        });
      }

      if (controlledActive === undefined) {
        setInternalActive(section);
      }
      onSelectSection?.(section);

      const targetEl = document.getElementById(section);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [controlledActive, onSelectSection]
  );

  return (
    <nav
      ref={navRef}
      aria-label="Primary Navigation"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-flex items-center p-[3px] rounded-full overflow-hidden select-none transition-all duration-300"
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
      {/* Interactive micro-pixel canvas layer */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Spring-physics sliding active pill */}
      <div
        aria-hidden="true"
        className="absolute top-[3px] bottom-[3px] rounded-full pointer-events-none z-1"
        style={{
          left: 0,
          width: `${pillStyle.w}px`,
          transform: `translate3d(${pillStyle.x}px, 0, 0)`,
          background: isDark
            ? "linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)"
            : "linear-gradient(180deg, rgba(24, 24, 27, 0.09) 0%, rgba(24, 24, 27, 0.04) 100%)",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.1)"
            : "1px solid rgba(24, 24, 27, 0.1)",
          boxShadow: isDark
            ? "0 1px 6px rgba(0, 0, 0, 0.2)"
            : "0 1px 4px rgba(0, 0, 0, 0.06)",
        }}
      />

      {/* Minimalistic Home & Project buttons */}
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el;
            }}
            type="button"
            onClick={(e) => handleSelect(item.id, e)}
            aria-current={isActive ? "page" : undefined}
            className={`relative z-10 px-3.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight leading-4 transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              isActive
                ? isDark
                  ? "text-white"
                  : "text-neutral-950"
                : isDark
                  ? "text-neutral-400 hover:text-neutral-200"
                  : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span className="relative flex items-center gap-1.5">
              <span
                className={`w-1 h-1 rounded-full transition-all duration-300 ${
                  isActive
                    ? isDark
                      ? "bg-white scale-100 opacity-100 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                      : "bg-neutral-900 scale-100 opacity-100 shadow-[0_0_6px_rgba(24,24,27,0.4)]"
                    : "bg-neutral-500 scale-0 opacity-0 w-0 -mr-1.5"
                }`}
              />
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default Navbar;
