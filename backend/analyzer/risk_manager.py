class RiskManager:
    """
    Calculates entry, Stop Loss, Take Profit levels,
    and optimal position size based on ATR and S/R levels.
    """

    def calculate_trade_setup(
        self,
        analysis: dict,
        direction: str,
        account_balance: float = 10000,
        risk_percent:    float = 1.0,
    ) -> dict:
        ind   = analysis.get('indicators', {})
        sr    = analysis.get('support_resistance', {})
        atr   = ind.get('ATR_14') or 0
        close = ind.get('close')  or 0

        if close == 0 or atr == 0:
            return self._empty_setup()

        supports    = sr.get('supports', [])
        resistances = sr.get('resistances', [])

        if direction == 'BUY':
            entry = close
            nearest_support = (max([s for s in supports if s < entry], default=None)
                                if supports else None)
            sl_atr    = entry - 1.5 * atr
            stop_loss = max(nearest_support - 0.2 * atr, sl_atr) if nearest_support else sl_atr

            risk = entry - stop_loss
            if risk <= 0:
                risk = atr

            tp1 = entry + 1.5 * risk
            tp2 = entry + 2.5 * risk
            tp3 = entry + 4.0 * risk

            nearest_res = min([r for r in resistances if r > entry], default=None,
                               key=lambda x: x - entry) if resistances else None
            if nearest_res and nearest_res < tp2:
                tp1 = nearest_res * 0.998

        else:  # SELL
            entry = close
            nearest_resistance = (min([r for r in resistances if r > entry], default=None)
                                   if resistances else None)
            sl_atr    = entry + 1.5 * atr
            stop_loss = (min(nearest_resistance + 0.2 * atr, sl_atr)
                         if nearest_resistance else sl_atr)

            risk = stop_loss - entry
            if risk <= 0:
                risk = atr

            tp1 = entry - 1.5 * risk
            tp2 = entry - 2.5 * risk
            tp3 = entry - 4.0 * risk

        risk_amount   = account_balance * (risk_percent / 100)
        pips_risk     = abs(entry - stop_loss)
        position_size = risk_amount / pips_risk if pips_risk > 0 else 0

        rr1 = abs(tp1 - entry) / pips_risk if pips_risk > 0 else 0
        rr2 = abs(tp2 - entry) / pips_risk if pips_risk > 0 else 0

        decimals = self._get_decimals(close)

        def fmt(v): return round(v, decimals)

        return {
            'entry':       fmt(entry),
            'entry_zone':  {'min': fmt(entry * 0.999), 'max': fmt(entry * 1.001)},
            'stop_loss':   fmt(stop_loss),
            'take_profits': {
                'tp1': fmt(tp1),
                'tp2': fmt(tp2),
                'tp3': fmt(tp3),
            },
            'risk_reward': {
                'rr1': round(rr1, 2),
                'rr2': round(rr2, 2),
            },
            'position_size': round(position_size, 4),
            'risk_amount':   round(risk_amount, 2),
            'pips_risk':     fmt(pips_risk),
            'atr':           fmt(atr),
            'management_plan': self._management_plan(
                fmt(entry), fmt(stop_loss), fmt(tp1), fmt(tp2), fmt(tp3), direction
            ),
        }

    def _get_decimals(self, price: float) -> int:
        if price > 1000:  return 2
        if price > 10:    return 3
        if price > 1:     return 4
        return 5

    def _management_plan(self, entry, sl, tp1, tp2, tp3, direction) -> list:
        action = 'ACHAT' if direction == 'BUY' else 'VENTE'
        return [
            f"Entrer {action} à {entry}",
            f"Placer le Stop Loss à {sl}",
            f"À {tp1} : fermer 50% de la position, déplacer SL au breakeven",
            f"À {tp2} : fermer 30% supplémentaire, activer trailing stop",
            f"À {tp3} : fermer les 20% restants (objectif extension)",
        ]

    def _empty_setup(self) -> dict:
        return {
            'entry': 0, 'entry_zone': {'min': 0, 'max': 0},
            'stop_loss': 0, 'take_profits': {'tp1': 0, 'tp2': 0, 'tp3': 0},
            'risk_reward': {'rr1': 0, 'rr2': 0},
            'position_size': 0, 'risk_amount': 0, 'pips_risk': 0, 'atr': 0,
            'management_plan': [],
        }
