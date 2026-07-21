import { useEffect, useRef, useState } from "react";
import { MODES, getHintForProgress } from "../modes";
import type { Frame, Mode } from "../types";
import { useCamera } from "../hooks/useCamera";
import { useFullscreen } from "../hooks/useFullscreen";
import {
  useDeviceOrientation,
  type Tilt,
} from "../hooks/useDeviceOrientation";
import { drawToDataUrl } from "../lib/imageCapture";
import {
  HEADING_SMOOTHING_ALPHA,
  LEVEL_TOLERANCE_DEG,
  ORBIT_READY_FRACTION,
  TILT_SMOOTHING_ALPHA,
  shortestDelta,
  smoothAngle,
} from "../lib/heading";
import { ExteriorGuide } from "./guides/ExteriorGuide";
import { InteriorGuide } from "./guides/InteriorGuide";
import { StepRing } from "./guides/StepRing";
import { AxisGauge } from "./guides/AxisGauge";

const RING_LEN = 289;

interface CaptureScreenProps {
  mode: Mode;
  frames: Frame[];
  targetCount: number;
  onCapture: (
    src: string,
    tilt: Tilt | null,
    heading: number | null,
  ) => void;
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
  const {
    tilt,
    heading,
    supported: tiltSupported,
    needsPermission,
    permission,
    requestPermission,
  } = useDeviceOrientation(true);
  // The level guide is informational only — it never blocks the shutter.
  // This just controls whether the guide UI is shown at all.
  const [showGuide, setShowGuide] = useState(true);
  const [baseTilt, setBaseTilt] = useState<Tilt | null>(null);
  const [smoothedTilt, setSmoothedTilt] = useState<Tilt | null>(null);
  const [smoothedHeading, setSmoothedHeading] = useState<
    number | null
  >(null);
  const [motionTimedOut, setMotionTimedOut] = useState(false);

  useEffect(() => {
    const el = thumbstripRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [frames.length]);

  // Undoing back down to zero frames should also clear the tilt baseline —
  // otherwise the next shot would silently reuse the old starting tilt
  // instead of establishing a fresh one, even though every image is gone.
  useEffect(() => {
    if (frames.length === 0) {
      setBaseTilt(null);
    }
  }, [frames.length]);

  // Raw sensor readings are noisy, so smooth them with a circular EMA before
  // using them for anything — otherwise alignment feels "super sensitive"
  // and jittery.
  useEffect(() => {
    if (tilt == null) return;
    setSmoothedTilt((prev) =>
      prev == null
        ? tilt
        : {
            beta: smoothAngle(
              prev.beta,
              tilt.beta,
              TILT_SMOOTHING_ALPHA,
            ),
            gamma: smoothAngle(
              prev.gamma,
              tilt.gamma,
              TILT_SMOOTHING_ALPHA,
            ),
          },
    );
  }, [tilt]);

  useEffect(() => {
    if (heading == null) return;
    setSmoothedHeading((prev) =>
      prev == null
        ? heading
        : smoothAngle(prev, heading, HEADING_SMOOTHING_ALPHA),
    );
  }, [heading]);

  function calibrateStart() {
    if (smoothedTilt != null) setBaseTilt(smoothedTilt);
  }

  // The first frame you capture defines "level" — whatever tilt you're at
  // when you tap the shutter becomes the baseline everything else is
  // measured against, rather than wherever the sensor happened to settle
  // when the camera opened.
  function captureBaselineIfFirstFrame() {
    if (frames.length !== 0) return;
    if (smoothedTilt != null && baseTilt == null)
      setBaseTilt(smoothedTilt);
  }

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
    captureBaselineIfFirstFrame();
    onCapture(dataUrl, smoothedTilt, smoothedHeading);
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
        captureBaselineIfFirstFrame();
        onCapture(dataUrl, smoothedTilt, smoothedHeading);
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

  const tiltActive =
    tiltSupported && (!needsPermission || permission === "granted");

  // On some iOS versions, `DeviceOrientationEvent.requestPermission` isn't
  // exposed at all when the device-wide Settings > Safari > Motion &
  // Orientation Access toggle is off — our permission model then wrongly
  // treats access as already granted, and events simply never arrive, with
  // no error to react to. Surface a hint after a few seconds of silence
  // rather than leaving "Waiting for motion sensor…" up forever.
  useEffect(() => {
    if (!tiltActive || smoothedTilt != null) {
      setMotionTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setMotionTimedOut(true), 4000);
    return () => window.clearTimeout(timer);
  }, [tiltActive, smoothedTilt]);

  // Orbit progress: how far the phone has turned since the *previous* shot,
  // as a fraction of the ideal per-shot angle — not an absolute compass
  // reading, which would drift near the car's steel body (and, for interior
  // shots, the cabin's own electronics/speaker magnets). Applies to both
  // modes: exterior is walking a circle while facing the car, interior is
  // rotating the phone in place — either way it's the same yaw rotation.
  const orbitStep = 360 / targetCount;
  const lastCaptureHeading =
    frames.length > 0 ? frames[frames.length - 1].heading : null;
  const headingActive = tiltActive && smoothedHeading != null;
  const orbitDelta =
    headingActive && lastCaptureHeading != null
      ? shortestDelta(lastCaptureHeading, smoothedHeading)
      : null;
  const orbitProgress =
    orbitDelta != null ? Math.abs(orbitDelta) / orbitStep : null;
  const orbitReady =
    orbitProgress != null && orbitProgress >= ORBIT_READY_FRACTION;

  const orbitHint =
    headingActive && frames.length > 0 && frames.length < targetCount
      ? orbitReady
        ? "Aligned — tap to capture"
        : `${Math.max(1, Math.round(orbitStep - Math.abs(orbitDelta ?? 0)))}° more — keep moving`
      : null;
  const hint =
    orbitHint ?? getHintForProgress(mode, frames.length, targetCount);

  const tiltDelta =
    baseTilt != null && smoothedTilt != null
      ? {
          beta: shortestDelta(baseTilt.beta, smoothedTilt.beta),
          gamma: shortestDelta(baseTilt.gamma, smoothedTilt.gamma),
        }
      : null;
  const xAligned =
    tiltDelta == null ||
    Math.abs(tiltDelta.gamma) <= LEVEL_TOLERANCE_DEG;
  const yAligned =
    tiltDelta == null ||
    Math.abs(tiltDelta.beta) <= LEVEL_TOLERANCE_DEG;
  const levelAligned = xAligned && yAligned;

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
            {tiltSupported && (
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className={`pointer-events-auto rounded-full border px-2.5 py-1.5 font-mono text-xs backdrop-blur-md ${
                  showGuide
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-white/20 bg-black/40 text-text-dim"
                }`}
              >
                Guide {showGuide ? "on" : "off"}
              </button>
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
            The live arc between dots (when heading tracking is active) is
            the only sensor-driven part — a relative reading since the last
            shot, not an absolute compass bearing.
          */}
          <div className="pointer-events-auto h-16 w-16 shrink-0">
            <StepRing
              targetCount={targetCount}
              captured={frames.length}
              nextProgress={
                headingActive ? (orbitProgress ?? 0) : undefined
              }
            />
          </div>

          {tiltSupported && showGuide && (
            <>
              {needsPermission && permission === "unknown" && (
                <button
                  type="button"
                  onClick={requestPermission}
                  className="pointer-events-auto rounded-full border border-white/20 bg-black/50 px-3.5 py-2 font-mono text-xs whitespace-nowrap text-text backdrop-blur-md landscape:whitespace-normal landscape:text-center"
                >
                  Enable level guide
                </button>
              )}

              {permission === "denied" && (
                <div className="pointer-events-auto max-w-[26ch] rounded-2xl bg-black/50 px-3 py-2 text-center font-mono text-[11px] leading-snug whitespace-normal text-text-dim backdrop-blur-md">
                  Motion access is off, so the level guide can't run.
                  iOS: Settings → Safari → Motion &amp; Orientation
                  Access. Android: Site settings → Motion sensors.
                  <button
                    type="button"
                    onClick={() => setShowGuide(false)}
                    className="mt-1 block w-full underline"
                  >
                    dismiss
                  </button>
                </div>
              )}

              {tiltActive && smoothedTilt == null && !motionTimedOut && (
                <div className="pointer-events-auto rounded-full bg-black/50 px-3 py-1 font-mono text-xs whitespace-nowrap text-text-dim backdrop-blur-md landscape:whitespace-normal landscape:text-center">
                  Waiting for motion sensor…
                </div>
              )}

              {tiltActive && smoothedTilt == null && motionTimedOut && (
                <div className="pointer-events-auto max-w-[26ch] rounded-2xl bg-black/50 px-3 py-2 text-center font-mono text-[11px] leading-snug whitespace-normal text-text-dim backdrop-blur-md">
                  No motion data yet. On iPhone, check Settings → Safari →
                  Motion &amp; Orientation Access is on, then reload.
                  <button
                    type="button"
                    onClick={() => setShowGuide(false)}
                    className="mt-1 block w-full underline"
                  >
                    dismiss
                  </button>
                </div>
              )}

              {tiltActive &&
                smoothedTilt != null &&
                baseTilt == null && (
                  <div className="hidden pointer-events-auto rounded-full bg-black/50 px-3 py-1 font-mono text-xs whitespace-nowrap text-text-dim backdrop-blur-md landscape:whitespace-normal landscape:text-center">
                    Tap capture to set your starting level
                  </div>
                )}

              {tiltActive && tiltDelta != null && (
                <>
                  <div className=" pointer-events-auto rounded-xl bg-black/50 px-2.5 py-2 backdrop-blur-md">
                    <AxisGauge
                      label="X"
                      delta={tiltDelta.gamma}
                      aligned={xAligned}
                    />
                    <AxisGauge
                      label="Y"
                      delta={tiltDelta.beta}
                      aligned={yAligned}
                    />
                  </div>
                  <div
                    className={`pointer-events-auto rounded-full px-3 py-1 font-mono text-xs whitespace-nowrap backdrop-blur-md landscape:whitespace-normal landscape:text-center ${
                      levelAligned
                        ? "bg-accent/20 text-accent"
                        : "bg-black/50 text-text"
                    }`}
                  >
                    {levelAligned
                      ? "Aligned — tap to capture"
                      : "Match your starting tilt"}
                  </div>
                  <button
                    type="button"
                    onClick={calibrateStart}
                    className="pointer-events-auto font-mono text-[11px] text-text-dim underline"
                  >
                    calibrate start here
                  </button>
                </>
              )}
            </>
          )}
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
          <div
            className={`w-full rounded-full px-4 py-2 text-center text-sm whitespace-nowrap backdrop-blur-md transition-opacity landscape:hidden ${
              orbitReady ? "bg-accent/20 text-accent" : "bg-black/50 text-text"
            }`}
          >
            {hint}
          </div>

          <div
            ref={thumbstripRef}
            className="pointer-events-auto flex w-full gap-1.5 overflow-x-auto px-0.5 py-1
              landscape:max-h-[45%] landscape:w-auto landscape:flex-col landscape:overflow-x-visible landscape:overflow-y-auto landscape:px-1 landscape:py-0.5"
          >
            {frames.map((frame, i) => (
              <img
                key={i}
                src={frame.src}
                className="h-[38px] w-[38px] shrink-0 rounded-lg border border-white/15 object-cover"
              />
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
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
