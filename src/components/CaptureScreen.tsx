import { useEffect, useRef, useState } from "react";
import { MODES, getHintForProgress } from "../modes";
import type { Frame, Mode } from "../types";
import { useCamera } from "../hooks/useCamera";
import { useFullscreen } from "../hooks/useFullscreen";
import { drawToDataUrl } from "../lib/imageCapture";
import { ExteriorGuide } from "./guides/ExteriorGuide";
import { InteriorGuide } from "./guides/InteriorGuide";
import { StepRing } from "./guides/StepRing";

const RING_LEN = 289;

interface CaptureScreenProps {
  mode: Mode;
  frames: Frame[];
  targetCount: number;
  onCapture: (src: string) => void;
  onUndo: () => void;
  onClose: () => void;
  onDone: () => void;
}

export function CaptureScreen({
  mode,
  frames,
  targetCount,
  onCapture,
  onUndo,
  onClose,
  onDone,
}: CaptureScreenProps) {
  const copy = MODES[mode];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbstripRef = useRef<HTMLDivElement>(null);
  const { showFallback, resolution } = useCamera(true, videoRef);
  const {
    supported: fullscreenSupported,
    isFullscreen,
    toggle: toggleFullscreen,
  } = useFullscreen();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = thumbstripRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [frames.length]);

  // Lets you flip through shots taken so far to check framing/focus before
  // the orbit is even complete, rather than waiting for the full viewer.
  useEffect(() => {
    if (viewerIndex == null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewerIndex(null);
      if (e.key === "ArrowLeft") {
        setViewerIndex((i) => (i != null && i > 0 ? i - 1 : i));
      }
      if (e.key === "ArrowRight") {
        setViewerIndex((i) =>
          i != null && i < frames.length - 1 ? i + 1 : i,
        );
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewerIndex, frames.length]);

  function handleShutter() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.srcObject) return;
    const dataUrl = drawToDataUrl(
      canvas,
      video,
      video.videoWidth,
      video.videoHeight,
    );
    if (!dataUrl) return;
    onCapture(dataUrl);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = drawToDataUrl(
          canvas,
          img,
          img.width,
          img.height,
        );
        if (!dataUrl) return;
        onCapture(dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const pct = Math.min(frames.length / targetCount, 1);
  const dashoffset = RING_LEN * (1 - pct);
  const undoDisabled = frames.length === 0;
  const doneReady = frames.length >= targetCount;

  const hint = getHintForProgress(mode, frames.length, targetCount);

  const videoStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="bg-black"
          style={videoStyle}
        />

        <div className="absolute top-1/2 left-1/2 z-4 aspect-[16/8] w-[min(92%,560px)] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="hidden absolute top-[-30px] left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2.5 py-1 font-mono text-xs whitespace-nowrap text-white/85">
            {copy.fitLabel}
          </div>
          {mode === "exterior" ? (
            <ExteriorGuide />
          ) : (
            <InteriorGuide />
          )}
        </div>

        {showFallback && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg p-8 text-center">
            <p className="max-w-[30ch] text-sm leading-normal text-text-dim">
              Couldn't access the camera directly — pick photos from
              your camera app instead. Take one as you circle the car,
              come back, tap again for each position.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-none bg-accent px-5.5 py-3.5 font-display text-[15px] font-bold text-accent-ink"
            >
              Add a photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 z-5 flex items-start justify-between bg-linear-to-b from-black/55 to-transparent pt-[calc(var(--safe-top)+14px)] px-4 pb-10">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-black/40 px-2.5 py-1.5 font-mono text-sm backdrop-blur-md">
              <b className="text-accent">{frames.length}</b> /{" "}
              {targetCount}
            </div>
            {resolution && (
              <div className="rounded-full bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-text-dim backdrop-blur-md">
                {resolution.width}×{resolution.height}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {fullscreenSupported && (
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={
                  isFullscreen
                    ? "Exit full screen"
                    : "Enter full screen"
                }
                className="pointer-events-auto flex h-8.5 w-8.5 items-center justify-center rounded-full border-none bg-black/40 text-base text-text backdrop-blur-md"
              >
                {isFullscreen ? "⤡" : "⤢"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto flex h-8.5 w-8.5 items-center justify-center rounded-full border-none bg-black/40 text-base text-text backdrop-blur-md"
            >
              ✕
            </button>
          </div>
        </div>

        {/*
          Portrait: this whole guide sits centered below the hint banner, over the top
          of the framing guide (there's room — the guide box itself starts further down).
          Landscape: that same vertical space doesn't exist (the viewport is short), so the
          panel relocates to hug the LEFT edge instead, mirroring how the shutter controls
          already relocate to the right edge — keeping the center (where the actual framing
          crosshair lives) completely clear.
        */}
        <div
          className="pointer-events-none absolute top-[calc(var(--safe-top)+65px)] left-0 z-5 flex w-max max-w-[46vw] flex-col items-start gap-1.5 pl-[calc(var(--safe-left)+12px)]
            landscape:top-1/2 landscape:left-0 landscape:max-w-[34vw] landscape:-translate-y-1/2 landscape:items-start landscape:pl-[calc(var(--safe-left)+12px)]"
        >
          {/*
            Step-count progress ring: one dot per frame still to shoot, laid
            out by capture count alone, so the positions themselves can't
            drift or jitter regardless of magnetic interference from the car.
          */}
          <div className="pointer-events-auto h-16 w-16 shrink-0">
            <StepRing targetCount={targetCount} captured={frames.length} />
          </div>
        </div>

        {/*
          Portrait: bar pinned to the bottom edge, controls stacked vertically inside it.
          Landscape: same cluster instead hugs the right edge (thumb-reachable), laid out
          as a vertical strip — the video itself still fills the whole screen either way,
          only this control cluster relocates. Icons that read as text (the "View spin"
          label) are rotated in place so they stay legible; symmetric glyphs (✕, ↺, the
          circular shutter) don't need it.
        */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-5 flex flex-col items-center justify-end gap-3.5 bg-linear-to-t from-black/60 to-transparent px-5 pb-[calc(var(--safe-bottom)+22px)]
            landscape:inset-x-auto landscape:inset-y-0 landscape:right-0
            landscape:flex-row landscape:justify-center
            landscape:bg-linear-to-l
            landscape:px-0 landscape:py-5 landscape:pr-[calc(var(--safe-right)+18px)] landscape:pb-0"
        >
          <div className="w-full rounded-full bg-black/50 px-4 py-2 text-center text-sm whitespace-nowrap text-text backdrop-blur-md landscape:hidden">
            {hint}
          </div>

          <div
            ref={thumbstripRef}
            className="pointer-events-auto flex w-full gap-1.5 overflow-x-auto px-0.5 py-1
              landscape:max-h-[45%] landscape:w-auto landscape:flex-col landscape:overflow-x-visible landscape:overflow-y-auto landscape:px-1 landscape:py-0.5"
          >
            {frames.map((frame, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setViewerIndex(i)}
                aria-label={`View photo ${i + 1}`}
                className="h-[38px] w-[38px] shrink-0 rounded-lg border-none p-0"
              >
                <img
                  src={frame.src}
                  className="h-full w-full rounded-lg border border-white/15 object-cover"
                />
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex w-full items-center justify-center gap-6 landscape:w-auto landscape:flex-col">
            <button
              type="button"
              onClick={onUndo}
              disabled={undoDisabled}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-none bg-white/8 text-lg text-text disabled:opacity-30 landscape:rotate-90"
            >
              ↺
            </button>

            <div className="relative h-[78px] w-[78px] shrink-0">
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full -rotate-90"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  className="fill-none stroke-[4] stroke-white/15"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  strokeDasharray={RING_LEN}
                  strokeDashoffset={dashoffset}
                  className="fill-none stroke-[4] stroke-accent [stroke-linecap:round] transition-[stroke-dashoffset] duration-250 ease-out"
                />
              </svg>
              <button
                type="button"
                aria-label="Capture"
                onClick={handleShutter}
                className="absolute inset-[9px] rounded-full border-[3px] border-black bg-text active:bg-accent"
              />
            </div>

            <button
              type="button"
              onClick={onDone}
              disabled={!doneReady}
              className={`rounded-2xl border-none bg-accent px-6.5 py-3.5 font-display text-[15px] font-bold text-accent-ink transition-opacity duration-250
                landscape:flex landscape:h-14 landscape:w-14 landscape:items-center landscape:justify-center landscape:px-0 landscape:py-0 ${
                  doneReady
                    ? "opacity-100"
                    : "pointer-events-none opacity-35"
                }`}
            >
              <span className="landscape:block landscape:rotate-90 landscape:whitespace-nowrap">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-car-icon lucide-car"
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </span>
            </button>
          </div>
        </div>
        {viewerIndex != null && frames[viewerIndex] && (
          <div className="absolute inset-0 z-7 flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 pt-[calc(var(--safe-top)+14px)] pb-3">
              <div className="rounded-full bg-black/40 px-2.5 py-1.5 font-mono text-sm backdrop-blur-md">
                {viewerIndex + 1} / {frames.length}
              </div>
              <button
                type="button"
                onClick={() => setViewerIndex(null)}
                aria-label="Close preview"
                className="flex h-8.5 w-8.5 items-center justify-center rounded-full border-none bg-black/40 text-base text-text backdrop-blur-md"
              >
                ✕
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <img
                src={frames[viewerIndex].src}
                className="absolute inset-0 h-full w-full object-contain"
              />

              {viewerIndex > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setViewerIndex((i) => (i != null ? i - 1 : i))
                  }
                  aria-label="Previous photo"
                  className="absolute top-1/2 left-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-none bg-black/40 text-xl text-text backdrop-blur-md"
                >
                  ‹
                </button>
              )}
              {viewerIndex < frames.length - 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setViewerIndex((i) => (i != null ? i + 1 : i))
                  }
                  aria-label="Next photo"
                  className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-none bg-black/40 text-xl text-text backdrop-blur-md"
                >
                  ›
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
