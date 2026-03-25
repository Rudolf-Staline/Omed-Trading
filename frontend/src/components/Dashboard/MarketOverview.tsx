import { useMarketStore } from '../../store/useMarketStore'

interface MarketSummary {
  label: string
  key: string
  symbols: string[]
  icon: string
}

const MARKETS: MarketSummary[] = [
  { label: 'Forex',       key: 'forex',       symbols: ['EURUSD=X','GBPUSD=X','USDJPY=X'],         icon: '💱' },
  { label: 'Crypto',      key: 'crypto',      symbols: ['BTC-USD','ETH-USD','SOL-USD'],             icon: '₿' },
  { label: 'Indices',     key: 'indices',     symbols: ['^GSPC','^IXIC','^GDAXI'],                  icon: '📈' },
  { label: 'Matières 1ère', key: 'commodities', symbols: ['GC=F','CL=F','SI=F'],                    icon: '🛢️' },
]

export function MarketOverview() {
  const { prices, scanResult } = useMarketStore()

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <span>🌐</span>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#D1D4DC', margin: 0 }}>
          Vue Globale
        </h2>
        {scanResult && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#787B86' }}>
            {scanResult.symbols_scanned} symboles · {scanResult.opportunities_found} signaux
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {MARKETS.map((market) => {
          const opps = scanResult?.all_opportunities.filter(o => o.market === market.key) ?? []
          const buys  = opps.filter(o => o.score.direction === 'BUY').length
          const sells = opps.filter(o => o.score.direction === 'SELL').length

          return (
            <div key={market.key} style={{
              background: 'var(--color-bg-elevated)',
              borderRadius: 8,
              padding: '12px',
              border: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{market.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#D1D4DC' }}>{market.label}</span>
              </div>

              {/* Sample prices from this market */}
              {market.symbols.map((sym) => {
                const p = prices[sym]
                if (!p) return (
                  <div key={sym} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#787B86' }}>{sym.replace('=X','').replace('-USD','')}</span>
                    <span className="skeleton" style={{ width: 60, height: 14, borderRadius: 3 }} />
                  </div>
                )
                return (
                  <div key={sym} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#787B86' }}>{p.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span className="font-mono" style={{ fontSize: 11, color: '#D1D4DC' }}>
                        {p.price.toFixed(p.price > 100 ? 2 : p.price > 1 ? 4 : 6)}
                      </span>
                      <span style={{ marginLeft: 6, fontSize: 10, color: p.change_pct >= 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
                        {p.change_pct >= 0 ? '+' : ''}{p.change_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Signals summary */}
              {opps.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                  {buys > 0 && (
                    <span className="badge badge-bull" style={{ fontSize: 10 }}>↑ {buys} BUY</span>
                  )}
                  {sells > 0 && (
                    <span className="badge badge-bear" style={{ fontSize: 10 }}>↓ {sells} SELL</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
