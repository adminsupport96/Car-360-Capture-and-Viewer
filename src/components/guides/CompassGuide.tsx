interface CompassGuideProps {
  targetCount: number;
  capturedRelativeHeadings: number[];
  currentRelative: number;
  nextTargetRelative: number;
  aligned: boolean;
}

const CX = 60;
const CY = 60;
const R = 48;

function toXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

export function CompassGuide({
  targetCount,
  capturedRelativeHeadings,
  currentRelative,
  nextTargetRelative,
  aligned,
}: CompassGuideProps) {
  const step = 360 / targetCount;
  const ticks = Array.from({ length: targetCount }, (_, i) => i * step);
  const needle = toXY(currentRelative, R * 0.82);
  const nextTarget = toXY(nextTargetRelative, R);

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible">
      <circle
        cx={CX}
        cy={CY}
        r={R}
        className="fill-none stroke-white/20"
        strokeWidth={1.5}
      />
      {ticks.map((angle, i) => {
        const inner = toXY(angle, R - 6);
        const outer = toXY(angle, R);
        return (
          <line
            key={i}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            className="stroke-white/30"
            strokeWidth={1.5}
          />
        );
      })}
      {capturedRelativeHeadings.map((angle, i) => {
        const p = toXY(angle, R);
        return <circle key={i} cx={p.x} cy={p.y} r={3} className="fill-accent" />;
      })}
      <circle
        cx={nextTarget.x}
        cy={nextTarget.y}
        r={5}
        className={aligned ? "fill-accent" : "fill-none stroke-accent"}
        strokeWidth={2}
      />
      <line
        x1={CX}
        y1={CY}
        x2={needle.x}
        y2={needle.y}
        strokeWidth={2.5}
        strokeLinecap="round"
        className={aligned ? "stroke-accent" : "stroke-text"}
      />
      <circle cx={CX} cy={CY} r={3} className="fill-text" />
    </svg>
  );
}
