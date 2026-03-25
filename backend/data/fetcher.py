import yfinance as yf
import pandas as pd
import asyncio
from datetime import datetime
from typing import Optional
from .symbols import ALL_SYMBOLS, get_display_name

TIMEFRAME_MAP = {
    "1m": ("1m", "1d"),
    "5m": ("5m", "5d"),
    "15m": ("15m", "10d"),
    "30m": ("30m", "20d"),
    "1h": ("1h", "60d"),
    "4h": ("4h", "120d"),
    "1d": ("1d", "400d"),
    "1wk": ("1wk", "730d"),
    "1mo": ("1mo", "3650d"),
}

class DataFetcher:
    def __init__(self):
        self._cache: dict = {}
        self._cache_ttl: dict = {}

    async def get_ohlcv(self, symbol: str, timeframe: str = "1h", periods: int = 300) -> Optional[pd.DataFrame]:
        cache_key = f"{symbol}_{timeframe}"
        now = datetime.now().timestamp()

        if cache_key in self._cache and (now - self._cache_ttl.get(cache_key, 0)) < 60:
            return self._cache[cache_key]

        try:
            interval, period = TIMEFRAME_MAP.get(timeframe, ("1h", "60d"))
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(None, self._fetch_sync, symbol, interval, period)

            if df is not None and len(df) > 10:
                df = df.tail(periods)
                self._cache[cache_key] = df
                self._cache_ttl[cache_key] = now
                return df
        except Exception as e:
            print(f"[Fetcher] Error fetching {symbol} {timeframe}: {e}")
        return None

    def _fetch_sync(self, symbol: str, interval: str, period: str) -> Optional[pd.DataFrame]:
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval, auto_adjust=True)
            if df is None or df.empty:
                return None
            df.columns = [c.lower() for c in df.columns]
            df = df[['open', 'high', 'low', 'close', 'volume']].dropna()
            df.index = pd.to_datetime(df.index)
            return df
        except Exception as e:
            print(f"[Fetcher] Sync fetch error for {symbol}: {e}")
            return None

    async def get_realtime_prices(self) -> dict:
        """Returns latest price for all symbols (subset for speed)"""
        prices = {}
        quick_symbols = ALL_SYMBOLS[:20]

        async def fetch_one(sym):
            try:
                loop = asyncio.get_event_loop()
                ticker = yf.Ticker(sym)
                info = await loop.run_in_executor(None, lambda: ticker.fast_info)
                price = getattr(info, 'last_price', None)
                prev = getattr(info, 'previous_close', None)
                if price:
                    change_pct = ((price - prev) / prev * 100) if prev else 0
                    prices[sym] = {
                        "symbol": sym,
                        "name": get_display_name(sym),
                        "price": round(price, 6),
                        "change_pct": round(change_pct, 3),
                    }
            except Exception:
                pass

        await asyncio.gather(*[fetch_one(s) for s in quick_symbols])
        return prices

    def clear_cache(self):
        self._cache.clear()
        self._cache_ttl.clear()
