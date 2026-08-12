export type Mode = "exterior" | "interior";

export type Screen = "intro" | "capture" | "viewer" | "library";

export interface Frame {
  src: string;
}

export interface ModeCopy {
  fileLabel: string;
  fitLabel: string;
  hints: string[];
  doneHint: string;
  viewTitle: string;
  dragHint: string;
}
