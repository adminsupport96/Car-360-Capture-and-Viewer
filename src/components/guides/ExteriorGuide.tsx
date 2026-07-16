export function ExteriorGuide() {
  return (
    <svg
      className="block h-full w-full overflow-visible"
      viewBox="0 0 300 150"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Ground reference line */}
      <line
        x1="4"
        y1="120"
        x2="296"
        y2="120"
        className="stroke-white/40"
        strokeWidth={1.5}
        strokeDasharray="3 5"
        vectorEffect="non-scaling-stroke"
      />

      {/* Corner brackets — keep the car inside this frame */}
      <g
        className="stroke-white/60"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M16,32 L16,16 L34,16" />
        <path d="M266,16 L284,16 L284,32" />
        <path d="M16,118 L16,134 L34,134" />
        <path d="M266,134 L284,134 L284,118" />
      </g>

      {/* Vertical rotation axis — where the car's center/pivot should line up */}
      <line
        x1="150"
        y1="20"
        x2="150"
        y2="120"
        className="stroke-accent/50"
        strokeWidth={1.5}
        strokeDasharray="4 5"
        vectorEffect="non-scaling-stroke"
      />

      {/* Center crosshair */}
      <g
        className="stroke-accent"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      >
        <line x1="130" y1="75" x2="170" y2="75" />
        <line x1="150" y1="55" x2="150" y2="95" />
      </g>
      <circle
        cx="150"
        cy="75"
        r="7"
        className="fill-none stroke-accent"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="150" cy="75" r="2" className="fill-accent" />

      {/* Wheel alignment ticks on the baseline */}
      <g
        className="stroke-accent"
        strokeWidth={2.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        <line x1="80" y1="112" x2="80" y2="128" />
        <line x1="220" y1="112" x2="220" y2="128" />
      </g>
    </svg>
  );
}
