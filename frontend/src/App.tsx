import { useState, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

import { useWebSocket } from './hooks/useWebSocket'
import { useMarketStore } from './store/useMarketStore'
import { apiClient } from './api/client'

import { Header } from './components/Layout/Header'
import { Sidebar } from './components/Layout/Sidebar'
import { TopOpportunities } from './components/Dashboard/TopOpportunities'
import { MarketOverview } from './components/Dashboard/MarketOverview'
import { AlertsPanel } from './components/Dashboard/AlertsPanel'
import { SignalCard } from './components/Analysis/SignalCard'
import { TradingChart } from './components/Chart/TradingChart'
import { MarketScanner } from './components/Scanner/MarketScanner'

import './index.css'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } })

function NexusApp() {
  useWebSocket()

  const {
    currentPage, scanMode, scanResult,
    setScanResult, setScanning, isScanning,
    selectedOpportunity,
  } = useMarketStore()

  const [scanError, setScanError] = useState<string | null>(null)

  const handleScan = useCallback(async () => {
    setScanning(true)
    setScanError(null)
    try {
      const res = await apiClient.scan(scanMode)
      setScanResult(res.data)
    } catch (err: any) {
      setScanError(err?.message ?? 'Erreur lors du scan')
    } finally {
      setScanning(false)
    }
  }, [scanMode, setScanResult, setScanning])

  const top3   = scanResult?.top_3 ?? []
  const allOpp = scanResult?.all_opportunities ?? []

  return (
    <div className="app-shell">
      <Header onScan={handleScan} isScanning={isScanning} />
      <Sidebar />

      <main className="app-content">
        {scanError && (
          <div style={{
            background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: 6, padding: '8px 14px', marginBottom: 12,
            color: 'var(--color-bear)', fontSize: 12,
          }}>
            ⚠️ {scanError} — Vérifiez que le backend (port 8000) est démarré.
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── DASHBOARD ─────────────────────────────────────────── */}
          {currentPage === 'dashboard' && (
            <motion.div key="dashboard"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}
            >
              {/* Left: Top 3 */}
              <TopOpportunities opportunities={top3} isLoading={isScanning} />

              {/* Right: Overview + Alerts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <MarketOverview />
                <AlertsPanel />

                {/* Quick stats */}
                {scanResult && (
                  <div className="card" style={{ padding: '12px 16px' }}>
                    <div className="section-title" style={{ padding: '0 0 10px' }}>📊 Résumé du Dernier Scan</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                      <StatBlock label="Symboles" value={String(scanResult.symbols_scanned)} />
                      <StatBlock label="Signaux" value={String(scanResult.opportunities_found)} color="var(--color-bull)" />
                      <StatBlock label="Mode" value={scanResult.mode} color="#6695ff" />
                    </div>
                  </div>
                )}

                {/* No scan yet CTA */}
                {!scanResult && !isScanning && (
                  <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                    <h3 style={{ margin: '0 0 8px', color: '#D1D4DC' }}>Prêt à analyser les marchés</h3>
                    <p style={{ margin: '0 0 16px', color: '#787B86', fontSize: 12 }}>
                      Scanne tous les marchés simultanément et identifie les meilleures opportunités.
                    </p>
                    <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={handleScan}>
                      ⚡ Démarrer l'Analyse
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── SCANNER ───────────────────────────────────────────── */}
          {currentPage === 'scanner' && (
            <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#D1D4DC' }}>
                  🔍 Scanner de Marché
                </h1>
                <button className="btn btn-primary" onClick={handleScan} disabled={isScanning}>
                  {isScanning ? '⟳ Scan en cours...' : '🔄 Refaire le Scan'}
                </button>
              </div>
              <MarketScanner opportunities={allOpp} isLoading={isScanning} />
            </motion.div>
          )}

          {/* ── CHART ─────────────────────────────────────────────── */}
          {currentPage === 'chart' && (
            <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, height: '100%' }}
            >
              {/* Chart */}
              <div className="card" style={{ overflow: 'hidden', height: 'calc(100vh - 84px)', display: 'flex', flexDirection: 'column' }}>
                <TradingChart opportunity={selectedOpportunity} />
              </div>

              {/* Signal detail */}
              <div style={{ overflowY: 'auto', height: 'calc(100vh - 84px)' }}>
                {selectedOpportunity ? (
                  <SignalCard opportunity={selectedOpportunity} />
                ) : (
                  <div className="card" style={{ padding: 24, textAlign: 'center', color: '#787B86' }}>
                    <p>Sélectionnez une opportunité dans le Scanner pour voir son analyse complète.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ALERTS ────────────────────────────────────────────── */}
          {currentPage === 'alerts' && (
            <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AlertsFullPage />
            </motion.div>
          )}

          {/* ── WATCHLIST ─────────────────────────────────────────── */}
          {currentPage === 'watchlist' && (
            <motion.div key="watchlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WatchlistPage />
            </motion.div>
          )}

          {/* ── HISTORY ───────────────────────────────────────────── */}
          {currentPage === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HistoryPage allOpportunities={allOpp} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function StatBlock({ label, value, color = '#D1D4DC' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#787B86', marginBottom: 4 }}>{label}</div>
      <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color, textTransform: 'capitalize' }}>{value}</div>
    </div>
  )
}

function AlertsFullPage() {
  const { alerts } = useAlertStore()
  return (
    <div>
      <h1 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#D1D4DC' }}>🔔 Toutes les Alertes</h1>
      <div className="card">
        {alerts.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#787B86' }}>Aucune alerte.</div>
        ) : (
          alerts.map(a => (
            <div key={a.id} className="alert-item">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warn)', flexShrink: 0, marginTop: 4 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#D1D4DC' }}>{a.symbol}</div>
                <div style={{ fontSize: 11, color: '#787B86' }}>{a.message}</div>
                <div style={{ fontSize: 10, color: '#555' }}>{new Date(a.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function WatchlistPage() {
  const { scanResult } = useMarketStore()
  const [watchlist, setWatchlist] = useState<string[]>([])

  const remove = async (sym: string) => {
    await apiClient.removeWatch(sym)
    setWatchlist(w => w.filter(s => s !== sym))
  }

  const relatedOpps = scanResult?.all_opportunities.filter(o => watchlist.includes(o.symbol)) ?? []

  return (
    <div>
      <h1 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#D1D4DC' }}>⭐ Watchlist</h1>
      {watchlist.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: '#787B86' }}>
          <p>Votre watchlist est vide.</p>
          <p style={{ fontSize: 12 }}>Ajoutez des symboles depuis le Scanner ou les cartes de signaux.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {relatedOpps.map(opp => <SignalCard key={opp.symbol} opportunity={opp} />)}
        </div>
      )}
    </div>
  )
}

function HistoryPage({ allOpportunities }: { allOpportunities: any[] }) {
  return (
    <div>
      <h1 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#D1D4DC' }}>📜 Historique des Signaux</h1>
      <div className="card" style={{ overflow: 'hidden' }}>
        {allOpportunities.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#787B86' }}>
            Aucun historique. Lancez un scan pour générer des signaux.
          </div>
        ) : (
          <table className="scanner-table">
            <thead>
              <tr>
                <th>Symbole</th>
                <th>Direction</th>
                <th>Score</th>
                <th>Entrée</th>
                <th>Stop</th>
                <th>TP1</th>
                <th>RR</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {allOpportunities.map((opp, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, color: '#D1D4DC' }}>{opp.name}</td>
                  <td><span className={`badge ${opp.score.direction==='BUY'?'badge-bull':'badge-bear'}`}>{opp.score.direction}</span></td>
                  <td style={{ fontWeight: 700, color: opp.score.total_score>75?'var(--color-bull)':'var(--color-warn)' }}>{opp.score.total_score}</td>
                  <td>{opp.trade_setup.entry}</td>
                  <td style={{ color: 'var(--color-bear)' }}>{opp.trade_setup.stop_loss}</td>
                  <td style={{ color: 'var(--color-bull)' }}>{opp.trade_setup.take_profits.tp1}</td>
                  <td style={{ color: 'var(--color-warn)' }}>1:{opp.trade_setup.risk_reward.rr1}</td>
                  <td style={{ color: '#555', fontSize: 11 }}>{new Date(opp.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

import { useAlertStore } from './store/useMarketStore'

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <NexusApp />
    </QueryClientProvider>
  )
}
