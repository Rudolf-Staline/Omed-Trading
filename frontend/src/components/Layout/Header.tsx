import { useMarketStore } from '../../store/useMarketStore'

export function Header({ onScan, isScanning }: { onScan: () => void; isScanning: boolean }) {
  const { wsConnected, scanMode, scanResult, lastUpdate } = useMarketStore()

  return (
    <header className="app-header">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28,
          background: 'linear-gradient(135deg, #2962FF, #5B8DFF)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>⚡</div>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.5, color: '#D1D4DC' }}>
          NEXUS
        </span>
        <span style={{ fontSize: 11, fontWeight: 400, color: '#2962FF', letterSpacing: 1 }}>
          TRADING
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

      {/* Scan button */}
      <button
        className={`btn ${isScanning ? 'btn-ghost' : 'btn-primary'}`}
        onClick={onScan}
        disabled={isScanning}
        style={{ gap: 6 }}
      >
        {isScanning ? (
          <>
            <span className="spin" style={{ display: 'inline-block' }}>⟳</span>
            Analyse en cours...
          </>
        ) : (
          <>🔍 Lancer le Scan</>
        )}
      </button>

      {/* Scan result summary */}
      {scanResult && !isScanning && (
        <span style={{ fontSize: 11, color: '#787B86' }}>
          {scanResult.symbols_scanned} symboles · {scanResult.opportunities_found} signaux
        </span>
      )}

      {/* Last update */}
      {lastUpdate && (
        <span style={{ fontSize: 11, color: '#555' }}>
          Mis à jour: {lastUpdate.toLocaleTimeString()}
        </span>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* WS status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div className={`ws-dot pulse-dot ${wsConnected ? 'ws-connected' : 'ws-disconnected'}`} />
          <span style={{ fontSize: 11, color: wsConnected ? 'var(--color-bull)' : '#EF5350' }}>
            {wsConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </header>
  )
}
