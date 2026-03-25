import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import type { Opportunity } from '../../api/client'
import { useMarketStore } from '../../store/useMarketStore'
import { apiClient } from '../../api/client'

const TF_OPTIONS = ['5m','15m','1h','4h','1d','1wk']

interface Props {
  opportunity: Opportunity | null
}

export function TradingChart({ opportunity }: Props) {
  const chartRef    = useRef<HTMLDivElement>(null)
  const rsiRef      = useRef<HTMLDivElement>(null)
  const chartObj    = useRef<any>(null)
  const rsiObj      = useRef<any>(null)
  const [tf, setTf] = useState('1h')
  const [loading, setLoading] = useState(false)
  const { selectedSymbol, selectedTimeframe, setTimeframe } = useMarketStore()

  const symbol = opportunity?.symbol ?? selectedSymbol
  const displayName = opportunity?.name ?? symbol

  useEffect(() => {
    if (!chartRef.current || !rsiRef.current) return

    const chartColors = {
      background: '#131722',
      text: '#787B86',
      grid: 'rgba(255,255,255,0.04)',
      border: 'rgba(255,255,255,0.06)',
    }

    // Main chart
    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: chartColors.border },
      timeScale: { borderColor: chartColors.border, timeVisible: true },
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
    })
    chartObj.current = chart

    // RSI chart
    const rsiChart = createChart(rsiRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      rightPriceScale: { borderColor: chartColors.border },
      timeScale: { borderColor: chartColors.border, timeVisible: true, visible: false },
      width: rsiRef.current.clientWidth,
      height: rsiRef.current.clientHeight,
    })
    rsiObj.current = rsiChart

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth })
      if (rsiRef.current)   rsiChart.applyOptions({ width: rsiRef.current.clientWidth })
    })
    if (chartRef.current) ro.observe(chartRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      rsiChart.remove()
    }
  }, [])

  // Load data when symbol/tf changes
  useEffect(() => {
    if (!symbol || !chartObj.current) return
    loadChartData(symbol, tf)
  }, [symbol, tf])

  const loadChartData = async (sym: string, timeframe: string) => {
    if (!chartObj.current || !rsiObj.current) return
    setLoading(true)

    try {
      const res = await apiClient.chartData(sym, timeframe, 300)
      const data = res.data.data as Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>

      if (!data || data.length === 0) return

      // Clear old series
      chartObj.current.applyOptions({})

      const candleSeries = chartObj.current.addSeries(CandlestickSeries, {
        upColor: '#26A69A', downColor: '#EF5350',
        borderUpColor: '#26A69A', borderDownColor: '#EF5350',
        wickUpColor: '#26A69A', wickDownColor: '#EF5350',
      })
      const candles = data.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }))
      candleSeries.setData(candles)

      // Volume
      const volSeries = chartObj.current.addSeries(HistogramSeries, {
        color: 'rgba(38,166,154,0.3)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })
      chartObj.current.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
        visible: false,
      })
      volSeries.setData(data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(38,166,154,0.25)' : 'rgba(239,83,80,0.25)',
      })))

      // Trade levels from opportunity
      if (opportunity) {
        const lastTime = data[data.length - 1].time
        const isBuy    = opportunity.score.direction === 'BUY'
        const tp = opportunity.trade_setup.take_profits

        // Entry line
        addPriceLine(candleSeries, opportunity.trade_setup.entry, '#2962FF', 'Entrée')
        addPriceLine(candleSeries, opportunity.trade_setup.stop_loss, '#EF5350', 'Stop Loss')
        addPriceLine(candleSeries, tp.tp1, '#26A69A', 'TP1')
        addPriceLine(candleSeries, tp.tp2, 'rgba(38,166,154,0.7)', 'TP2')
        addPriceLine(candleSeries, tp.tp3, 'rgba(38,166,154,0.5)', 'TP3')
      }

      // S/R levels from opportunity analysis
      if (opportunity?.support_resistance) {
        const sr = opportunity.support_resistance
        sr.supports?.slice(0, 3).forEach((level: number) => {
          addPriceLine(candleSeries, level, 'rgba(38,166,154,0.4)', 'S', 'dashed')
        })
        sr.resistances?.slice(0, 3).forEach((level: number) => {
          addPriceLine(candleSeries, level, 'rgba(239,83,80,0.4)', 'R', 'dashed')
        })
      }

      // RSI simulation (simple version using closes)
      const rsiLine = rsiObj.current.addSeries(LineSeries, {
        color: '#FF9800', lineWidth: 2, priceLineVisible: false,
      })
      // Simple RSI calculation client-side if not available from API
      const closes = data.map(d => d.close)
      const rsiData = computeRSI(closes, 14).map((v, i) => ({
        time: data[i + 14].time,
        value: v,
      }))
      if (rsiData.length > 0) rsiLine.setData(rsiData)

      // RSI reference lines
      addPriceLine(rsiLine, 70, 'rgba(239,83,80,0.5)', '70', 'dashed')
      addPriceLine(rsiLine, 30, 'rgba(38,166,154,0.5)', '30', 'dashed')

      chartObj.current.timeScale().fitContent()

    } catch (e) {
      console.error('[Chart] Error loading data:', e)
    } finally {
      setLoading(false)
    }
  }

  const addPriceLine = (series: any, price: number, color: string, title: string, style: 'solid' | 'dashed' = 'solid') => {
    if (!price) return
    series.createPriceLine({
      price,
      color,
      lineWidth: style === 'dashed' ? 1 : 2,
      lineStyle: style === 'dashed' ? 2 : 0,
      axisLabelVisible: true,
      title,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#D1D4DC' }}>
          {displayName ?? 'Sélectionner un symbole'}
        </span>
        {opportunity && (
          <span className={`badge ${opportunity.score.direction === 'BUY' ? 'badge-bull' : 'badge-bear'}`}>
            {opportunity.score.direction}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {TF_OPTIONS.map(t => (
            <button key={t}
              onClick={() => setTf(t)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: t === tf ? '#2962FF' : 'var(--color-bg-elevated)',
                color: t === tf ? '#fff' : '#787B86',
                transition: 'all 0.15s',
              }}
            >{t}</button>
          ))}
        </div>

        {loading && <span className="spin" style={{ fontSize: 14 }}>⟳</span>}
      </div>

      {/* Main chart */}
      <div ref={chartRef} style={{ flex: 3, minHeight: 0, background: '#131722' }} />

      {/* RSI chart */}
      <div style={{
        flexShrink: 0,
        background: 'var(--color-bg-card)',
        borderTop: '1px solid var(--color-border)',
        padding: '4px 14px 2px',
      }}>
        <span style={{ fontSize: 10, color: '#787B86', fontWeight: 600 }}>RSI (14)</span>
      </div>
      <div ref={rsiRef} style={{ height: 100, flexShrink: 0, background: '#131722' }} />
    </div>
  )
}

/** Simple RSI calculation */
function computeRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = []
  if (closes.length < period + 1) return rsi

  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains  += diff
    else          losses -= diff
  }

  let avgGain  = gains  / period
  let avgLoss  = losses / period

  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1]
      avgGain  = (avgGain  * (period - 1) + Math.max(diff, 0)) / period
      avgLoss  = (avgLoss  * (period - 1) + Math.max(-diff, 0)) / period
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }

  return rsi
}
