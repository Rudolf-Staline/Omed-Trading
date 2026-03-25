import os
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class AIAnalyst:
    """Uses Gemini to generate professional trading analysis commentary."""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
            self.enabled = True
        else:
            self.enabled = False
            print("[AIAnalyst] No GEMINI_API_KEY — AI commentary disabled.")

    async def analyze(self, symbol: str, score: dict, setup: dict, main_analysis: dict) -> str:
        if not self.enabled:
            return self._generate_fallback(symbol, score, setup, main_analysis)

        ind = main_analysis.get('indicators', {})
        prompt = f"""
Tu es un analyste technique professionnel de niveau institutionnel.
Analyse cette opportunité de trading de manière concise et professionnelle en français.

Symbole: {symbol}
Direction: {score['direction']}
Score de confiance: {score['total_score']}/100
Force du signal: {score['signal_strength']}

Setup de trade:
- Entrée: {setup.get('entry')}
- Stop Loss: {setup.get('stop_loss')} (risque: {setup.get('pips_risk')})
- TP1: {setup.get('take_profits', {}).get('tp1')} (RR 1:{setup.get('risk_reward', {}).get('rr1')})
- TP2: {setup.get('take_profits', {}).get('tp2')} (RR 1:{setup.get('risk_reward', {}).get('rr2')})

Indicateurs clés:
- RSI(14): {ind.get('RSI_14', 'N/A')}
- MACD: {'haussier' if (ind.get('macd') or 0) > (ind.get('macd_signal') or 0) else 'baissier'}
- ADX: {ind.get('ADX', 'N/A')}
- Patterns: {[p['name'] for p in main_analysis.get('patterns', [])]}

Génère:
1. Un résumé en 2 phrases de la situation technique
2. La raison principale du signal
3. Les risques à surveiller

Sois précis, concis, professionnel. Maximum 120 mots.
"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, lambda: self.model.generate_content(prompt)
            )
            return response.text.strip()
        except Exception as e:
            print(f"[AIAnalyst] Gemini error: {e}")
            return self._generate_fallback(symbol, score, setup, main_analysis)

    def _generate_fallback(self, symbol: str, score: dict, setup: dict, analysis: dict) -> str:
        ind       = analysis.get('indicators', {})
        direction = score.get('direction', 'BUY')
        rsi       = ind.get('RSI_14')
        adx       = ind.get('ADX')
        rsi_str   = f"RSI à {rsi:.1f}" if rsi else ""
        adx_str   = f"ADX à {adx:.1f} (tendance {'forte' if adx and adx > 25 else 'modérée'})" if adx else ""

        action = "haussière" if direction == "BUY" else "baissière"
        patterns = analysis.get('patterns', [])
        pattern_str = f"Pattern détecté : {patterns[0]['name']}. " if patterns else ""

        tp1 = setup.get('take_profits', {}).get('tp1', 0)
        sl  = setup.get('stop_loss', 0)
        rr  = setup.get('risk_reward', {}).get('rr1', 0)

        return (
            f"{symbol} présente une configuration {action} avec un score de confiance de "
            f"{score.get('total_score', 0)}/100. {pattern_str}"
            f"Les indicateurs clés convergent : {rsi_str}{', ' if rsi_str and adx_str else ''}{adx_str}. "
            f"Objectif principal à {tp1} avec un ratio risque/rendement de 1:{rr}. "
            f"Stop Loss à {sl} — surveiller les niveaux clés en cas de retournement."
        )
