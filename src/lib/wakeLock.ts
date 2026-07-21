let sentinel: WakeLockSentinel | null = null;

// iOS Safari aggressively suspends JS (killing in-flight fetches) once the
// screen locks or the tab backgrounds — on a slow connection the upload has
// more time to still be running when that happens. Holding a wake lock for
// its duration keeps the screen on so the request can actually finish.
export async function acquireWakeLock(): Promise<void> {
  if (!("wakeLock" in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
  } catch {
    // Not guaranteed (low battery, already backgrounded, etc.) — the upload
    // just proceeds without it.
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!sentinel) return;
  const s = sentinel;
  sentinel = null;
  await s.release().catch(() => {});
}
