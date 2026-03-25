import { motion, AnimatePresence } from 'framer-motion'
import { useAlertStore, useMarketStore } from '../../store/useMarketStore'

export function AlertsPanel() {
  const { alerts, unread, markRead } = useAlertStore()
  const { setPage } = useMarketStore()

  const handleOpen = () => {
    markRead()
    setPage('alerts')
  }

  return (
    <div className="card p-4">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span>🔔</span>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#D1D4DC', margin: 0 }}>
          Alertes Récentes
        </h2>
        {unread > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: '#EF5350',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 10,
          }}>{unread}</span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#787B86', fontSize: 12 }}>
          Aucune alerte. Lancez un scan pour en générer.
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {alerts.slice(0, 5).map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="alert-item"
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--color-warn)',
                flexShrink: 0, marginTop: 4,
              }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#D1D4DC' }}>{alert.symbol}</div>
                <div style={{ fontSize: 11, color: '#787B86', marginTop: 2 }}>{alert.message}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                  {new Date(alert.created_at).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {alerts.length > 5 && (
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 11 }} onClick={handleOpen}>
          Voir toutes les alertes ({alerts.length})
        </button>
      )}
    </div>
  )
}
