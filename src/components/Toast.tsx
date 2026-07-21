interface ToastProps {
  visible: boolean;
}

export function Toast({ visible }: ToastProps) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-3.5 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-bg-elevated-2 bg-bg-elevated px-4 py-2 text-sm text-text shadow-lg transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translate(-50%, ${visible ? "0" : "-8px"})`,
      }}
    >
      <span className="text-accent">✓</span>
      Saved successfully
    </div>
  );
}
