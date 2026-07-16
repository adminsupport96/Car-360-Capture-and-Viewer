import { useEffect, useRef, useState } from "react";
import { normalizeAngle } from "../lib/heading";

// Reads device heading from whichever orientation event actually delivers
// data on this browser. iOS Safari's plain 'deviceorientation' gives a
// relative angle from a locally-captured baseline (no magnetometer needed —
// good, since compass heading is unreliable this close to a car's metal
// body). Android Chrome/Brave, however, fire 'deviceorientation' with
// alpha/beta/gamma all null and only deliver real data on
// 'deviceorientationabsolute' (magnetometer-based). We listen to both and
// keep whichever one first produces a non-null reading, so either platform
// works without hardcoding an assumption about which event is "the" one.
//
// On the 'deviceorientationabsolute' (Android) path, that magnetometer alpha
// is only used for tilt readout — walking a full circle around a car's metal
// body while orbit-capturing changes the local magnetic distortion at every
// step, so the compass heading itself drifts/jumps independent of how much
// you actually turned. Instead we integrate the raw gyroscope's rotation
// rate (devicemotion) into a relative heading: rotation rate isn't a magnetic
// bearing, just angular velocity, so it's immune to that interference. The
// trade-off is slow drift over a long session instead of jumps near metal —
// acceptable since each capture set recalibrates its own baseline anyway.
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

  const [heading, setHeading] = useState<number | null>(null);
  const [tilt, setTilt] = useState<Tilt | null>(null);
  const [permission, setPermission] = useState<PermissionState>(
    needsPermission ? "unknown" : "granted",
  );
  const listening = useRef(false);

  useEffect(() => {
    if (!active || !supported || permission !== "granted") return;

    const candidateEvents =
      "ondeviceorientationabsolute" in window
        ? ["deviceorientationabsolute", "deviceorientation"]
        : ["deviceorientation"];

    let chosenEvent: string | null = null;
    const handlers = new Map<string, (e: Event) => void>();

    // Only populated once we've settled on 'deviceorientationabsolute' (the
    // magnetometer path) — integrates devicemotion's rotation rate into a
    // relative heading instead, in place of that event's unreliable alpha.
    let gyroHeading = 0;
    let lastMotionTs: number | null = null;
    let motionHandler: ((e: DeviceMotionEvent) => void) | null = null;

    function startGyroHeading() {
      motionHandler = (e: DeviceMotionEvent) => {
        const rr = e.rotationRate;
        const acc = e.accelerationIncludingGravity;
        if (
          !rr ||
          !acc ||
          rr.alpha == null ||
          rr.beta == null ||
          rr.gamma == null ||
          acc.x == null ||
          acc.y == null ||
          acc.z == null
        )
          return;
        const now = e.timeStamp;
        if (lastMotionTs == null) {
          lastMotionTs = now;
          return;
        }
        const dt = (now - lastMotionTs) / 1000;
        lastMotionTs = now;
        // Guard against a huge gap (tab backgrounded then resumed) producing
        // one giant bogus jump in the integrated heading.
        if (dt <= 0 || dt > 0.5) return;

        // "Up" unit vector in device-local axes, from the gravity
        // component of acceleration (which points down when at rest).
        const gMag = Math.hypot(acc.x, acc.y, acc.z) || 1;
        const upX = -acc.x / gMag;
        const upY = -acc.y / gMag;
        const upZ = -acc.z / gMag;

        // rotationRate.{beta,gamma,alpha} is angular velocity around the
        // device's local {x,y,z} axes (deg/s). Projecting it onto the "up"
        // vector isolates rotation about the world-vertical axis — i.e. yaw
        // — regardless of how the phone is currently tilted, without ever
        // touching the magnetometer.
        const yawRateDegPerSec =
          rr.beta * upX + rr.gamma * upY + rr.alpha * upZ;
        gyroHeading = normalizeAngle(gyroHeading + yawRateDegPerSec * dt);
        setHeading(gyroHeading);
      };
      window.addEventListener("devicemotion", motionHandler);
    }

    for (const eventName of candidateEvents) {
      const handler = (e: Event) => {
        const orientation = e as DeviceOrientationEvent;
        if (orientation.alpha == null) return;
        if (chosenEvent == null) {
          chosenEvent = eventName;
          for (const [name, fn] of handlers) {
            if (name !== eventName) window.removeEventListener(name, fn);
          }
          if (eventName === "deviceorientationabsolute") startGyroHeading();
        } else if (chosenEvent !== eventName) {
          return;
        }
        if (chosenEvent !== "deviceorientationabsolute") {
          setHeading((360 - orientation.alpha) % 360);
        }
        if (orientation.beta != null && orientation.gamma != null) {
          setTilt({ beta: orientation.beta, gamma: orientation.gamma });
        }
      };
      handlers.set(eventName, handler);
      window.addEventListener(eventName, handler);
    }

    listening.current = true;
    return () => {
      for (const [name, fn] of handlers) window.removeEventListener(name, fn);
      if (motionHandler) window.removeEventListener("devicemotion", motionHandler);
      listening.current = false;
    };
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

  return { heading, tilt, supported, needsPermission, permission, requestPermission };
}
