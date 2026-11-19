import { clamp01 } from "./palette";

export interface SpringPreset {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

export const CLICK_SPRING: SpringPreset = {
  stiffness: 420,
  damping: 34,
  mass: 0.9,
};

export const RELEASE_SPRING: SpringPreset = {
  stiffness: 260,
  damping: 26,
  mass: 1.0,
};

export interface PhysicsState {
  p: number;
  target: number;
  velocity: number;
  visualVelocity: number;
  preset: SpringPreset;
  isDragging: boolean;
  settled: boolean;
  settleTime: number;
}

export function createPhysicsState(initialNight: boolean): PhysicsState {
  const initialP = initialNight ? 1 : 0;
  return {
    p: initialP,
    target: initialP,
    velocity: 0,
    visualVelocity: 0,
    preset: CLICK_SPRING,
    isDragging: false,
    settled: true,
    settleTime: 10,
  };
}

/**
 * Applies soft rubber-band resistance outside [0, 1] (dragElastic = 0.05).
 */
export function applyDragElastic(rawP: number, elastic = 0.05): number {
  if (rawP < 0) return rawP * elastic;
  if (rawP > 1) return 1 + (rawP - 1) * elastic;
  return rawP;
}

export function setSpringTarget(
  state: PhysicsState,
  target: number,
  preset: SpringPreset
): void {
  const clamped = clamp01(target);
  if (Math.abs(clamped - state.target) > 0.0001 || state.isDragging) {
    state.target = clamped;
    state.preset = preset;
    state.isDragging = false;
    state.settled = false;
    state.settleTime = 0;
  }
}

export function stepPhysics(
  state: PhysicsState,
  dtRaw: number,
  reducedMotion: boolean
): void {
  const dt = Math.min(0.05, Math.max(0.001, dtRaw));

  if (state.isDragging) {
    state.settled = false;
    state.settleTime = 0;
    // Smooth low-pass filter on drag velocity for subtle lens stretch
    const alpha = 1 - Math.exp(-18 * dt);
    state.visualVelocity += (state.velocity - state.visualVelocity) * alpha;
    return;
  }

  if (reducedMotion) {
    const diff = state.target - state.p;
    if (Math.abs(diff) < 0.002) {
      state.p = state.target;
      state.velocity = 0;
      state.visualVelocity = 0;
      if (!state.settled) {
        state.settled = true;
        state.settleTime = 0;
      } else {
        state.settleTime += dt;
      }
      return;
    }
    const stepAmt = Math.min(Math.abs(diff), dt / 0.2);
    state.p += Math.sign(diff) * stepAmt;
    state.velocity = 0;
    state.visualVelocity = 0;
    state.settled = false;
    state.settleTime = 0;
    return;
  }

  // Fixed-substep semi-implicit Euler integration for frame-rate independence
  const subStep = 1 / 180;
  let remaining = dt;
  const { stiffness, damping, mass } = state.preset;

  while (remaining > 0) {
    const h = Math.min(remaining, subStep);
    const displacement = state.p - state.target;
    const force = -stiffness * displacement - damping * state.velocity;
    const accel = force / mass;
    state.velocity += accel * h;
    state.p += state.velocity * h;
    remaining -= h;
  }

  const velAlpha = 1 - Math.exp(-26 * dt);
  state.visualVelocity += (state.velocity - state.visualVelocity) * velAlpha;

  const isClose =
    Math.abs(state.p - state.target) < 0.0012 && Math.abs(state.velocity) < 0.008;

  if (isClose) {
    state.p = state.target;
    state.velocity = 0;
    state.visualVelocity *= Math.exp(-20 * dt);
    if (Math.abs(state.visualVelocity) < 0.005) state.visualVelocity = 0;
    if (!state.settled) {
      state.settled = true;
      state.settleTime = 0;
    } else {
      state.settleTime += dt;
    }
  } else {
    state.settled = false;
    state.settleTime = 0;
  }
}
