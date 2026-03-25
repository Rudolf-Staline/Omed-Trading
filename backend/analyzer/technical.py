import pandas as pd
import pandas_ta as ta
import numpy as np
from typing import Optional


class TechnicalAnalyzer:
    """Calculates 40+ technical indicators across multiple timeframes."""

    def analyze(self, df: pd.DataFrame, symbol: str) -> dict:
        if df is None or len(df) < 50:
            return {}

        df = df.copy()
        results = {}

        try:
            # ── TREND ──────────────────────────────────────────────────
            df['EMA_9']   = ta.ema(df.close, length=9)
            df['EMA_21']  = ta.ema(df.close, length=21)
            df['EMA_50']  = ta.ema(df.close, length=50)
            df['EMA_200'] = ta.ema(df.close, length=200)
            df['SMA_20']  = ta.sma(df.close, length=20)
            df['SMA_50']  = ta.sma(df.close, length=50)
            df['WMA_10']  = ta.wma(df.close, length=10)

            try:
                df['HMA_20'] = ta.hma(df.close, length=20)
            except Exception:
                df['HMA_20'] = ta.ema(df.close, length=20)

            # Ichimoku
            try:
                ichi = ta.ichimoku(df.high, df.low, df.close)
                if ichi and len(ichi) > 0:
                    ichi_df = ichi[0]
                    col_map = {
                        'ichi_tenkan':   [c for c in ichi_df.columns if 'ITS' in c],
                        'ichi_kijun':    [c for c in ichi_df.columns if 'IKS' in c],
                        'ichi_senkou_a': [c for c in ichi_df.columns if 'ISA' in c],
                        'ichi_senkou_b': [c for c in ichi_df.columns if 'ISB' in c],
                        'ichi_chikou':   [c for c in ichi_df.columns if 'ICS' in c],
                    }
                    for key, cols in col_map.items():
                        if cols:
                            df[key] = ichi_df[cols[0]].reindex(df.index)
                        else:
                            df[key] = np.nan
            except Exception:
                for k in ['ichi_tenkan','ichi_kijun','ichi_senkou_a','ichi_senkou_b','ichi_chikou']:
                    df[k] = np.nan

            # Parabolic SAR
            try:
                psar = ta.psar(df.high, df.low, df.close)
                psar_long_cols = [c for c in psar.columns if 'PSARl' in c]
                psar_af_cols   = [c for c in psar.columns if 'PSARaf' in c]
                df['psar'] = psar[psar_long_cols[0]] if psar_long_cols else np.nan
                df['psar_af'] = psar[psar_af_cols[0]] if psar_af_cols else np.nan
            except Exception:
                df['psar'] = np.nan

            # SuperTrend
            try:
                st = ta.supertrend(df.high, df.low, df.close)
                st_cols = [c for c in st.columns if 'SUPERT_' in c and 'd' not in c.lower().split('supert')[1][:2]]
                st_dir_cols = [c for c in st.columns if 'SUPERTd' in c]
                df['supertrend']     = st[st_cols[0]] if st_cols else np.nan
                df['supertrend_dir'] = st[st_dir_cols[0]] if st_dir_cols else 1
            except Exception:
                df['supertrend'] = np.nan
                df['supertrend_dir'] = 1

            # ADX
            try:
                adx = ta.adx(df.high, df.low, df.close)
                adx_cols  = [c for c in adx.columns if c.startswith('ADX_')]
                dmp_cols  = [c for c in adx.columns if 'DMP_' in c]
                dmn_cols  = [c for c in adx.columns if 'DMN_' in c]
                df['ADX']      = adx[adx_cols[0]] if adx_cols else np.nan
                df['DI_plus']  = adx[dmp_cols[0]] if dmp_cols else np.nan
                df['DI_minus'] = adx[dmn_cols[0]] if dmn_cols else np.nan
            except Exception:
                df['ADX'] = df['DI_plus'] = df['DI_minus'] = np.nan

            # ── MOMENTUM ───────────────────────────────────────────────
            df['RSI_14'] = ta.rsi(df.close, length=14)
            df['RSI_9']  = ta.rsi(df.close, length=9)
            df['RSI_21'] = ta.rsi(df.close, length=21)

            try:
                stoch = ta.stoch(df.high, df.low, df.close)
                stoch_k = [c for c in stoch.columns if 'STOCHk' in c]
                stoch_d = [c for c in stoch.columns if 'STOCHd' in c]
                df['stoch_k'] = stoch[stoch_k[0]] if stoch_k else np.nan
                df['stoch_d'] = stoch[stoch_d[0]] if stoch_d else np.nan
            except Exception:
                df['stoch_k'] = df['stoch_d'] = np.nan

            try:
                srsi = ta.stochrsi(df.close)
                srsi_k = [c for c in srsi.columns if 'STOCHRSIk' in c]
                srsi_d = [c for c in srsi.columns if 'STOCHRSId' in c]
                df['stochrsi_k'] = srsi[srsi_k[0]] if srsi_k else np.nan
                df['stochrsi_d'] = srsi[srsi_d[0]] if srsi_d else np.nan
            except Exception:
                df['stochrsi_k'] = df['stochrsi_d'] = np.nan

            try:
                macd = ta.macd(df.close)
                macd_cols = [c for c in macd.columns if 'MACD_' in c and 'h' not in c.lower()[-2:] and 's' not in c.lower()[-2:]]
                macd_s    = [c for c in macd.columns if 'MACDs_' in c]
                macd_h    = [c for c in macd.columns if 'MACDh_' in c]
                df['macd']        = macd[macd_cols[0]] if macd_cols else np.nan
                df['macd_signal'] = macd[macd_s[0]] if macd_s else np.nan
                df['macd_hist']   = macd[macd_h[0]] if macd_h else np.nan
            except Exception:
                df['macd'] = df['macd_signal'] = df['macd_hist'] = np.nan

            df['CCI_20'] = ta.cci(df.high, df.low, df.close, length=20)
            df['WILLR']  = ta.willr(df.high, df.low, df.close)
            df['ROC_10'] = ta.roc(df.close, length=10)

            try:
                df['MFI_14'] = ta.mfi(df.high, df.low, df.close, df.volume)
            except Exception:
                df['MFI_14'] = np.nan

            # ── VOLATILITY ─────────────────────────────────────────────
            try:
                bb = ta.bbands(df.close, length=20, std=2)
                df['bb_upper']   = bb[[c for c in bb.columns if 'BBU' in c][0]]
                df['bb_mid']     = bb[[c for c in bb.columns if 'BBM' in c][0]]
                df['bb_lower']   = bb[[c for c in bb.columns if 'BBL' in c][0]]
                df['bb_width']   = bb[[c for c in bb.columns if 'BBB' in c][0]]
                df['bb_percent'] = bb[[c for c in bb.columns if 'BBP' in c][0]]
            except Exception:
                for c in ['bb_upper','bb_mid','bb_lower','bb_width','bb_percent']:
                    df[c] = np.nan

            df['ATR_14'] = ta.atr(df.high, df.low, df.close, length=14)
            df['ATR_7']  = ta.atr(df.high, df.low, df.close, length=7)

            # Keltner Channels
            try:
                kc = ta.kc(df.high, df.low, df.close)
                kcu = [c for c in kc.columns if 'KCU' in c]
                kcl = [c for c in kc.columns if 'KCL' in c]
                df['kc_upper'] = kc[kcu[0]] if kcu else np.nan
                df['kc_lower'] = kc[kcl[0]] if kcl else np.nan
            except Exception:
                df['kc_upper'] = df['kc_lower'] = np.nan

            # ── VOLUME ─────────────────────────────────────────────────
            try:
                df['OBV']  = ta.obv(df.close, df.volume)
                df['VWAP'] = ta.vwap(df.high, df.low, df.close, df.volume)
                df['CMF_20'] = ta.cmf(df.high, df.low, df.close, df.volume)
            except Exception:
                df['OBV'] = df['VWAP'] = df['CMF_20'] = np.nan

        except Exception as e:
            print(f"[Technical] Error computing indicators for {symbol}: {e}")

        # ── DERIVED ────────────────────────────────────────────────
        pivots   = self.calculate_pivot_points(df)
        sr       = self.find_support_resistance(df)
        fib      = self.calculate_fibonacci(df)
        patterns = self.detect_candlestick_patterns(df)
        chart_p  = self.detect_chart_patterns(df)

        # Last candle as dict, remove NaNs
        last_row = df.iloc[-1].to_dict()
        last_row = {k: (None if (isinstance(v, float) and np.isnan(v)) else v)
                    for k, v in last_row.items()}

        return {
            'indicators':         last_row,
            'pivots':             pivots,
            'support_resistance': sr,
            'fibonacci':          fib,
            'patterns':           patterns,
            'chart_patterns':     chart_p,
            'ohlcv':              self._get_ohlcv_list(df),
        }

    def _get_ohlcv_list(self, df: pd.DataFrame, limit: int = 200) -> list:
        df_tail = df.tail(limit).reset_index()
        records = []
        for _, row in df_tail.iterrows():
            ts = row.get('Datetime', row.get('Date', row.index if hasattr(row, 'name') else 0))
            records.append({
                'time':   int(pd.Timestamp(ts).timestamp()) if hasattr(ts, '__class__') else int(ts),
                'open':   float(row.open),
                'high':   float(row.high),
                'low':    float(row.low),
                'close':  float(row.close),
                'volume': float(row.volume) if row.volume else 0,
            })
        return records

    def calculate_pivot_points(self, df: pd.DataFrame) -> dict:
        if len(df) < 2:
            return {}
        last = df.iloc[-2]
        H, L, C = float(last.high), float(last.low), float(last.close)
        P = (H + L + C) / 3
        return {
            "standard": {
                "P": P,
                "R1": 2*P - L,      "R2": P + (H-L),      "R3": H + 2*(P-L),
                "S1": 2*P - H,      "S2": P - (H-L),       "S3": L - 2*(H-P),
            },
            "fibonacci": {
                "P": P,
                "R1": P + 0.382*(H-L), "R2": P + 0.618*(H-L), "R3": P + (H-L),
                "S1": P - 0.382*(H-L), "S2": P - 0.618*(H-L), "S3": P - (H-L),
            },
            "camarilla": {
                "R4": C + 1.1*(H-L)/2, "R3": C + 1.1*(H-L)/4,
                "S4": C - 1.1*(H-L)/2, "S3": C - 1.1*(H-L)/4,
            }
        }

    def find_support_resistance(self, df: pd.DataFrame,
                                 window: int = 10, min_touches: int = 2) -> dict:
        highs = df.high.values
        lows  = df.low.values
        resistances, supports = [], []

        for i in range(window, len(df) - window):
            if highs[i] == max(highs[i-window:i+window]):
                resistances.append(float(highs[i]))
            if lows[i] == min(lows[i-window:i+window]):
                supports.append(float(lows[i]))

        def cluster_levels(levels, tolerance=0.002):
            if not levels:
                return []
            levels = sorted(levels)
            clusters = [[levels[0]]]
            for level in levels[1:]:
                if abs(level - clusters[-1][-1]) < level * tolerance:
                    clusters[-1].append(level)
                else:
                    clusters.append([level])
            return sorted([sum(c)/len(c) for c in clusters if len(c) >= min_touches], reverse=True)

        return {
            "resistances": cluster_levels(resistances)[:5],
            "supports":    cluster_levels(supports)[:5],
        }

    def calculate_fibonacci(self, df: pd.DataFrame, period: int = 50) -> dict:
        recent     = df.tail(period)
        swing_high = float(recent.high.max())
        swing_low  = float(recent.low.min())
        diff       = swing_high - swing_low
        if diff == 0:
            return {}
        return {
            "swing_high": swing_high,
            "swing_low":  swing_low,
            "levels": {
                "0.0":   swing_high,
                "0.236": swing_high - 0.236 * diff,
                "0.382": swing_high - 0.382 * diff,
                "0.500": swing_high - 0.500 * diff,
                "0.618": swing_high - 0.618 * diff,
                "0.786": swing_high - 0.786 * diff,
                "1.000": swing_low,
                "1.272": swing_low - 0.272 * diff,
                "1.618": swing_low - 0.618 * diff,
            }
        }

    def detect_candlestick_patterns(self, df: pd.DataFrame) -> list:
        patterns = []
        if len(df) < 5:
            return patterns

        pattern_funcs = {
            'Doji':               lambda: ta.cdl_doji(df.open, df.high, df.low, df.close),
            'Hammer':             lambda: ta.cdl_hammer(df.open, df.high, df.low, df.close),
            'Shooting Star':      lambda: ta.cdl_shootingstar(df.open, df.high, df.low, df.close),
            'Engulfing':          lambda: ta.cdl_engulfing(df.open, df.high, df.low, df.close),
            'Morning Star':       lambda: ta.cdl_morningstar(df.open, df.high, df.low, df.close),
            'Evening Star':       lambda: ta.cdl_eveningstar(df.open, df.high, df.low, df.close),
            '3 White Soldiers':   lambda: ta.cdl_3whitesoldiers(df.open, df.high, df.low, df.close),
            '3 Black Crows':      lambda: ta.cdl_3blackcrows(df.open, df.high, df.low, df.close),
            'Harami':             lambda: ta.cdl_harami(df.open, df.high, df.low, df.close),
            'Piercing Line':      lambda: ta.cdl_piercing(df.open, df.high, df.low, df.close),
        }

        for name, fn in pattern_funcs.items():
            try:
                series = fn()
                val = series.iloc[-1]
                if val != 0:
                    patterns.append({
                        'name':     name,
                        'signal':   'bullish' if val > 0 else 'bearish',
                        'strength': int(abs(val)),
                    })
            except Exception:
                continue

        return patterns

    def detect_chart_patterns(self, df: pd.DataFrame) -> list:
        patterns = []
        if len(df) < 50:
            return patterns

        highs = df.high.values
        lows  = df.low.values
        n     = len(highs)

        # Double Top
        window_start = max(0, n - 60)
        recent_high_idx = [
            i for i in range(window_start + 1, n - 1)
            if highs[i] > highs[i-1] and highs[i] > highs[i+1]
        ]
        if len(recent_high_idx) >= 2:
            h1, h2 = highs[recent_high_idx[-2]], highs[recent_high_idx[-1]]
            if abs(h1 - h2) / max(h1, 1e-10) < 0.005:
                patterns.append({'name': 'Double Top', 'signal': 'bearish', 'strength': 80})

        # Double Bottom
        recent_low_idx = [
            i for i in range(window_start + 1, n - 1)
            if lows[i] < lows[i-1] and lows[i] < lows[i+1]
        ]
        if len(recent_low_idx) >= 2:
            l1, l2 = lows[recent_low_idx[-2]], lows[recent_low_idx[-1]]
            if abs(l1 - l2) / max(l1, 1e-10) < 0.005:
                patterns.append({'name': 'Double Bottom', 'signal': 'bullish', 'strength': 80})

        return patterns
