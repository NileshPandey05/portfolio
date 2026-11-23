import { useEffect, useLayoutEffect, useRef, useState } from "react";

type TransitionMode = "wipe" | "roll";

interface SlotState {
  current: string;
  prev: string | null;
  mode: TransitionMode;
  active: boolean;
}

interface AnimatedSlotProps {
  words: readonly string[];
  initialAnimation?: "wipe" | "none";
  minIntervalMs?: number;
  maxIntervalMs?: number;
  initialDelayMs?: number;
}

const EASE = "cubic-bezier(0.25, 1, 0.35, 1)";
const TRANSITION_MS = 1050;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function AnimatedSlot({
  words,
  initialAnimation = "none",
  minIntervalMs = 3400,
  maxIntervalMs = 5600,
  initialDelayMs = 2600,
}: AnimatedSlotProps) {
  const [slot, setSlot] = useState<SlotState>(() => ({
    current: words[0] ?? "",
    prev: null,
    mode: "wipe",
    active: initialAnimation === "none",
  }));

  const indexRef = useRef(0);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);

  // Measure current word width so the surrounding "·" separator glides smoothly
  useLayoutEffect(() => {
    if (measureRef.current) {
      setWidth(measureRef.current.offsetWidth);
    }
  }, [slot.current]);

  // Trigger initial left-to-right reveal on mount if requested
  useEffect(() => {
    if (initialAnimation !== "wipe") return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setSlot((s) => ({ ...s, active: true }));
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [initialAnimation]);

  // Randomized independent cycle that alternates/randomizes between wipe & roll
  useEffect(() => {
    if (words.length <= 1) return;

    let timerId = 0;
    let cleanupId = 0;
    let raf1 = 0;
    let raf2 = 0;
    let cancelled = false;

    const scheduleNext = (delay: number) => {
      timerId = window.setTimeout(() => {
        if (cancelled) return;

        // Pick a random next word (avoiding immediate repeat)
        let nextIdx = Math.floor(Math.random() * words.length);
        if (nextIdx === indexRef.current) {
          nextIdx = (indexRef.current + 1) % words.length;
        }
        const nextWord = words[nextIdx]!;
        indexRef.current = nextIdx;

        // Randomly choose either left-to-right wipe or vertical slot roll
        const nextMode: TransitionMode = Math.random() < 0.5 ? "wipe" : "roll";

        setSlot((s) => ({
          current: nextWord,
          prev: s.current,
          mode: nextMode,
          active: false,
        }));

        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            if (!cancelled) {
              setSlot((s) => ({ ...s, active: true }));
            }
          });
        });

        cleanupId = window.setTimeout(() => {
          if (!cancelled) {
            setSlot((s) => ({ ...s, prev: null }));
          }
        }, TRANSITION_MS + 40);

        scheduleNext(randomBetween(minIntervalMs, maxIntervalMs));
      }, delay);
    };

    scheduleNext(initialDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      window.clearTimeout(cleanupId);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [words, minIntervalMs, maxIntervalMs, initialDelayMs]);

  const currentStyle: React.CSSProperties =
    slot.mode === "wipe"
      ? {
          clipPath: slot.active ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
          opacity: slot.active ? 1 : 0.15,
          transition: `clip-path ${TRANSITION_MS}ms ${EASE}, opacity ${TRANSITION_MS}ms ${EASE}`,
        }
      : {
          transform: slot.active ? "translateY(0%)" : "translateY(75%)",
          opacity: slot.active ? 1 : 0,
          transition: `transform ${TRANSITION_MS}ms ${EASE}, opacity ${TRANSITION_MS}ms ${EASE}`,
        };

  const prevStyle: React.CSSProperties =
    slot.mode === "wipe"
      ? {
          clipPath: slot.active ? "inset(0 0 0 100%)" : "inset(0 0 0 0%)",
          opacity: slot.active ? 0 : 1,
          transition: `clip-path ${TRANSITION_MS}ms ${EASE}, opacity ${TRANSITION_MS * 0.9}ms ${EASE}`,
        }
      : {
          transform: slot.active ? "translateY(-75%)" : "translateY(0%)",
          opacity: slot.active ? 0 : 1,
          transition: `transform ${TRANSITION_MS}ms ${EASE}, opacity ${TRANSITION_MS * 0.85}ms ${EASE}`,
        };

  return (
    <span
      className="relative inline-block overflow-hidden align-bottom"
      style={{
        width: width !== undefined ? `${width}px` : undefined,
        height: "1.35em",
        transition: `width 700ms ${EASE}`,
      }}
    >
      {/* Hidden measurer for smooth width interpolation */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="invisible whitespace-nowrap inline-block"
      >
        {slot.current}
      </span>

      {/* Outgoing word */}
      {slot.prev !== null && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 whitespace-nowrap"
          style={prevStyle}
        >
          {slot.prev}
        </span>
      )}

      {/* Incoming / active word */}
      <span
        className="absolute left-0 top-0 whitespace-nowrap"
        style={currentStyle}
      >
        {slot.current}
      </span>
    </span>
  );
}

interface AnimatedTaglineProps {
  leftWords: readonly string[];
  rightWords: readonly string[];
  className?: string;
}

export function AnimatedTagline({
  leftWords,
  rightWords,
  className = "",
}: AnimatedTaglineProps) {
  return (
    <p className={`flex items-center flex-wrap gap-x-1.5 ${className}`}>
      <AnimatedSlot
        words={leftWords}
        initialAnimation="wipe"
        initialDelayMs={4200}
        minIntervalMs={5500}
        maxIntervalMs={8500}
      />
      <span aria-hidden="true" className="select-none opacity-70">
        ·
      </span>
      <AnimatedSlot
        words={rightWords}
        initialAnimation="none"
        initialDelayMs={3000}
        minIntervalMs={4800}
        maxIntervalMs={7800}
      />
    </p>
  );
}
