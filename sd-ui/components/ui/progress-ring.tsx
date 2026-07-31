"use client";

interface ProgressRingProps {
  done: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export function ProgressRing({ done, total, size = 64, strokeWidth = 4.5, showLabel = true }: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth={strokeWidth}
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-sm text-foreground leading-none">{Math.round(pct * 100)}%</span>
          <span className="font-mono text-[9px] text-muted-foreground mt-0.5">done</span>
        </div>
      )}
    </div>
  );
}
