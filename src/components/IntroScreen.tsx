import { MODES } from "../modes";
import type { Mode } from "../types";

const QUALITY_OPTIONS: { n: number; label: string }[] = [
  { n: 8, label: "fastest" },
  { n: 12, label: "quick" },
];

interface IntroScreenProps {
  unitName: string;
  onUnitNameChange: (name: string) => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  targetCount: number;
  onTargetCountChange: (n: number) => void;
  onStart: () => void;
  onOpenLibrary: () => void;
}

export function IntroScreen({
  unitName,
  onUnitNameChange,
  mode,
  onModeChange,
  targetCount,
  onTargetCountChange,
  onStart,
  onOpenLibrary,
}: IntroScreenProps) {
  const canStart = unitName.trim().length > 0 && targetCount > 0;

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto pt-[calc(var(--safe-top)+32px)] pr-7 pb-[calc(var(--safe-bottom)+28px)] pl-7 [-webkit-overflow-scrolling:touch] bg-bg">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="m-0 font-display text-2xl font-bold">
            New capture
          </h1>
          <button
            type="button"
            onClick={onOpenLibrary}
            className="rounded-full border border-bg-elevated-2 bg-bg-elevated px-3 py-1.5 font-mono text-xs text-white"
          >
            Saved spins
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="unit-name"
            className="text-xs text-text-dim"
          >
            Unit name
          </label>
          <input
            id="unit-name"
            type="text"
            value={unitName}
            onChange={(e) => onUnitNameChange(e.target.value)}
            placeholder="e.g. Mirage-Red-ABC321"
            className="rounded-2xl border border-bg-elevated-2 bg-bg-elevated px-4 py-3.5 text-base text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-dim">
            Frames for a full turn
          </div>
          <div className="grid grid-cols-2 gap-1.5">
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
                {m === "exterior" && (
                  <div className="w-full flex justify-center items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="50px"
                      height="50px"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="white"
                        d="M16,6l3,4h2c1.11,0,2,0.89,2,2v3h-2c0,1.66-1.34,3-3,3s-3-1.34-3-3H9c0,1.66-1.34,3-3,3s-3-1.34-3-3H1v-3c0-1.11,0.89-2,2-2   l3-4H16 M10.5,7.5H6.75L4.86,10h5.64V7.5 M12,7.5V10h5.14l-1.89-2.5H12 M6,13.5c-0.83,0-1.5,0.67-1.5,1.5s0.67,1.5,1.5,1.5   s1.5-0.67,1.5-1.5S6.83,13.5,6,13.5 M18,13.5c-0.83,0-1.5,0.67-1.5,1.5s0.67,1.5,1.5,1.5s1.5-0.67,1.5-1.5S18.83,13.5,18,13.5z"
                      />
                      <rect fill="none" width="24" height="24" />
                    </svg>
                  </div>
                )}
                {m === "interior" && (
                  <div className="w-full flex justify-center items-center">
                    <svg
                      width="50px"
                      height="50px"
                      viewBox="0 0 800 800"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M 195 250
           C 230 205 300 185 400 185
           C 500 185 570 205 605 250
           L 588 268
           C 552 232 480 218 400 218
           C 320 218 248 232 212 268
           Z"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="4"
                      />

                      <rect
                        x="380"
                        y="215"
                        width="40"
                        height="30"
                        rx="6"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="3"
                      />

                      <path
                        d="M 212 268
                        C 178 284 136 302 102 332
                        C 70 361 46 393 34 420
                        C 28 434 32 448 44 456
                        C 56 464 72 462 84 452
                        C 108 432 132 412 152 385
                        C 150 350 165 310 195 278
                        Z"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="4"
                      />
                      <path
                        d="M 588 268
                        C 622 284 664 302 698 332
                        C 730 361 754 393 766 420
                        C 772 434 768 448 756 456
                        C 744 464 728 462 716 452
                        C 692 432 668 412 648 385
                        C 650 350 635 310 605 278
                        Z"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="4"
                      />

                      <path
                        d="M 152 385
           C 130 405 112 428 100 452
           C 92 470 88 486 87 500
           C 118 480 158 462 200 450
           C 198 425 195 400 190 378
           Z"
                        fill="#000000"
                        stroke="#ffffff"
                        stroke-width="4"
                      />

                      <path
                        d="M 648 385
           C 670 405 688 428 700 452
           C 708 470 712 486 713 500
           C 682 480 642 462 600 450
           C 602 425 605 400 610 378
           Z"
                        fill="#000000"
                        stroke="#ffffff"
                        stroke-width="4"
                      />

                      <path
                        d="M 195 385
           C 265 365 335 356 400 356
           C 465 356 535 365 605 385
           L 605 425
           C 535 408 465 400 400 400
           C 335 400 265 408 195 425
           Z"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="4"
                      />

                      <circle
                        cx="272"
                        cy="405"
                        r="70"
                        fill="#000000"
                        stroke="#ffffff"
                        stroke-width="4"
                      />
                      <circle
                        cx="272"
                        cy="405"
                        r="50"
                        fill="#ffffff"
                      />
                      <circle
                        cx="272"
                        cy="405"
                        r="19"
                        fill="#000000"
                      />
                      <path
                        d="M 272 386 L 272 356 L 262 356 L 262 386 Z"
                        fill="#000000"
                      />
                      <path
                        d="M 255 418 L 220 448 L 213 440 L 244 411 Z"
                        fill="#000000"
                      />
                      <path
                        d="M 289 418 L 324 448 L 331 440 L 300 411 Z"
                        fill="#000000"
                      />

                      <circle
                        cx="555"
                        cy="392"
                        r="24"
                        fill="#000000"
                        stroke="#ffffff"
                        stroke-width="4"
                      />
                      <circle
                        cx="555"
                        cy="392"
                        r="13"
                        fill="#ffffff"
                      />

                      <path
                        d="M 368 398
           L 432 398
           L 425 462
           L 375 462 Z"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="4"
                      />
                      <rect
                        x="386"
                        y="410"
                        width="28"
                        height="18"
                        rx="3"
                        fill="black"
                      />

                      <path
                        d="M 376 462
           L 424 462
           C 427 505 427 548 420 592
           L 380 592
           C 373 548 373 505 376 462 Z"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="4"
                      />
                      <circle cx="400" cy="500" r="14" fill="black" />

                      <path
                        d="M 100 452
           C 145 432 190 418 230 412
           C 248 445 258 480 256 518
           C 254 552 244 578 210 588
           C 170 598 128 592 98 574
           C 82 545 82 500 100 452 Z"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="4"
                      />

                      <path
                        d="M 700 452
           C 655 432 610 418 570 412
           C 552 445 542 480 544 518
           C 546 552 556 578 590 588
           C 630 598 672 592 702 574
           C 718 545 718 500 700 452 Z"
                        fill="white"
                        stroke="#ffffff"
                        stroke-width="4"
                      />
                    </svg>
                  </div>
                )}

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
