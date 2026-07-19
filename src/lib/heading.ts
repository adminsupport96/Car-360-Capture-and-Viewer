// How far beta/gamma (tilt) may drift from the first frame's tilt before a
// shot is considered "off level".
export const LEVEL_TOLERANCE_DEG = 12;

// Exponential moving average factor for smoothing raw tilt readings.
// Lower = smoother/slower to react, higher = snappier/noisier.
export const TILT_SMOOTHING_ALPHA = 0.15;

// Compass heading is noisier than tilt (walking + magnetic interference from
// the car body), but also needs to track real, intentional motion rather
// than suppress it — a bit snappier than tilt smoothing so the orbit
// progress arc doesn't lag noticeably behind the actual turn.
export const HEADING_SMOOTHING_ALPHA = 0.25;

// Orbit progress counts as "reached the next position" once the phone has
// turned this fraction of the ideal per-shot angle since the last capture —
// not 100%, since insisting on an exact match against a noisy sensor near a
// steel car body would make the indicator feel like it never lights up.
export const ORBIT_READY_FRACTION = 0.85;

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// Shortest signed delta to rotate `from` into `to`, in (-180, 180].
// Positive = turn clockwise (right), negative = turn counter-clockwise (left).
export function shortestDelta(from: number, to: number): number {
  return normalizeAngle(to - from + 180) - 180;
}

// One step of exponential smoothing on a circular (degrees) value, correctly
// handling the 359°->0° wraparound instead of naively lerping the raw numbers.
export function smoothAngle(prev: number, next: number, alpha: number): number {
  return normalizeAngle(prev + shortestDelta(prev, next) * alpha);
}
