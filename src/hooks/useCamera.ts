import { useEffect, useRef, useState, type RefObject } from "react";

// Requests a high-resolution rear-camera stream so captured frames are
// noticeably sharper/larger than a default (often 640x480) getUserMedia call.
const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 2560 },
    height: { ideal: 1440 },
  },
  audio: false,
};

// `ideal` constraints are just a scoring hint — on many mobile browsers an
// aspectRatio ideal that isn't already the device's default is effectively a
// no-op, so the browser silently keeps whatever pre-cropped preview mode it
// would have picked anyway (narrower than the stock camera app's full-FOV
// photo mode). `exact` forces it to actually select a matching sensor mode.
// We try that first since it demonstrably fixes the "zoomed" preview; if a
// device genuinely can't produce 16:9, getUserMedia throws
// OverconstrainedError and we retry without it rather than surfacing the
// no-camera-access fallback for what's really just an aspect mismatch.
const VIDEO_CONSTRAINTS_WIDE: MediaStreamConstraints = {
  video: {
    ...(VIDEO_CONSTRAINTS.video as MediaTrackConstraints),
    aspectRatio: { exact: 16 / 9 },
  },
  audio: false,
};

export function useCamera(
  active: boolean,
  videoRef: RefObject<HTMLVideoElement | null>,
) {
  const [showFallback, setShowFallback] = useState(false);
  // The resolution the camera actually granted — read from the live track's
  // getSettings(), not the constraints we asked for. Mobile cameras commonly
  // ignore the portrait aspectRatio hint and hand back their native (often
  // landscape) sensor shape regardless, so this is the only way to know
  // what you're really getting on a given device.
  const [resolution, setResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setShowFallback(false);
    setResolution(null);

    // `mediaDevices` is only defined in secure contexts (https, or
    // localhost) — on a plain-http LAN address it's `undefined`, and calling
    // `.getUserMedia` on it would throw synchronously, outside any promise
    // chain, crashing the app instead of falling back gracefully.
    if (!navigator.mediaDevices) {
      setShowFallback(true);
      return;
    }

    navigator.mediaDevices
      .getUserMedia(VIDEO_CONSTRAINTS_WIDE)
      .catch(() => navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS))
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const settings = stream.getVideoTracks()[0]?.getSettings();
        if (settings?.width && settings?.height) {
          setResolution({ width: settings.width, height: settings.height });
        }
      })
      .catch(() => {
        if (!cancelled) setShowFallback(true);
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [active, videoRef]);

  return { showFallback, resolution };
}
