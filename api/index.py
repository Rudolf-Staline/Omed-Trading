"""
Nexus Trading — Vercel Serverless Entry Point
FastAPI app wrapped for Vercel's Python runtime.

NOTE: WebSocket and APScheduler are disabled on Vercel
(serverless has no persistent processes).
Scan endpoints work on-demand.
"""
import sys
import os

# Add backend to path so we can import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from analyzer.market_scanner import MarketScanner
from data.fetcher import DataFetcher
from data.symbols import ALL_SYMBOLS, get_display_name, get_market, SYMBOLS
import db.database as database

# Initialize DB on cold start
database.init_db()

app = FastAPI(title="Nexus Trading API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

scanner = MarketScanner()
fetcher  = DataFetcher()

# ── Health ────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "runtime": "vercel-serverless", "timestamp": datetime.now().isoformat()}

# ── Scan ──────────────────────────────────────────────────────

@app.get("/api/scan/{mode}")
async def scan_markets(mode: str = "day_trading", min_score: float = 55.0):
    result = await scanner.scan_all(mode=mode, min_score=min_score)
    for opp in result.get('top_3', []):
        database.save_signal(opp)
    return result

@app.get("/api/scan")
async def scan_markets_default(mode: str = "day_trading", min_score: float = 55.0):
    return await scan_markets(mode, min_score)

@app.get("/api/last_scan")
async def get_last_scan():
    signals = database.get_recent_signals(3)
    if not signals:
        return {"message": "No scan yet. Use /api/scan to trigger one."}
    return {"signals": signals}

# ── Analyze ───────────────────────────────────────────────────

@app.get("/api/analyze/{symbol}")
async def analyze_symbol(symbol: str, timeframe: str = "1h"):
    result = await scanner.analyze_single(symbol, timeframe)
    if not result:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    return result

# ── Chart data ─────────────────────────────────────────────────

@app.get("/api/chart/{symbol}")
async def get_chart_data(symbol: str, timeframe: str = "1h", periods: int = 200):
    df = await fetcher.get_ohlcv(symbol, timeframe, periods)
    if df is None:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    records = [
        {
            'time':   int(ts.timestamp()),
            'open':   float(row.open),
            'high':   float(row.high),
            'low':    float(row.low),
            'close':  float(row.close),
            'volume': float(row.volume) if row.volume else 0,
        }
        for ts, row in df.iterrows()
    ]
    return {"symbol": symbol, "timeframe": timeframe, "data": records}

# ── Prices ────────────────────────────────────────────────────

@app.get("/api/prices")
async def get_prices():
    prices = await fetcher.get_realtime_prices()
    return {"prices": list(prices.values())}

# ── Symbols ───────────────────────────────────────────────────

@app.get("/api/symbols")
async def get_symbols():
    return {"markets": SYMBOLS, "all": ALL_SYMBOLS}

# ── Watchlist ─────────────────────────────────────────────────

@app.get("/api/watchlist")
async def get_watchlist():
    return {"watchlist": database.get_watchlist()}

@app.post("/api/watchlist/{symbol}")
async def add_to_watchlist(symbol: str):
    return database.add_to_watchlist(symbol, get_display_name(symbol))

@app.delete("/api/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str):
    return database.remove_from_watchlist(symbol)

# ── Alerts ────────────────────────────────────────────────────

@app.get("/api/alerts")
async def get_alerts():
    return {"alerts": database.get_recent_alerts()}

@app.post("/api/alerts")
async def create_alert(symbol: str, alert_type: str = "price", message: str = ""):
    return database.add_alert(symbol, alert_type, message)

# ── Signals ───────────────────────────────────────────────────

@app.get("/api/signals")
async def get_signals(limit: int = 50):
    return {"signals": database.get_recent_signals(limit)}
