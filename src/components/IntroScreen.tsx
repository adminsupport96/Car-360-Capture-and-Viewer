import { MODES } from "../modes";
import type { Mode } from "../types";

const QUALITY_OPTIONS: { n: number; label: string }[] = [
  { n: 8, label: "fastest" },
  { n: 12, label: "quick" },
  { n: 24, label: "smooth" },
  { n: 36, label: "buttery" },
];

interface IntroScreenProps {
  unitName: string;
  onUnitNameChange: (name: string) => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  targetCount: number;
  onTargetCountChange: (n: number) => void;
  onStart: () => void;
}

export function IntroScreen({
  unitName,
  onUnitNameChange,
  mode,
  onModeChange,
  targetCount,
  onTargetCountChange,
  onStart,
}: IntroScreenProps) {
  const canStart = unitName.trim().length > 0;

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto pt-[calc(var(--safe-top)+32px)] pr-7 pb-[calc(var(--safe-bottom)+28px)] pl-7 [-webkit-overflow-scrolling:touch] bg-bg">
      <div className="flex flex-col gap-6">
        <h1 className="m-0 font-display text-2xl font-bold">New capture</h1>

        <div className="flex flex-col gap-2">
          <label htmlFor="unit-name" className="text-xs text-text-dim">
            Unit name
          </label>
          <input
            id="unit-name"
            type="text"
            value={unitName}
            onChange={(e) => onUnitNameChange(e.target.value)}
            placeholder="e.g. Toyota Corolla 2021"
            className="rounded-2xl border border-bg-elevated-2 bg-bg-elevated px-4 py-3.5 text-base text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-dim">Frames for a full turn</div>
          <div className="grid grid-cols-4 gap-1.5">
            {QUALITY_OPTIONS.map(({ n, label }) => (
              <button
                key={n}
                type="button"
                onClick={() => onTargetCountChange(n)}
                className={`rounded-xl border px-1 py-3 text-center font-mono text-[13px] ${
                  targetCount === n
                    ? "border-accent bg-accent/16 text-accent"
                    : "border-bg-elevated-2 bg-bg-elevated text-text-dim"
                }`}
              >
                <span
                  className={`mb-0.5 block text-[17px] font-medium ${
                    targetCount === n ? "text-accent" : "text-text"
                  }`}
                >
                  {n}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-dim">Mode</div>
          <div className="flex gap-1.5 rounded-2xl border border-bg-elevated-2 bg-bg-elevated p-1">
            {(["exterior", "interior"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={`flex-1 rounded-[10px] px-1.5 py-2.5 font-mono text-[12.5px] transition-colors ${
                  mode === m
                    ? "bg-accent/16 text-accent"
                    : "bg-transparent text-text-dim"
                }`}
              >
                {MODES[m].fileLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="w-full rounded-2xl border-none bg-accent py-4.25 font-display text-base font-bold text-accent-ink disabled:opacity-40"
      >
        Start capturing
      </button>
    </div>
  );
}
