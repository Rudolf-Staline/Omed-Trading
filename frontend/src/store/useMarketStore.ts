import { create } from 'zustand'
import type { Opportunity, ScanResult } from '../api/client'

interface Price {
  symbol: string
  name: string
  price: number
  change_pct: number
}

type ScanMode = 'scalping' | 'day_trading' | 'swing' | 'position'
type Page = 'dashboard' | 'scanner' | 'chart' | 'alerts' | 'watchlist' | 'history'

interface MarketState {
  // Data
  scanResult: ScanResult | null
  prices: Record<string, Price>
  selectedSymbol: string | null
  selectedTimeframe: string
  selectedOpportunity: Opportunity | null

  // UI
  currentPage: Page
  scanMode: ScanMode
  isScanning: boolean
  wsConnected: boolean
  lastUpdate: Date | null

  // Filters (scanner page)
  filterMarket: string
  filterDirection: string
  filterMinScore: number

  // Actions
  setScanResult:     (r: ScanResult) => void
  updatePrices:      (prices: Price[]) => void
  setSelectedSymbol: (s: string | null) => void
  setTimeframe:      (tf: string) => void
  setOpportunity:    (o: Opportunity | null) => void
  setPage:           (p: Page) => void
  setScanMode:       (m: ScanMode) => void
  setScanning:       (b: boolean) => void
  setWsConnected:    (b: boolean) => void
  setFilter:         (key: 'filterMarket' | 'filterDirection' | 'filterMinScore', val: string | number) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  scanResult:          null,
  prices:              {},
  selectedSymbol:      null,
  selectedTimeframe:   '1h',
  selectedOpportunity: null,
  currentPage:         'dashboard',
  scanMode:            'day_trading',
  isScanning:          false,
  wsConnected:         false,
  lastUpdate:          null,
  filterMarket:        'all',
  filterDirection:     'all',
  filterMinScore:      0,

  setScanResult:     (r) => set({ scanResult: r, lastUpdate: new Date() }),
  updatePrices:      (arr) => set((s) => {
    const next = { ...s.prices }
    arr.forEach((p) => { next[p.symbol] = p })
    return { prices: next }
  }),
  setSelectedSymbol: (s) => set({ selectedSymbol: s }),
  setTimeframe:      (tf) => set({ selectedTimeframe: tf }),
  setOpportunity:    (o) => set({ selectedOpportunity: o }),
  setPage:           (p) => set({ currentPage: p }),
  setScanMode:       (m) => set({ scanMode: m }),
  setScanning:       (b) => set({ isScanning: b }),
  setWsConnected:    (b) => set({ wsConnected: b }),
  setFilter:         (key, val) => set({ [key]: val } as any),
}))

interface AlertState {
  alerts: Array<{ id: number; symbol: string; type: string; message: string; created_at: string }>
  unread: number
  addAlert: (a: any) => void
  markRead:  () => void
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unread: 0,
  addAlert: (a) => set((s) => ({ alerts: [a, ...s.alerts].slice(0, 100), unread: s.unread + 1 })),
  markRead: () => set({ unread: 0 }),
}))
