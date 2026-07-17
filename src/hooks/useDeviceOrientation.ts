import { useEffect, useState } from "react";

type PermissionState = "unknown" | "granted" | "denied";

interface RequestPermissionFn {
  (): Promise<"granted" | "denied">;
}

function getRequestPermissionFn(): RequestPermissionFn | null {
  const ctor = window.DeviceOrientationEvent as unknown as {
    requestPermission?: RequestPermissionFn;
  };
  return typeof ctor?.requestPermission === "function"
    ? ctor.requestPermission
    : null;
}

export interface Tilt {
  beta: number; // front-back tilt
  gamma: number; // left-right tilt
}

export function useDeviceOrientation(active: boolean) {
  const supported =
    typeof window !== "undefined" && "DeviceOrientationEvent" in window;
  const needsPermission = supported && getRequestPermissionFn() !== null;

  const [tilt, setTilt] = useState<Tilt | null>(null);
  const [permission, setPermission] = useState<PermissionState>(
    needsPermission ? "unknown" : "granted",
  );

  useEffect(() => {
    if (!active || !supported || permission !== "granted") return;

    function handler(e: Event) {
      const orientation = e as DeviceOrientationEvent;
      if (orientation.beta != null && orientation.gamma != null) {
        setTilt({ beta: orientation.beta, gamma: orientation.gamma });
      }
    }
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [active, supported, permission]);

  async function requestPermission() {
    const fn = getRequestPermissionFn();
    if (!fn) {
      setPermission("granted");
      return;
    }
    try {
      const result = await fn();
      setPermission(result === "granted" ? "granted" : "denied");
    } catch {
      setPermission("denied");
    }
  }

  return { tilt, supported, needsPermission, permission, requestPermission };
}
