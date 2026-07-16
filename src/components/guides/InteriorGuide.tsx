export function InteriorGuide() {
  return (
    <svg
      className="block h-full w-full overflow-visible"
      viewBox="0 0 300 150"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle
        cx="150"
        cy="75"
        r="55"
        className="fill-none stroke-accent"
        strokeWidth={2.5}
        strokeDasharray="9 7"
        opacity={0.8}
        vectorEffect="non-scaling-stroke"
      />
      <path d="M150,15 L165,30 L135,30 Z" className="fill-accent" />
      <line
        x1="120"
        y1="75"
        x2="180"
        y2="75"
        className="stroke-white/50"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="150"
        y1="55"
        x2="150"
        y2="95"
        className="stroke-white/50"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="150" cy="75" r="3" className="fill-accent" />
    </svg>
  );
}
