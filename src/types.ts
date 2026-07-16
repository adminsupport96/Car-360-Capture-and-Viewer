export type Mode = "exterior" | "interior";

export type Screen = "intro" | "capture" | "viewer";

export interface Frame {
  src: string;
  // Device heading (relative, gyroscope-derived) at capture time, if available.
  heading: number | null;
  // Device tilt (beta/gamma) at capture time, if available.
  tilt: { beta: number; gamma: number } | null;
}

export interface Step {
  n: string;
  bold: string;
  rest: string;
}

export interface ModeCopy {
  eyebrow: string;
  titleLines: [string, string];
  sub: string;
  ringHint: string;
  steps: Step[];
  fitLabel: string;
  hints: string[];
  doneHint: string;
  viewTitle: string;
  dragHint: string;
}
