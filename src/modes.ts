import type { Mode, ModeCopy } from "./types";

export const MODES: Record<Mode, ModeCopy> = {
  exterior: {
    eyebrow: "Car · 360°",
    titleLines: ["Circle", "the car."],
    sub: "Walk a circle around the car, snapping a photo every step or two, then drag to spin through it like a showroom shot.",
    ringHint:
      "walk a full circle around the car, phone at the same height each time",
    steps: [
      {
        n: "01",
        bold: "Park",
        rest: " with clear space to walk all the way around the car.",
      },
      {
        n: "02",
        bold: "Hold",
        rest: " your phone at a consistent height — chest height works well — the same for every shot.",
      },
      {
        n: "03",
        bold: "Fit",
        rest: " the car inside the on-screen guide, tap the shutter, then step sideways a little and repeat all the way around.",
      },
    ],
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
    eyebrow: "Cabin · 360°",
    titleLines: ["Spin", "the cabin."],
    sub: "Sit in the seat, turn slowly on the spot snapping a photo every step or two, then drag to look around the interior.",
    ringHint:
      "turn a full circle in your seat, phone at eye height each time",
    steps: [
      {
        n: "01",
        bold: "Sit",
        rest: " in the seat you want as the center of the panorama — driver's seat works well.",
      },
      {
        n: "02",
        bold: "Hold",
        rest: " your phone at eye height, arm relaxed, same position for every shot.",
      },
      {
        n: "03",
        bold: "Center",
        rest: " the crosshair, tap the shutter, then turn a little in place and repeat all the way around.",
      },
    ],
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
