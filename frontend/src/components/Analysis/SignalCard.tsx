import { motion } from 'framer-motion'
import type { Opportunity } from '../../api/client'
import { ScoreCircle } from './ScoreCircle'
import { formatPrice } from '../../utils/format'
import { useMarketStore } from '../../store/useMarketStore'

interface Props {
  opportunity: Opportunity
  rank?: number
}

const BREAKDOWN_LABELS: Record<string, string> = {
  trend_alignment:     'Alignement Multi-TF',
  momentum:            'Momentum',
  volume_confirmation: 'Volume',
  support_resistance:  'Support/Résistance',
  pattern_bonus:       'Patterns',
  volatility:          'Volatilité',
}

export function SignalCard({ opportunity: opp, rank }: Props) {
  const { setPage, setSelectedSymbol, setTimeframe } = useMarketStore()
  const isBuy = opp.score.direction === 'BUY'
  const color = isBuy ? 'var(--color-bull)' : 'var(--color-bear)'

  const handleChart = () => {
    setSelectedSymbol(opp.symbol)
    setTimeframe('1h')
    setPage('chart')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{
        overflow: 'hidden',
        border: `1px solid ${isBuy ? 'rgba(38,166,154,0.25)' : 'rgba(239,83,80,0.25)'}`,
      }}
    >
      {/* Header */}
      <div style={{
        background: isBuy ? 'rgba(38,166,154,0.06)' : 'rgba(239,83,80,0.06)',
        borderBottom: '1px solid var(--color-border)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {rank !== undefined && <div className={`rank-badge rank-${rank}`}>#{rank}</div>}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{opp.name}</h3>
            <span className={`badge ${isBuy ? 'badge-bull' : 'badge-bear'}`}>{opp.score.direction}</span>
            <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{opp.market}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#787B86' }}>
            <span>Signal: <strong style={{ color }}>{opp.score.signal_strength}</strong></span>
            <span>Confiance: <strong style={{ color }}>{opp.score.confidence}</strong></span>
          </div>
        </div>
        <ScoreCircle score={opp.score.total_score} size={64} />
      </div>

      <div style={{ padding: '16px' }}>
        {/* Trade Setup */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ padding: '0 0 8px', marginBottom: 8 }}>📊 Plan de Trade</div>
          <div className="trade-level entry">
            <span style={{ fontSize: 11, color: '#6695ff', width: 60, flexShrink: 0 }}>ENTRÉE</span>
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{formatPrice(opp.trade_setup.entry)}</span>
            <span style={{ fontSize: 10, color: '#787B86', marginLeft: 'auto' }}>
              Zone: {formatPrice(opp.trade_setup.entry_zone.min)} — {formatPrice(opp.trade_setup.entry_zone.max)}
            </span>
          </div>
          <div className="trade-level tp1">
            <span style={{ fontSize: 11, color: 'var(--color-bull)', width: 60, flexShrink: 0 }}>TP1</span>
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{formatPrice(opp.trade_setup.take_profits.tp1)}</span>
            <span style={{ fontSize: 10, color: '#787B86', marginLeft: 'auto' }}>
              RR 1:{opp.trade_setup.risk_reward.rr1} · Fermer 50%
            </span>
          </div>
          <div className="trade-level tp2">
            <span style={{ fontSize: 11, color: 'var(--color-bull)', width: 60, flexShrink: 0 }}>TP2</span>
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{formatPrice(opp.trade_setup.take_profits.tp2)}</span>
            <span style={{ fontSize: 10, color: '#787B86', marginLeft: 'auto' }}>
              RR 1:{opp.trade_setup.risk_reward.rr2} · Fermer 30%
            </span>
          </div>
          <div className="trade-level tp3">
            <span style={{ fontSize: 11, color: 'rgba(38,166,154,0.7)', width: 60, flexShrink: 0 }}>TP3</span>
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{formatPrice(opp.trade_setup.take_profits.tp3)}</span>
            <span style={{ fontSize: 10, color: '#787B86', marginLeft: 'auto' }}>Extension · Laisser courir 20%</span>
          </div>
          <div className="trade-level sl">
            <span style={{ fontSize: 11, color: 'var(--color-bear)', width: 60, flexShrink: 0 }}>STOP</span>
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{formatPrice(opp.trade_setup.stop_loss)}</span>
            <span style={{ fontSize: 10, color: '#787B86', marginLeft: 'auto' }}>
              Risque: {formatPrice(opp.trade_setup.pips_risk)} · ATR: {formatPrice(opp.trade_setup.atr)}
            </span>
          </div>
        </div>

        {/* Indicators */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ padding: '0 0 8px' }}>📉 Indicateurs Clés</div>
          <div className="indicator-grid">
            <IndicatorCell name="RSI(14)" value={opp.indicators.rsi?.toFixed(1)} signal={
              !opp.indicators.rsi ? 'neutral'
              : opp.indicators.rsi > 70 ? 'bearish'
              : opp.indicators.rsi < 30 ? 'bullish'
              : opp.indicators.rsi > 50 ? 'bullish' : 'bearish'
            } />
            <IndicatorCell name="MACD" value={
              opp.indicators.macd && opp.indicators.macd_signal
                ? (opp.indicators.macd > opp.indicators.macd_signal ? '▲ Haussier' : '▼ Baissier')
                : '—'
            } signal={
              opp.indicators.macd && opp.indicators.macd_signal
                ? (opp.indicators.macd > opp.indicators.macd_signal ? 'bullish' : 'bearish')
                : 'neutral'
            } />
            <IndicatorCell name="ADX" value={opp.indicators.adx?.toFixed(1)} signal={
              !opp.indicators.adx ? 'neutral'
              : opp.indicators.adx > 25 ? 'bullish' : 'neutral'
            } unit={opp.indicators.adx && opp.indicators.adx > 25 ? ' Fort' : ' Faible'} />
            <IndicatorCell name="Stoch K/D" value={
              opp.indicators.stoch_k && opp.indicators.stoch_d
                ? `${opp.indicators.stoch_k.toFixed(0)}/${opp.indicators.stoch_d.toFixed(0)}`
                : '—'
            } signal={
              !opp.indicators.stoch_k ? 'neutral'
              : (opp.indicators.stoch_k ?? 0) > 80 ? 'bearish'
              : (opp.indicators.stoch_k ?? 0) < 20 ? 'bullish' : 'neutral'
            } />
            <IndicatorCell name="BB%" value={opp.indicators.bb_percent?.toFixed(2)} signal={
              !opp.indicators.bb_percent ? 'neutral'
              : opp.indicators.bb_percent > 0.8 ? 'bearish'
              : opp.indicators.bb_percent < 0.2 ? 'bullish' : 'neutral'
            } />
            <IndicatorCell name="SuperTrend" value={
              opp.indicators.supertrend !== undefined
                ? (opp.indicators.supertrend >= 1 ? '↑ Haussier' : '↓ Baissier')
                : '—'
            } signal={opp.indicators.supertrend !== undefined
              ? (opp.indicators.supertrend >= 1 ? 'bullish' : 'bearish')
              : 'neutral'
            } />
          </div>
        </div>

        {/* Score Breakdown */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ padding: '0 0 8px' }}>🎯 Score Détaillé</div>
          {Object.entries(opp.score.breakdown).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: '#787B86' }}>{BREAKDOWN_LABELS[key] || key}</span>
                <span className="font-mono" style={{ fontSize: 11, fontWeight: 600, color: '#D1D4DC' }}>{val}/100</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${val}%`,
                  background: val >= 75 ? 'var(--color-bull)' : val >= 50 ? 'var(--color-warn)' : 'var(--color-bear)',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Patterns */}
        {(opp.patterns.length > 0 || opp.chart_patterns.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ padding: '0 0 8px' }}>🕯️ Patterns Détectés</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[...opp.patterns, ...opp.chart_patterns].map((p) => (
                <span key={p.name} style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: p.signal === 'bullish' ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)',
                  color: p.signal === 'bullish' ? 'var(--color-bull)' : 'var(--color-bear)',
                  border: `1px solid ${p.signal === 'bullish' ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)'}`,
                }}>
                  {p.signal === 'bullish' ? '▲' : '▼'} {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Management Plan */}
        {opp.trade_setup.management_plan.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ padding: '0 0 8px' }}>📋 Plan de Gestion</div>
            <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 6, padding: '10px 12px' }}>
              {opp.trade_setup.management_plan.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8,
                  padding: '4px 0',
                  borderBottom: i < opp.trade_setup.management_plan.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <span style={{ fontSize: 11, color: '#2962FF', fontWeight: 600, flexShrink: 0 }}>
                    {i + 1}.
                  </span>
                  <span style={{ fontSize: 11, color: '#D1D4DC' }}>{step.replace(/^\d+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Comment */}
        {opp.ai_comment && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ padding: '0 0 8px' }}>🤖 Analyse IA</div>
            <div style={{
              background: 'rgba(41,98,255,0.05)',
              border: '1px solid rgba(41,98,255,0.15)',
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 12,
              color: '#B0B3BB',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              {opp.ai_comment}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleChart}>
            📈 Voir le Graphique
          </button>
          <button className="btn btn-ghost">⭐</button>
          <button className="btn btn-ghost">🔔</button>
        </div>
      </div>
    </motion.div>
  )
}

function IndicatorCell({ name, value, signal, unit = '' }: {
  name: string; value?: string | number | null; signal: 'bullish' | 'bearish' | 'neutral'; unit?: string
}) {
  const color = signal === 'bullish' ? 'var(--color-bull)' : signal === 'bearish' ? 'var(--color-bear)' : '#D1D4DC'
  return (
    <div className="indicator-cell">
      <div style={{ fontSize: 10, color: '#787B86', marginBottom: 3 }}>{name}</div>
      <div className="font-mono" style={{ fontSize: 12, fontWeight: 600, color }}>
        {value ?? '—'}{unit}
      </div>
    </div>
  )
}
