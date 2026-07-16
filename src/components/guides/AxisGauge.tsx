interface AxisGaugeProps {
  label: string;
  delta: number;
  aligned: boolean;
}

const MAX_DISPLAY_DEG = 30;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function AxisGauge({ label, delta, aligned }: AxisGaugeProps) {
  const pct = clamp(delta, -MAX_DISPLAY_DEG, MAX_DISPLAY_DEG) / MAX_DISPLAY_DEG;
  const markerPercent = 50 + pct * 50;

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 shrink-0 font-mono text-[10px] text-text-dim">{label}</span>
      <div className="relative h-1.5 w-16 rounded-full bg-white/15">
        <div className="absolute top-1/2 left-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-white/40" />
        <div
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            aligned ? "bg-accent" : "bg-text"
          }`}
          style={{ left: `${markerPercent}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-text-dim">
        {Math.round(delta)}°
      </span>
    </div>
  );
}
