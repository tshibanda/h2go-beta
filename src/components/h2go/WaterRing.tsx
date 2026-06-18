export function WaterRing({
  currentMl,
  goalMl,
  size = 196,
}: {
  currentMl: number;
  goalMl: number;
  size?: number;
}) {
  const pct = Math.min(currentMl / Math.max(goalMl, 1), 1);
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const currentL = (currentMl / 1000).toFixed(1);
  const goalL = (goalMl / 1000).toFixed(1);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#DBEAFE" strokeWidth="14" strokeLinecap="round" />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke="url(#ringGrad)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-display text-4xl font-bold text-foreground leading-none">
          {currentL}L
        </span>
        <span className="text-xs text-muted-foreground">of {goalL}L</span>
        <div className="flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full bg-primary-soft">
          <span className="text-xs">💧</span>
          <span className="text-xs text-primary font-semibold">{Math.round(pct * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
