import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler

sys.path.insert(0, os.path.dirname(__file__))

from analyzer.market_scanner import MarketScanner
from data.fetcher import DataFetcher
from data.symbols import ALL_SYMBOLS, get_display_name, get_market
import db.database as database

# ── Global state ─────────────────────────────────────────────────────────────
scanner         = MarketScanner()
fetcher         = DataFetcher()
scheduler       = AsyncIOScheduler()
connected_ws:   List[WebSocket] = []
last_scan_cache: dict = {}


async def auto_scan_job():
    global last_scan_cache
    print("[Scheduler] Running auto-scan...")
    try:
        result = await scanner.scan_all(mode='day_trading')
        last_scan_cache = result
        for opp in result.get('top_3', []):
            database.save_signal(opp)
        await broadcast({"type": "scan_update", "data": result})
        print(f"[Scheduler] Scan complete — {result['opportunities_found']} opportunities found.")
    except Exception as e:
        print(f"[Scheduler] Auto-scan error: {e}")


async def broadcast(message: dict):
    dead = []
    for ws in connected_ws:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in connected_ws:
            connected_ws.remove(ws)


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    scheduler.add_job(auto_scan_job, 'interval', minutes=15, id='auto_scan')
    scheduler.start()
    yield
    scheduler.shutdown()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Nexus Trading API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "Nexus Trading API is running"}


@app.get("/api/scan/{mode}")
async def scan_markets(mode: str = "day_trading", min_score: float = 55.0):
    """Full market scan — returns TOP 3 + Top 20 opportunities."""
    global last_scan_cache
    result = await scanner.scan_all(mode=mode, min_score=min_score)
    last_scan_cache = result
    for opp in result.get('top_3', []):
        database.save_signal(opp)
    await broadcast({"type": "scan_update", "data": result})
    return result


@app.get("/api/scan")
async def scan_markets_default(mode: str = "day_trading", min_score: float = 55.0):
    return await scan_markets(mode, min_score)


@app.get("/api/analyze/{symbol}")
async def analyze_symbol(symbol: str, timeframe: str = "1h"):
    """Detailed analysis of a single symbol."""
    result = await scanner.analyze_single(symbol, timeframe)
    if not result:
        raise HTTPException(status_code=404, detail=f"Could not fetch data for {symbol}")
    return result


@app.get("/api/chart/{symbol}")
async def get_chart_data(symbol: str, timeframe: str = "1h", periods: int = 200):
    """OHLCV data for chart rendering."""
    df = await fetcher.get_ohlcv(symbol, timeframe, periods)
    if df is None:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    records = []
    for ts, row in df.iterrows():
        records.append({
            'time':   int(ts.timestamp()),
            'open':   float(row.open),
            'high':   float(row.high),
            'low':    float(row.low),
            'close':  float(row.close),
            'volume': float(row.volume) if row.volume else 0,
        })
    return {"symbol": symbol, "timeframe": timeframe, "data": records}


@app.get("/api/prices")
async def get_prices():
    """Quick price snapshot for all symbols."""
    prices = await fetcher.get_realtime_prices()
    return {"prices": list(prices.values())}


@app.get("/api/symbols")
async def get_symbols():
    """All tracked symbols grouped by market."""
    from data.symbols import SYMBOLS
    return {"markets": SYMBOLS, "all": ALL_SYMBOLS}


@app.get("/api/last_scan")
async def get_last_scan():
    """Returns the cached last scan result."""
    if last_scan_cache:
        return last_scan_cache
    return {"message": "No scan available yet. POST /api/scan to trigger one."}


# ── Watchlist ─────────────────────────────────────────────────────────────────

@app.get("/api/watchlist")
async def get_watchlist():
    return {"watchlist": database.get_watchlist()}


@app.post("/api/watchlist/{symbol}")
async def add_to_watchlist(symbol: str):
    return database.add_to_watchlist(symbol, get_display_name(symbol))


@app.delete("/api/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str):
    return database.remove_from_watchlist(symbol)


# ── Alerts ────────────────────────────────────────────────────────────────────

@app.get("/api/alerts")
async def get_alerts():
    return {"alerts": database.get_recent_alerts()}


@app.post("/api/alerts")
async def create_alert(symbol: str, alert_type: str = "price", message: str = ""):
    result = database.add_alert(symbol, alert_type, message)
    await broadcast({"type": "alert", "data": {"symbol": symbol, "message": message}})
    return result


# ── Signals history ───────────────────────────────────────────────────────────

@app.get("/api/signals")
async def get_signals(limit: int = 50):
    return {"signals": database.get_recent_signals(limit)}


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_ws.append(websocket)
    print(f"[WS] Client connected. Total: {len(connected_ws)}")

    try:
        # Send initial data
        if last_scan_cache:
            await websocket.send_json({"type": "scan_update", "data": last_scan_cache})

        while True:
            try:
                prices = await fetcher.get_realtime_prices()
                await websocket.send_json({"type": "prices", "data": list(prices.values())})
            except Exception:
                pass
            await asyncio.sleep(10)

    except WebSocketDisconnect:
        if websocket in connected_ws:
            connected_ws.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(connected_ws)}")
    except Exception as e:
        if websocket in connected_ws:
            connected_ws.remove(websocket)
        print(f"[WS] Error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
