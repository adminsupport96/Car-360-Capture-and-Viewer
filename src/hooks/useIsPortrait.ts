import { useEffect, useState } from "react";

// Tracks live device orientation via matchMedia, so the rotation
// compensation in CaptureScreen only ever applies in portrait — a landscape
// device orientation already suits a landscape camera buffer fine on its own.
export function useIsPortrait() {
  const [isPortrait, setIsPortrait] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(orientation: portrait)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isPortrait;
}
