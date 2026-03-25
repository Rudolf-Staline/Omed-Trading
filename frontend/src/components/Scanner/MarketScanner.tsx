import { useState, useMemo } from 'react'
import type { Opportunity } from '../../api/client'
import { useMarketStore } from '../../store/useMarketStore'
import { formatPrice } from '../../utils/format'

interface Props {
  opportunities: Opportunity[]
  isLoading: boolean
}

type SortKey = 'score' | 'symbol' | 'rsi' | 'adx'

const MARKET_OPTS = ['all', 'forex', 'crypto', 'indices', 'commodities']
const DIRECTION_OPTS = ['all', 'BUY', 'SELL']

export function MarketScanner({ opportunities, isLoading }: Props) {
  const { filterMarket, filterDirection, filterMinScore, setFilter, setOpportunity, setPage } = useMarketStore()
  const [sortKey, setSortKey]     = useState<SortKey>('score')
  const [sortAsc, setSortAsc]     = useState(false)
  const [selectedRow, setSelRow]  = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = [...opportunities]
    if (filterMarket !== 'all')     list = list.filter(o => o.market === filterMarket)
    if (filterDirection !== 'all')  list = list.filter(o => o.score.direction === filterDirection)
    if (filterMinScore > 0)         list = list.filter(o => o.score.total_score >= filterMinScore)

    list.sort((a, b) => {
      let va: number, vb: number
      switch (sortKey) {
        case 'score':  va = a.score.total_score; vb = b.score.total_score; break
        case 'rsi':    va = a.indicators.rsi ?? 0; vb = b.indicators.rsi ?? 0; break
        case 'adx':    va = a.indicators.adx ?? 0; vb = b.indicators.adx ?? 0; break
        default:       va = a.symbol.charCodeAt(0); vb = b.symbol.charCodeAt(0); break
      }
      return sortAsc ? va - vb : vb - va
    })

    return list
  }, [opportunities, filterMarket, filterDirection, filterMinScore, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const handleRowClick = (opp: Opportunity) => {
    setSelRow(opp.symbol)
    setOpportunity(opp)
    setPage('chart')
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span>{sortAsc ? '↑' : '↓'}</span> : <span style={{ opacity: 0.3 }}>↕</span>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Market filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {MARKET_OPTS.map(m => (
              <button key={m}
                onClick={() => setFilter('filterMarket', m)}
                className={`btn ${filterMarket === m ? 'btn-primary' : 'btn-ghost'}`}
                style={{ textTransform: 'capitalize', fontSize: 11 }}
              >{m === 'all' ? 'Tous' : m}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

          {/* Direction filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {DIRECTION_OPTS.map(d => (
              <button key={d}
                onClick={() => setFilter('filterDirection', d)}
                className={`btn ${
                  filterDirection === d
                    ? d === 'BUY' ? 'btn-bull' : d === 'SELL' ? 'btn-bear' : 'btn-primary'
                    : 'btn-ghost'
                }`}
                style={{ fontSize: 11 }}
              >{d === 'all' ? 'Tout' : d}</button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#787B86' }}>Score min:</span>
            <input
              type="range" min={0} max={90} step={5}
              value={filterMinScore}
              onChange={e => setFilter('filterMinScore', Number(e.target.value))}
              style={{ width: 80, accentColor: '#2962FF' }}
            />
            <span className="font-mono" style={{ fontSize: 11, color: '#D1D4DC', width: 24 }}>{filterMinScore}</span>
          </div>

          <span style={{ fontSize: 11, color: '#787B86' }}>
            {filtered.length} résultats
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#787B86' }}>
            <div className="spin" style={{ fontSize: 24, display: 'inline-block', marginBottom: 8 }}>⟳</div>
            <p style={{ margin: 0 }}>Analyse en cours...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#787B86' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <p style={{ margin: 0 }}>Aucun résultat</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="scanner-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('symbol')}>Symbole <SortIcon k="symbol" /></th>
                  <th>Marché</th>
                  <th>Prix</th>
                  <th>Direction</th>
                  <th onClick={() => toggleSort('score')} style={{ cursor: 'pointer' }}>
                    Score <SortIcon k="score" />
                  </th>
                  <th>Signal</th>
                  <th onClick={() => toggleSort('rsi')}>RSI <SortIcon k="rsi" /></th>
                  <th onClick={() => toggleSort('adx')}>ADX <SortIcon k="adx" /></th>
                  <th>MACD</th>
                  <th>Confiance</th>
                  <th>RR</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((opp) => {
                  const isBuy = opp.score.direction === 'BUY'
                  const macdBull = (opp.indicators.macd ?? 0) > (opp.indicators.macd_signal ?? 0)
                  const score   = opp.score.total_score

                  return (
                    <tr
                      key={opp.symbol}
                      className={selectedRow === opp.symbol ? 'selected' : ''}
                      onClick={() => handleRowClick(opp)}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: '#D1D4DC', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
                          {opp.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#787B86' }}>{opp.symbol}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, color: '#787B86', textTransform: 'capitalize' }}>
                          {opp.market}
                        </span>
                      </td>
                      <td style={{ color: '#D1D4DC' }}>{formatPrice(opp.trade_setup.entry)}</td>
                      <td>
                        <span className={`badge ${isBuy ? 'badge-bull' : 'badge-bear'}`}>
                          {opp.score.direction}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, color: score >= 75 ? 'var(--color-bull)' : score >= 55 ? 'var(--color-warn)' : 'var(--color-bear)' }}>
                            {score}
                          </span>
                          <div style={{ width: 40, height: 3, background: 'var(--color-bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${score}%`, height: '100%', background: score >= 75 ? 'var(--color-bull)' : 'var(--color-warn)' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)',
                          color: opp.score.signal_strength === 'FORT' ? 'var(--color-bull)' : opp.score.signal_strength === 'MODÉRÉ' ? 'var(--color-warn)' : '#787B86',
                        }}>
                          ● {opp.score.signal_strength}
                        </span>
                      </td>
                      <td style={{ color: (opp.indicators.rsi ?? 50) > 50 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                        {opp.indicators.rsi?.toFixed(1) ?? '—'}
                      </td>
                      <td style={{ color: (opp.indicators.adx ?? 0) > 25 ? 'var(--color-warn)' : '#D1D4DC' }}>
                        {opp.indicators.adx?.toFixed(1) ?? '—'}
                      </td>
                      <td style={{ color: macdBull ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                        {opp.indicators.macd !== undefined ? (macdBull ? '▲' : '▼') : '—'}
                      </td>
                      <td style={{ color: '#D1D4DC', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                        {opp.score.confidence}
                      </td>
                      <td style={{ color: 'var(--color-warn)' }}>
                        1:{opp.trade_setup.risk_reward.rr1}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
