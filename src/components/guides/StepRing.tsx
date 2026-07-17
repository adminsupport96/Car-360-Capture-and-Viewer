interface StepRingProps {
  targetCount: number;
  captured: number;
}

const CX = 60;
const CY = 60;
const R = 46;

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

// One dot per shot position, laid out clockwise starting at the bottom
// ("front") — matching a photographer who always starts facing the front of
// the car and steps to their own left all the way around. Position is
// derived purely from shot count and index, never a sensor reading, so
// unlike a heading needle it can't drift or jitter no matter how long the
// walk around the car takes.
export function StepRing({ targetCount, captured }: StepRingProps) {
  const step = 360 / targetCount;
  // Dots must not overlap even at the densest setting (36) — cap their
  // radius at a bit under half the chord length between neighbors.
  const chord = 2 * R * Math.sin(Math.PI / targetCount);
  const dotR = Math.max(2, Math.min(5, chord / 2 - 1));

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible">
      <circle
        cx={CX}
        cy={CY}
        r={R}
        className="fill-none stroke-white/15"
        strokeWidth={1.5}
      />

      {/* Top-view car silhouette, nose pointed at the front dot (bottom) —
          a visual anchor for which way the car is "facing" relative to the
          ring, so the angle of each position is obvious at a glance. */}
      <rect
        x={CX - 13}
        y={CY - 19}
        width={26}
        height={38}
        rx={9}
        className="fill-white/10 stroke-text-dim/70"
        strokeWidth={1.5}
      />
      <line
        x1={CX - 9}
        y1={CY - 3}
        x2={CX + 9}
        y2={CY - 3}
        className="stroke-text-dim/50"
        strokeWidth={1}
      />
      <path
        d={`M ${CX - 6} ${CY + 19} L ${CX} ${CY + 27} L ${CX + 6} ${CY + 19} Z`}
        className="fill-accent"
      />

      {Array.from({ length: targetCount }, (_, i) => {
        const angle = 180 + i * step;
        const p = polarToXY(angle, R);
        const done = i < captured;
        const next = i === captured;
        return (
          <g key={i}>
            {i === 0 && (
              <circle
                cx={p.x}
                cy={p.y}
                r={dotR + 3}
                className="fill-none stroke-accent/50"
                strokeWidth={1.5}
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={next ? dotR + 1.5 : dotR}
              className={
                done
                  ? "fill-accent"
                  : next
                    ? "fill-bg stroke-accent"
                    : "fill-white/20"
              }
              strokeWidth={next ? 2 : 0}
            />
          </g>
        );
      })}
    </svg>
  );
}
