import { useMarketStore, useAlertStore } from '../../store/useMarketStore'

type Page = 'dashboard' | 'scanner' | 'chart' | 'alerts' | 'watchlist' | 'history'

const NAV = [
  { page: 'dashboard'  as Page, icon: '📊', label: 'Dashboard' },
  { page: 'scanner'    as Page, icon: '🔍', label: 'Scanner' },
  { page: 'chart'      as Page, icon: '📈', label: 'Graphique' },
  { page: 'alerts'     as Page, icon: '🔔', label: 'Alertes' },
  { page: 'watchlist'  as Page, icon: '⭐', label: 'Watchlist' },
  { page: 'history'    as Page, icon: '📜', label: 'Historique' },
]

const MODE_LABELS: Record<string, string> = {
  scalping:    'Scalp',
  day_trading: 'Day',
  swing:       'Swing',
  position:    'Position',
}

export function Sidebar() {
  const { currentPage, setPage, scanMode, setScanMode } = useMarketStore()
  const { unread } = useAlertStore()

  return (
    <aside className="app-sidebar">
      {/* Mode Selector */}
      <div style={{ padding: '4px 8px 8px' }}>
        <div className="section-title">Mode</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(MODE_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setScanMode(k as any)}
              style={{
                padding: '5px 10px',
                borderRadius: 5,
                fontSize: 12,
                fontWeight: scanMode === k ? 600 : 400,
                cursor: 'pointer',
                border: 'none',
                textAlign: 'left',
                background: scanMode === k ? 'rgba(41,98,255,0.15)' : 'transparent',
                color: scanMode === k ? '#6695ff' : '#787B86',
                transition: 'all 0.15s',
              }}
            >{v}</button>
          ))}
        </div>
      </div>

      <hr className="divider" />

      {/* Navigation */}
      <div className="section-title">Navigation</div>
      {NAV.map(({ page, icon, label }) => (
        <button
          key={page}
          className={`nav-item ${currentPage === page ? 'active' : ''}`}
          onClick={() => setPage(page)}
        >
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span>{label}</span>
          {page === 'alerts' && unread > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: '#EF5350',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 8,
            }}>{unread}</span>
          )}
        </button>
      ))}

      <hr className="divider" style={{ marginTop: 'auto' }} />

      {/* Bottom links */}
      <div style={{ padding: '4px 0' }}>
        <div style={{ padding: '4px 12px', fontSize: 10, color: '#555' }}>
          Nexus Trading v1.0
        </div>
        <div style={{ padding: '2px 12px', fontSize: 10, color: '#444' }}>
          Données: Yahoo Finance · Binance
        </div>
      </div>
    </aside>
  )
}
