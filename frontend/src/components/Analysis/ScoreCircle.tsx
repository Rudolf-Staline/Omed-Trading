interface Props {
  score: number
  size?: number
  showLabel?: boolean
}

export function ScoreCircle({ score, size = 56, showLabel = true }: Props) {
  const r        = (size - 8) / 2
  const circ     = 2 * Math.PI * r
  const pct      = Math.min(Math.max(score, 0), 100)
  const dash     = (pct / 100) * circ
  const offset   = circ - dash

  const color = score >= 75
    ? '#26A69A'
    : score >= 55
    ? '#FF9800'
    : '#EF5350'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: size * 0.24, fontWeight: 700, color, lineHeight: 1 }}>
          {Math.round(score)}
        </span>
        {showLabel && (
          <span style={{ fontSize: size * 0.155, color: '#787B86', lineHeight: 1 }}>/100</span>
        )}
      </div>
    </div>
  )
}
