export type Mode = "exterior" | "interior";

export type Screen = "intro" | "capture" | "viewer";

export interface Frame {
  src: string;
  // Device tilt (beta/gamma) at capture time, if available.
  tilt: { beta: number; gamma: number } | null;
  // Device compass heading (alpha, 0-360) at capture time, if available —
  // used to measure how far the phone rotated since the previous shot.
  heading: number | null;
}

export interface ModeCopy {
  fileLabel: string;
  fitLabel: string;
  hints: string[];
  doneHint: string;
  viewTitle: string;
  dragHint: string;
}
