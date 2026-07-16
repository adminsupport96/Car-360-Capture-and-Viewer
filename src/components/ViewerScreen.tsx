import { useEffect, useRef, useState } from "react";
import { MODES } from "../modes";
import { saveAllFrames } from "../lib/saveFrames";
import type { Frame, Mode } from "../types";

const SENSITIVITY = 10; // px per frame step
const FRAME_SKIP_OPTIONS = [1, 2, 3, 4];

interface ViewerScreenProps {
  mode: Mode;
  frames: Frame[];
  onBackToCapture: () => void;
  onRestart: () => void;
}

export function ViewerScreen({
  mode,
  frames,
  onBackToCapture,
  onRestart,
}: ViewerScreenProps) {
  const copy = MODES[mode];
  const [curIdx, setCurIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frameSkip, setFrameSkip] = useState(1);
  const [dragHintVisible, setDragHintVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const accum = useRef(0);
  const playTimer = useRef<number | null>(null);
  const frameSkipRef = useRef(frameSkip);
  frameSkipRef.current = frameSkip;

  useEffect(() => {
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, []);

  function stopPlaying() {
    setPlaying(false);
    if (playTimer.current) {
      clearInterval(playTimer.current);
      playTimer.current = null;
    }
  }

  function togglePlay() {
    if (playing) {
      stopPlaying();
    } else {
      setPlaying(true);
      playTimer.current = window.setInterval(() => {
        setCurIdx((i) => (i + frameSkipRef.current) % frames.length);
      }, 90);
    }
  }

  async function handleSaveAll() {
    if (saving) return;
    setSaving(true);
    try {
      await saveAllFrames(frames);
    } finally {
      setSaving(false);
    }
  }

  function cycleFrameSkip() {
    const idx = FRAME_SKIP_OPTIONS.indexOf(frameSkip);
    setFrameSkip(FRAME_SKIP_OPTIONS[(idx + 1) % FRAME_SKIP_OPTIONS.length]);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    lastX.current = e.clientX;
    accum.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragHintVisible(false);
    stopPlaying();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    accum.current += dx;
    let next = curIdx;
    while (accum.current >= SENSITIVITY) {
      next = (next - 1 + frames.length) % frames.length;
      accum.current -= SENSITIVITY;
    }
    while (accum.current <= -SENSITIVITY) {
      next = (next + 1) % frames.length;
      accum.current += SENSITIVITY;
    }
    if (next !== curIdx) setCurIdx(next);
  }

  function endDrag() {
    dragging.current = false;
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex items-center justify-between px-4.5 pt-[calc(var(--safe-top)+14px)] pb-3">
        <div className="font-display text-lg font-bold">{copy.viewTitle}</div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs text-text-dim">
            {curIdx + 1} / {frames.length}
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="rounded-full border border-bg-elevated-2 bg-bg-elevated px-3 py-1 font-mono text-xs text-text-dim disabled:opacity-50"
          >
            {saving ? "saving…" : "save all"}
          </button>
        </div>
      </div>

      <div
        className="relative flex flex-1 touch-none items-center justify-center overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <img
          src={frames[curIdx].src}
          alt="frame"
          className="pointer-events-none max-h-full max-w-full object-contain [filter:drop-shadow(0_20px_40px_rgba(0,0,0,0.5))]"
        />
        <div
          className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/6 px-3 py-1.5 text-xs text-text-dim transition-opacity duration-400"
          style={{ opacity: dragHintVisible ? 1 : 0 }}
        >
          {copy.dragHint}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-[calc(var(--safe-bottom)+20px)]">
        <button
          type="button"
          onClick={cycleFrameSkip}
          className="rounded-full border border-bg-elevated-2 bg-bg-elevated px-3 py-1 font-mono text-xs text-text-dim"
        >
          play every {frameSkip === 1 ? "frame" : `${frameSkip} frames`}
        </button>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBackToCapture}
            className="flex h-13 w-13 items-center justify-center rounded-full border border-bg-elevated-2 bg-bg-elevated text-lg text-text"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-13 w-13 items-center justify-center rounded-full border-none bg-accent text-lg text-accent-ink"
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="bg-transparent border-none px-1 py-2 font-mono text-sm text-text-dim"
          >
            start over
          </button>
        </div>
      </div>
    </div>
  );
}
