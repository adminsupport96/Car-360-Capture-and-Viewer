import { useCallback, useEffect, useState } from "react";

// iOS Safari doesn't support the Fullscreen API on arbitrary elements (only
// on <video>), so this degrades to `supported: false` there and the caller
// should just hide the toggle rather than show a button that silently fails.
export function useFullscreen() {
  const supported =
    typeof document !== "undefined" &&
    document.fullscreenEnabled === true &&
    typeof document.documentElement.requestFullscreen === "function";

  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && document.fullscreenElement != null,
  );

  useEffect(() => {
    if (!supported) return;
    const handler = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [supported]);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [supported]);

  return { supported, isFullscreen, toggle };
}
