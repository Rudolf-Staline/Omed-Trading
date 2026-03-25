import asyncio
from datetime import datetime
from typing import Optional

from data.fetcher import DataFetcher
from data.symbols import ALL_SYMBOLS, get_market, get_display_name
from analyzer.technical import TechnicalAnalyzer
from analyzer.scorer import OpportunityScorer
from analyzer.risk_manager import RiskManager
from analyzer.ai_analyst import AIAnalyst

SCAN_MODES = {
    'scalping':    ['5m', '15m'],
    'day_trading': ['1h', '4h'],
    'swing':       ['1d'],
    'position':    ['1wk'],
}


class MarketScanner:
    def __init__(self):
        self.fetcher      = DataFetcher()
        self.analyzer     = TechnicalAnalyzer()
        self.scorer       = OpportunityScorer()
        self.risk_manager = RiskManager()
        self.ai_analyst   = AIAnalyst()

    async def scan_all(self, mode: str = 'day_trading', min_score: float = 55.0) -> dict:
        timeframes = SCAN_MODES.get(mode, ['1h', '4h'])
        all_opportunities = []

        # Scan in batches to avoid rate limiting
        batch_size = 5
        for i in range(0, len(ALL_SYMBOLS), batch_size):
            batch = ALL_SYMBOLS[i:i+batch_size]
            tasks = [self._scan_symbol(sym, timeframes) for sym in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, dict) and r.get('score', {}).get('total_score', 0) >= min_score:
                    all_opportunities.append(r)
            # Small delay between batches
            await asyncio.sleep(0.2)

        all_opportunities.sort(key=lambda x: x['score']['total_score'], reverse=True)

        return {
            'top_3':                all_opportunities[:3],
            'all_opportunities':    all_opportunities[:20],
            'scan_time':            datetime.now().isoformat(),
            'mode':                 mode,
            'symbols_scanned':      len(ALL_SYMBOLS),
            'opportunities_found':  len(all_opportunities),
        }

    async def _scan_symbol(self, symbol: str, timeframes: list) -> Optional[dict]:
        try:
            tf_data = {}
            for tf in timeframes:
                df = await self.fetcher.get_ohlcv(symbol, tf, periods=300)
                if df is not None and len(df) > 50:
                    analysis = self.analyzer.analyze(df, symbol)
                    if analysis:
                        tf_data[tf] = analysis

            if not tf_data:
                return None

            main_tf   = timeframes[-1]
            main_data = tf_data.get(main_tf) or list(tf_data.values())[-1]

            score_result = self.scorer.score(main_data, tf_data)
            trade_setup  = self.risk_manager.calculate_trade_setup(
                main_data, score_result['direction']
            )
            ai_comment = await self.ai_analyst.analyze(
                symbol, score_result, trade_setup, main_data
            )

            ind   = main_data.get('indicators', {})
            close = ind.get('close', 0) or 0

            return {
                'symbol':      symbol,
                'name':        get_display_name(symbol),
                'market':      get_market(symbol),
                'score':       score_result,
                'trade_setup': trade_setup,
                'indicators':  {
                    'rsi':         ind.get('RSI_14'),
                    'macd':        ind.get('macd'),
                    'macd_signal': ind.get('macd_signal'),
                    'adx':         ind.get('ADX'),
                    'stoch_k':     ind.get('stoch_k'),
                    'stoch_d':     ind.get('stoch_d'),
                    'bb_percent':  ind.get('bb_percent'),
                    'supertrend':  ind.get('supertrend_dir'),
                    'close':       close,
                },
                'patterns':           main_data.get('patterns', []),
                'chart_patterns':     main_data.get('chart_patterns', []),
                'support_resistance': main_data.get('support_resistance', {}),
                'fibonacci':          main_data.get('fibonacci', {}),
                'pivots':             main_data.get('pivots', {}),
                'ohlcv':              main_data.get('ohlcv', []),
                'ai_comment':         ai_comment,
                'timestamp':          datetime.now().isoformat(),
            }
        except Exception as e:
            print(f"[Scanner] Error scanning {symbol}: {e}")
            return None

    async def analyze_single(self, symbol: str, timeframe: str = '1h') -> Optional[dict]:
        tf_data = {}
        timeframes = [timeframe]

        # Also get a higher timeframe for context
        tf_map = {'5m': '1h', '15m': '1h', '1h': '4h', '4h': '1d', '1d': '1wk'}
        higher = tf_map.get(timeframe)
        if higher:
            timeframes = [timeframe, higher]

        for tf in timeframes:
            df = await self.fetcher.get_ohlcv(symbol, tf, periods=300)
            if df is not None and len(df) > 50:
                tf_data[tf] = self.analyzer.analyze(df, symbol)

        if not tf_data:
            return None

        main_data    = tf_data.get(timeframe) or list(tf_data.values())[0]
        score_result = self.scorer.score(main_data, tf_data)
        trade_setup  = self.risk_manager.calculate_trade_setup(main_data, score_result['direction'])
        ai_comment   = await self.ai_analyst.analyze(symbol, score_result, trade_setup, main_data)

        return {
            'symbol':      symbol,
            'name':        get_display_name(symbol),
            'market':      get_market(symbol),
            'score':       score_result,
            'trade_setup': trade_setup,
            'analysis':    main_data,
            'ai_comment':  ai_comment,
            'timestamp':   datetime.now().isoformat(),
        }
