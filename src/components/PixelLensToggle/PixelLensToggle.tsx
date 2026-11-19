import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import "./PixelLensToggle.css";
import { clamp01, getPageBgColor, getShellStyle } from "./palette";
import { LENS_WINDOW_W, LensRenderer } from "./lensRenderer";
import {
  applyDragElastic,
  CLICK_SPRING,
  createPhysicsState,
  RELEASE_SPRING,
  setSpringTarget,
  stepPhysics,
} from "./physics";
import {
  computeWindowGlow,
  SceneRenderer,
  type TransitionDirection,
} from "./sceneRenderer";

export interface PixelLensToggleProps {
  /** Controlled night state (false = day, true = night). */
  checked?: boolean;
  /** Initial state when uncontrolled (default: false = day). */
  defaultChecked?: boolean;
  /** Called whenever the toggle commits a state change (click, drag release, or keyboard). */
  onChange?: (isNight: boolean) => void;
  /**
   * Called inside the animation frame loop with continuous progress p in [0..1]
   * and matching page background CSS color string (useful for zero-re-render page bg updates).
   */
  onProgress?: (p: number, pageBgColor: string) => void;
  /** Overall pill width in CSS pixels. All geometry scales from the 736x400 reference. */
  size?: number;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
  /** Optional wrapper class name. */
  className?: string;
}

const REF_W = 736;
const REF_H = 400;
const REF_INSET = 18;

export function PixelLensToggle({
  checked,
  defaultChecked = false,
  onChange,
  onProgress,
  size = REF_W,
  ariaLabel = "Toggle day and night world",
  className = "",
}: PixelLensToggleProps) {
  const isControlled = checked !== undefined;
  const [internalNight, setInternalNight] = useState<boolean>(
    isControlled ? checked : defaultChecked
  );
  const currentNight = isControlled ? checked : internalNight;

  const shellRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const recessRef = useRef<HTMLDivElement>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);

  const physicsRef = useRef(createPhysicsState(currentNight));
  const directionRef = useRef<TransitionDirection>(
    currentNight ? "to-night" : "to-day"
  );
  const reducedMotionRef = useRef(false);
  const scaleRef = useRef(size / REF_W);
  scaleRef.current = size / REF_W;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const currentNightRef = useRef(currentNight);
  currentNightRef.current = currentNight;

  // Pointer drag tracking refs
  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    startP: number;
    hasMoved: boolean;
    lastRawP: number;
    lastTime: number;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startP: 0,
    hasMoved: false,
    lastRawP: 0,
    lastTime: 0,
  });

  // Track prefers-reduced-motion dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onMqChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onMqChange);
    return () => mq.removeEventListener("change", onMqChange);
  }, []);

  // Sync controlled `checked` prop changes into physics target
  useEffect(() => {
    if (checked === undefined) return;
    const target = checked ? 1 : 0;
    const phys = physicsRef.current;
    if (Math.abs(phys.target - target) > 0.001 && !phys.isDragging) {
      directionRef.current = checked ? "to-night" : "to-day";
      setSpringTarget(phys, target, CLICK_SPRING);
    }
  }, [checked]);

  // Single 60fps requestAnimationFrame loop driving Canvas + CSS shell styles (0 React re-renders)
  useEffect(() => {
    const sceneEl = sceneCanvasRef.current;
    const lensEl = lensCanvasRef.current;
    if (!sceneEl || !lensEl) return;

    const sceneRenderer = new SceneRenderer();
    const lensRenderer = new LensRenderer(lensEl);

    sceneEl.width = sceneRenderer.canvas.width;
    sceneEl.height = sceneRenderer.canvas.height;
    const displaySceneCtx = sceneEl.getContext("2d", { alpha: false });
    if (!displaySceneCtx) return;
    displaySceneCtx.imageSmoothingEnabled = false;

    let rafId = 0;
    let lastNow = performance.now();
    let elapsed = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;
      elapsed += dt;

      const phys = physicsRef.current;
      const reduced = reducedMotionRef.current;
      stepPhysics(phys, dt, reduced);

      const clampedP = clamp01(phys.p);
      const direction = directionRef.current;

      const scenePixels = sceneRenderer.render({
        p: clampedP,
        t: elapsed,
        direction,
        isDragging: phys.isDragging,
        velocity: phys.visualVelocity,
        settleTime: phys.settleTime,
        reducedMotion: reduced,
      });

      displaySceneCtx.drawImage(sceneRenderer.canvas, 0, 0);

      lensRenderer.render(scenePixels, {
        p: phys.p,
        velocity: phys.visualVelocity,
        direction,
        t: elapsed,
        reducedMotion: reduced,
      });

      // Update shell rim colors & amber outer glow directly on DOM nodes
      const windowGlow = computeWindowGlow(clampedP, direction);
      const shellVisual = getShellStyle(clampedP, windowGlow, scaleRef.current);

      if (shellRef.current) {
        shellRef.current.style.background = shellVisual.background;
        shellRef.current.style.boxShadow = shellVisual.boxShadow;
      }
      if (recessRef.current) {
        recessRef.current.style.boxShadow = shellVisual.innerShadow;
      }

      onProgressRef.current?.(clampedP, getPageBgColor(clampedP));

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const commitToggleState = (nextNight: boolean, preset = CLICK_SPRING) => {
    directionRef.current = nextNight ? "to-night" : "to-day";
    setSpringTarget(physicsRef.current, nextNight ? 1 : 0, preset);
    if (!isControlled) {
      setInternalNight(nextNight);
    }
    if (nextNight !== currentNightRef.current) {
      onChangeRef.current?.(nextNight);
    }
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const shell = shellRef.current;
    if (!shell) return;

    shell.setPointerCapture(e.pointerId);
    shell.focus({ preventScroll: true });

    const phys = physicsRef.current;
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startP: clamp01(phys.p),
      hasMoved: false,
      lastRawP: clamp01(phys.p),
      lastTime: performance.now(),
    };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.hasMoved && Math.hypot(dx, dy) > 5) {
      drag.hasMoved = true;
      physicsRef.current.isDragging = true;
      if (shellRef.current) {
        shellRef.current.dataset.dragging = "true";
      }
    }

    if (!drag.hasMoved) return;

    const winWidth = windowRef.current?.clientWidth || size * (LENS_WINDOW_W / REF_W);
    const travelPx = winWidth * 0.5; // lens travels 350 / 700 = 50% of inner window
    const rawP = drag.startP + dx / travelPx;

    const now = performance.now();
    const dt = Math.max(0.004, (now - drag.lastTime) / 1000);
    const instantVel = (rawP - drag.lastRawP) / dt;

    drag.lastRawP = rawP;
    drag.lastTime = now;

    const phys = physicsRef.current;
    phys.p = applyDragElastic(rawP, 0.05);
    phys.velocity = Math.max(-6, Math.min(6, instantVel));

    // Only flip scene direction once user reaches near the opposite side
    if (rawP >= 0.85) directionRef.current = "to-night";
    else if (rawP <= 0.15) directionRef.current = "to-day";
    else if (drag.startP >= 0.85) directionRef.current = "to-day";
    else if (drag.startP <= 0.15) directionRef.current = "to-night";
  };

  const finishPointerInteraction = (
    e: PointerEvent<HTMLDivElement>,
    cancelled: boolean
  ) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    drag.active = false;
    if (shellRef.current) {
      delete shellRef.current.dataset.dragging;
      if (shellRef.current.hasPointerCapture(e.pointerId)) {
        shellRef.current.releasePointerCapture(e.pointerId);
      }
    }

    const phys = physicsRef.current;
    phys.isDragging = false;

    if (cancelled) {
      const revertNight = currentNightRef.current;
      setSpringTarget(phys, revertNight ? 1 : 0, RELEASE_SPRING);
      return;
    }

    if (!drag.hasMoved) {
      // Pure click toggles Day <-> Night
      commitToggleState(!currentNightRef.current, CLICK_SPRING);
      return;
    }

    // Drag release: snap past 0.5 (with subtle flick velocity assist)
    const projectedP = clamp01(phys.p) + phys.velocity * 0.06;
    const nextNight = projectedP >= 0.5;
    directionRef.current = nextNight ? "to-night" : "to-day";
    setSpringTarget(phys, nextNight ? 1 : 0, RELEASE_SPRING);

    if (!isControlled) {
      setInternalNight(nextNight);
    }
    if (nextNight !== currentNightRef.current) {
      onChangeRef.current?.(nextNight);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      commitToggleState(!currentNightRef.current, CLICK_SPRING);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (!currentNightRef.current) commitToggleState(true, CLICK_SPRING);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (currentNightRef.current) commitToggleState(false, CLICK_SPRING);
    }
  };

  const scale = size / REF_W;
  const widthPx = Math.round(size);
  const heightPx = Math.round(REF_H * scale);
  const insetPx = Math.max(2, Math.round(REF_INSET * scale));

  return (
    <div
      ref={shellRef}
      role="switch"
      aria-checked={currentNight}
      aria-label={ariaLabel}
      tabIndex={0}
      data-compact={size < 180 ? "true" : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finishPointerInteraction(e, false)}
      onPointerCancel={(e) => finishPointerInteraction(e, true)}
      onKeyDown={handleKeyDown}
      className={`pixel-lens-shell ${className}`}
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        padding: `${insetPx}px`,
      }}
    >
      <div ref={windowRef} className="pixel-lens-window">
        <canvas
          ref={sceneCanvasRef}
          aria-hidden="true"
          className="pixel-lens-scene"
        />
        <canvas
          ref={lensCanvasRef}
          aria-hidden="true"
          className="pixel-lens-overlay"
        />
        <div ref={recessRef} aria-hidden="true" className="pixel-lens-recess" />
      </div>
    </div>
  );
}

export default PixelLensToggle;
