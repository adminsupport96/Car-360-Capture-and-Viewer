import type { Mode, ModeCopy } from "./types";

export const MODES: Record<Mode, ModeCopy> = {
  exterior: {
    fileLabel: "Orbit",
    fitLabel: "line up the car with the outline",
    hints: [
      "Fit the car inside the guide, then tap to capture",
      "Nice. Step sideways a little, match the guide again, tap",
      "Keep circling — small step, tap, repeat",
      "You're going around nicely",
      "Halfway around — keep the same height and distance",
      "Almost a full circle",
      "Last few positions",
    ],
    doneHint: 'Full circle captured — tap "View spin" whenever',
    viewTitle: "Your spin",
    dragHint: "← drag to rotate →",
  },
  interior: {
    fileLabel: "Interior",
    fitLabel: "keep the phone level, rotate slowly",
    hints: [
      "Center the crosshair, then tap to capture",
      "Nice. Turn a little more, re-center, tap",
      "Keep turning — small rotation, tap, repeat",
      "You're going around nicely",
      "Halfway around — keep the phone at the same height",
      "Almost a full turn",
      "Last few positions",
    ],
    doneHint: 'Full turn captured — tap "View spin" whenever',
    viewTitle: "Your cabin view",
    dragHint: "← drag to look around →",
  },
};

export function getHintForProgress(
  mode: Mode,
  frameCount: number,
  targetCount: number,
): string {
  const { hints, doneHint } = MODES[mode];
  if (frameCount >= targetCount) return doneHint;
  const idx = Math.min(
    Math.floor((frameCount / targetCount) * (hints.length - 1)),
    hints.length - 1,
  );
  return hints[idx];
}
