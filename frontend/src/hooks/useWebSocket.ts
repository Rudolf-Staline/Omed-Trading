import { useEffect, useRef, useCallback } from 'react'
import { useMarketStore, useAlertStore } from '../store/useMarketStore'

const WS_URL = 'ws://localhost:8000/ws'

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null)
  const reconnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { setScanResult, updatePrices, setWsConnected } = useMarketStore()
  const { addAlert } = useAlertStore()

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    ws.current = new WebSocket(WS_URL)

    ws.current.onopen = () => {
      setWsConnected(true)
      console.log('[WS] Connected')
    }

    ws.current.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        switch (msg.type) {
          case 'scan_update':
            setScanResult(msg.data)
            break
          case 'prices':
            updatePrices(msg.data)
            break
          case 'alert':
            addAlert({ ...msg.data, id: Date.now(), created_at: new Date().toISOString(), type: 'signal' })
            break
        }
      } catch {}
    }

    ws.current.onclose = () => {
      setWsConnected(false)
      console.log('[WS] Disconnected — reconnecting in 5s...')
      reconnTimer.current = setTimeout(connect, 5000)
    }

    ws.current.onerror = () => {
      ws.current?.close()
    }
  }, [setScanResult, updatePrices, setWsConnected, addAlert])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnTimer.current)
      ws.current?.close()
    }
  }, [connect])

  const send = useCallback((msg: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg))
    }
  }, [])

  return { send }
}
