import { MODES } from "../modes";
import type { Mode } from "../types";

const QUALITY_OPTIONS: { n: number; label: string }[] = [
  { n: 8, label: "fastest" },
  { n: 12, label: "quick" },
  { n: 24, label: "smooth" },
  { n: 36, label: "buttery" },
];

interface IntroScreenProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  targetCount: number;
  onTargetCountChange: (n: number) => void;
  onStart: () => void;
}

export function IntroScreen({
  mode,
  onModeChange,
  targetCount,
  onTargetCountChange,
  onStart,
}: IntroScreenProps) {
  const copy = MODES[mode];

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto pt-[calc(var(--safe-top)+32px)] pr-7 pb-[calc(var(--safe-bottom)+28px)] pl-7 [-webkit-overflow-scrolling:touch] bg-[radial-gradient(circle_at_50%_18%,rgba(45,225,194,0.1),transparent_60%),var(--color-bg)]">
      <div className="flex flex-col gap-2">
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
              {m === "exterior"
                ? "Exterior orbit"
                : "Interior panorama"}
            </button>
          ))}
        </div>

        <div className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
          {copy.eyebrow}
        </div>
        <h1 className="m-0 font-display text-[clamp(26px,7vw,38px)] leading-[1.05] font-bold">
          {copy.titleLines[0]}
          <br />
          {copy.titleLines[1]}
        </h1>
        <p className="max-w-[34ch] text-[15px] leading-normal text-text-dim">
          {copy.sub}
        </p>
      </div>

      <div className="relative my-2.5 aspect-square w-[min(42vw,160px)] self-center">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            className="fill-none stroke-bg-elevated-2 stroke-[5]"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            strokeDasharray="283"
            className="fill-none stroke-[5] stroke-accent opacity-55 [stroke-linecap:round] [animation:spin_5s_linear_infinite]"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center px-5 text-center font-mono text-[13px] text-text-dim">
          {copy.ringHint}
        </div>
      </div>

      <div className="my-2 flex flex-col gap-2.5">
        {copy.steps.map((step) => (
          <div key={step.n} className="flex items-start gap-3">
            <span className="w-5 shrink-0 pt-px font-mono text-[13px] text-accent">
              {step.n}
            </span>
            <span className="text-sm leading-[1.45] text-text-dim">
              <b className="font-medium text-text">{step.bold}</b>
              {step.rest}
            </span>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 text-left text-xs text-text-dim">
          Frames for a full turn
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
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

      <div className="flex flex-col gap-3 mt-5">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-2xl border-none bg-accent py-[17px] font-display text-base font-bold text-accent-ink"
        >
          Start capture
        </button>
        <div className="text-center text-xs leading-[1.4] text-text-dim">
          Photos stay on this page only — closing the tab clears them.
        </div>
      </div>
    </div>
  );
}
