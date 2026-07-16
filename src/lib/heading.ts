export const ALIGN_TOLERANCE_DEG = 14;

// How far beta/gamma (tilt) may drift from the first frame's tilt before a
// shot is considered "off level".
export const LEVEL_TOLERANCE_DEG = 12;

// Exponential moving average factor for smoothing raw heading readings.
// Lower = smoother/slower to react, higher = snappier/noisier.
export const HEADING_SMOOTHING_ALPHA = 0.15;

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
