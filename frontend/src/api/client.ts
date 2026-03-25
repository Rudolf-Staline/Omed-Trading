import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 60000 })

export interface Opportunity {
  symbol: string
  name: string
  market: string
  score: {
    total_score: number
    direction: 'BUY' | 'SELL'
    confidence: string
    signal_strength: string
    breakdown: Record<string, number>
  }
  trade_setup: {
    entry: number
    entry_zone: { min: number; max: number }
    stop_loss: number
    take_profits: { tp1: number; tp2: number; tp3: number }
    risk_reward: { rr1: number; rr2: number }
    position_size: number
    risk_amount: number
    pips_risk: number
    atr: number
    management_plan: string[]
  }
  indicators: {
    rsi?: number
    macd?: number
    macd_signal?: number
    adx?: number
    stoch_k?: number
    stoch_d?: number
    bb_percent?: number
    supertrend?: number
    close?: number
  }
  patterns: Array<{ name: string; signal: string; strength: number }>
  chart_patterns: Array<{ name: string; signal: string; strength: number }>
  support_resistance: { supports: number[]; resistances: number[] }
  fibonacci: { swing_high: number; swing_low: number; levels: Record<string, number> }
  pivots: Record<string, Record<string, number>>
  ohlcv: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>
  ai_comment: string
  timestamp: string
}

export interface ScanResult {
  top_3: Opportunity[]
  all_opportunities: Opportunity[]
  scan_time: string
  mode: string
  symbols_scanned: number
  opportunities_found: number
}

export interface ChartCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export const apiClient = {
  health:        () => api.get('/health'),
  scan:          (mode = 'day_trading', minScore = 55) =>
                   api.get<ScanResult>(`/scan/${mode}`, { params: { min_score: minScore } }),
  lastScan:      () => api.get<ScanResult>('/last_scan'),
  analyzeSymbol: (symbol: string, tf = '1h') =>
                   api.get<Opportunity>(`/analyze/${encodeURIComponent(symbol)}`, { params: { timeframe: tf } }),
  chartData:     (symbol: string, tf = '1h', periods = 200) =>
                   api.get(`/chart/${encodeURIComponent(symbol)}`, { params: { timeframe: tf, periods } }),
  prices:        () => api.get('/prices'),
  watchlist:     () => api.get('/watchlist'),
  addWatch:      (s: string) => api.post(`/watchlist/${encodeURIComponent(s)}`),
  removeWatch:   (s: string) => api.delete(`/watchlist/${encodeURIComponent(s)}`),
  alerts:        () => api.get('/alerts'),
  signals:       (limit = 50) => api.get('/signals', { params: { limit } }),
}
