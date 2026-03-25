from typing import Optional


class OpportunityScorer:
    """
    Scores trading opportunities from 0 to 100 by combining
    multi-timeframe trend alignment, momentum, volume, S/R, and patterns.
    """

    WEIGHTS = {
        'trend_alignment':      30,
        'momentum':             20,
        'volume_confirmation':  15,
        'support_resistance':   15,
        'pattern_bonus':        10,
        'volatility':           10,
    }

    def score(self, analysis: dict, timeframes: dict) -> dict:
        scores = {}

        mtf_score, direction = self._multi_timeframe_alignment(timeframes)
        scores['trend_alignment'] = mtf_score

        scores['momentum']             = self._momentum_score(analysis)
        scores['volume_confirmation']  = self._volume_score(analysis)
        scores['support_resistance']   = self._sr_score(analysis, direction)
        scores['pattern_bonus']        = self._pattern_score(analysis, direction)
        scores['volatility']           = self._volatility_score(analysis)

        total = sum(scores[k] * (self.WEIGHTS[k] / 100) for k in scores)
        total = round(min(max(total, 0), 100), 1)

        return {
            'total_score':    total,
            'direction':      direction,
            'confidence':     self._score_to_confidence(total),
            'signal_strength': 'FORT' if total > 75 else 'MODÉRÉ' if total > 55 else 'FAIBLE',
            'breakdown':      {k: round(scores[k], 1) for k in scores},
        }

    def _multi_timeframe_alignment(self, timeframes: dict) -> tuple:
        tf_signals = {}

        for tf, data in timeframes.items():
            ind = data.get('indicators', {})
            close = ind.get('close', 0) or 0
            bull = 0
            bear = 0

            def _safe(v):
                return v if v is not None else 0

            if _safe(ind.get('EMA_9'))  > _safe(ind.get('EMA_21')):  bull += 1
            else: bear += 1

            if _safe(ind.get('EMA_21')) > _safe(ind.get('EMA_50')):  bull += 1
            else: bear += 1

            if close > _safe(ind.get('EMA_200')):   bull += 1
            else: bear += 1

            if _safe(ind.get('supertrend_dir')) >= 1: bull += 1
            else: bear += 1

            if close > _safe(ind.get('ichi_kijun', 0) or 0): bull += 1
            else: bear += 1

            tf_signals[tf] = 'bullish' if bull > bear else 'bearish'

        bulls = sum(1 for v in tf_signals.values() if v == 'bullish')
        bears = sum(1 for v in tf_signals.values() if v == 'bearish')
        total = len(tf_signals)

        if total == 0:
            return 50, 'BUY'

        if bulls == total:   return 100, 'BUY'
        if bears == total:   return 100, 'SELL'
        if bulls > bears:    return 65,  'BUY'
        return 65, 'SELL'

    def _momentum_score(self, analysis: dict) -> float:
        ind   = analysis.get('indicators', {})
        score = 50.0

        rsi = ind.get('RSI_14')
        if rsi is not None:
            if 50 < rsi < 70:  score += 20
            elif 30 < rsi < 50: score -= 10
            elif rsi >= 70:    score -= 15  # overbought
            elif rsi <= 30:    score -= 15  # oversold (can be bullish contrarian)

        macd = ind.get('macd')
        sig  = ind.get('macd_signal')
        if macd is not None and sig is not None:
            if macd > sig: score += 15
            else:          score -= 15

        hist = ind.get('macd_hist')
        if hist is not None:
            if hist > 0:   score += 10
            else:          score -= 10

        adx = ind.get('ADX')
        if adx is not None:
            if adx > 25:   score += 15  # trending
            elif adx < 20: score -= 10  # ranging

        stoch_k = ind.get('stoch_k')
        stoch_d = ind.get('stoch_d')
        if stoch_k and stoch_d:
            if stoch_k > stoch_d and stoch_k < 80: score += 10

        return round(min(max(score, 0), 100), 1)

    def _volume_score(self, analysis: dict) -> float:
        ind   = analysis.get('indicators', {})
        score = 50.0

        cmf = ind.get('CMF_20')
        if cmf is not None:
            if cmf > 0.1:   score += 30
            elif cmf > 0:   score += 10
            elif cmf < -0.1: score -= 30
            else:            score -= 10

        mfi = ind.get('MFI_14')
        if mfi is not None:
            if 50 < mfi < 80: score += 20
            elif mfi > 80:    score -= 10
            elif mfi < 20:    score -= 20

        return round(min(max(score, 0), 100), 1)

    def _sr_score(self, analysis: dict, direction: str) -> float:
        ind   = analysis.get('indicators', {})
        sr    = analysis.get('support_resistance', {})
        score = 50.0
        close = ind.get('close', 0) or 0
        if close == 0:
            return score

        supports    = sr.get('supports', [])
        resistances = sr.get('resistances', [])

        if direction == 'BUY' and supports:
            nearest_sup = min(supports, key=lambda x: abs(x - close))
            proximity   = abs(close - nearest_sup) / close
            if proximity < 0.002:   score += 40
            elif proximity < 0.005: score += 20
            elif proximity < 0.01:  score += 10

        elif direction == 'SELL' and resistances:
            nearest_res = min(resistances, key=lambda x: abs(x - close))
            proximity   = abs(nearest_res - close) / close
            if proximity < 0.002:   score += 40
            elif proximity < 0.005: score += 20
            elif proximity < 0.01:  score += 10

        return round(min(max(score, 0), 100), 1)

    def _pattern_score(self, analysis: dict, direction: str) -> float:
        patterns     = analysis.get('patterns', [])
        chart_p      = analysis.get('chart_patterns', [])
        score        = 50.0

        for p in patterns + chart_p:
            sig = p.get('signal', '')
            if direction == 'BUY'  and sig == 'bullish': score += 20
            if direction == 'SELL' and sig == 'bearish': score += 20
            if direction == 'BUY'  and sig == 'bearish': score -= 15
            if direction == 'SELL' and sig == 'bullish': score -= 15

        return round(min(max(score, 0), 100), 1)

    def _volatility_score(self, analysis: dict) -> float:
        ind   = analysis.get('indicators', {})
        score = 50.0

        bb_width = ind.get('bb_width')
        if bb_width is not None:
            # Moderate volatility is good (not too tight, not explosive)
            if 0.5 < bb_width < 2.0:   score += 20
            elif 0.1 < bb_width < 0.5: score += 10
            elif bb_width > 3.0:       score -= 20

        bb_pct = ind.get('bb_percent')
        if bb_pct is not None:
            if 0.3 < bb_pct < 0.7: score += 10
            elif bb_pct < 0.1 or bb_pct > 0.9: score -= 10

        return round(min(max(score, 0), 100), 1)

    def _score_to_confidence(self, score: float) -> str:
        if score >= 80: return 'TRÈS ÉLEVÉE'
        if score >= 65: return 'ÉLEVÉE'
        if score >= 50: return 'MODÉRÉE'
        return 'FAIBLE'
