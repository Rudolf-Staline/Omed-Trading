import { motion } from 'framer-motion'
import type { Opportunity } from '../../api/client'
import { useMarketStore } from '../../store/useMarketStore'
import { ScoreCircle } from '../Analysis/ScoreCircle'
import { formatPrice, formatChange } from '../../utils/format'

interface Props {
  opportunities: Opportunity[]
  isLoading: boolean
}

export function TopOpportunities({ opportunities, isLoading }: Props) {
  const { setOpportunity, setPage, prices } = useMarketStore()

  const handleClick = (opp: Opportunity) => {
    setOpportunity(opp)
    setPage('chart')
  }

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-warn">⚡</span>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#D1D4DC', margin: 0 }}>
            Top 3 Opportunités
          </h2>
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 8, marginBottom: 8 }} />
        ))}
      </div>
    )
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-warn">⚡</span>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#D1D4DC', margin: 0 }}>
            Top 3 Opportunités
          </h2>
        </div>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#787B86' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <p style={{ margin: 0 }}>Aucune opportunité détectée.</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>Lancez un scan pour analyser les marchés.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-warn">⚡</span>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#D1D4DC', margin: 0 }}>
          Top 3 Opportunités du Moment
        </h2>
        <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>
          {opportunities.length} signaux
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opportunities.map((opp, idx) => {
          const isBuy   = opp.score.direction === 'BUY'
          const livePrice = prices[opp.symbol]
          const close   = livePrice?.price ?? opp.trade_setup.entry
          const changePct = livePrice?.change_pct

          return (
            <motion.div
              key={opp.symbol}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => handleClick(opp)}
              style={{
                background: 'var(--color-bg-elevated)',
                borderRadius: 8,
                padding: '14px 16px',
                cursor: 'pointer',
                border: `1px solid ${isBuy ? 'rgba(38,166,154,0.2)' : 'rgba(239,83,80,0.2)'}`,
                transition: 'all 0.2s ease',
              }}
              whileHover={{ scale: 1.01, boxShadow: isBuy ? '0 0 16px rgba(38,166,154,0.12)' : '0 0 16px rgba(239,83,80,0.12)' }}
            >
              {/* Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {/* Rank */}
                <div className={`rank-badge rank-${idx + 1}`}>#{idx + 1}</div>

                {/* Symbol & Market */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#D1D4DC' }}>{opp.name}</span>
                    <span className={`badge ${isBuy ? 'badge-bull' : 'badge-bear'}`}>{opp.score.direction}</span>
                    <span style={{ fontSize: 10, color: '#787B86', textTransform: 'uppercase' }}>
                      {opp.market}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 500, color: '#D1D4DC' }}>
                      {formatPrice(close)}
                    </span>
                    {changePct !== undefined && (
                      <span className={`font-mono`} style={{ fontSize: 11, color: changePct >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <ScoreCircle score={opp.score.total_score} size={52} />
              </div>

              {/* Score bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#787B86' }}>Confiance</span>
                  <span style={{ fontSize: 11, color: isBuy ? 'var(--color-bull)' : 'var(--color-bear)', fontWeight: 600 }}>
                    {opp.score.confidence}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${opp.score.total_score}%`,
                    background: isBuy
                      ? 'linear-gradient(90deg, #26A69A, #00BFA5)'
                      : 'linear-gradient(90deg, #EF5350, #FF1744)',
                  }} />
                </div>
              </div>

              {/* Quick Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <QuickStat label="Entrée" value={formatPrice(opp.trade_setup.entry)} />
                <QuickStat label="Stop" value={formatPrice(opp.trade_setup.stop_loss)} color="var(--color-bear)" />
                <QuickStat label="TP1" value={formatPrice(opp.trade_setup.take_profits.tp1)} color="var(--color-bull)" />
                <QuickStat label="RR" value={`1:${opp.trade_setup.risk_reward.rr1}`} color="var(--color-warn)" />
              </div>

              {/* Patterns */}
              {(opp.patterns.length > 0 || opp.chart_patterns.length > 0) && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[...opp.patterns, ...opp.chart_patterns].slice(0, 3).map((p) => (
                    <span key={p.name} style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: p.signal === 'bullish' ? 'rgba(38,166,154,0.12)' : 'rgba(239,83,80,0.12)',
                      color: p.signal === 'bullish' ? 'var(--color-bull)' : 'var(--color-bear)',
                      border: `1px solid ${p.signal === 'bullish' ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)'}`,
                    }}>
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function QuickStat({ label, value, color = '#D1D4DC' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', borderRadius: 5, padding: '6px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#787B86', marginBottom: 2 }}>{label}</div>
      <div className="font-mono" style={{ fontSize: 11, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}
