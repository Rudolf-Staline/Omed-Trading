SYMBOLS = {
    "forex": [
        "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X",
        "AUDUSD=X", "USDCAD=X", "NZDUSD=X",
        "EURGBP=X", "EURJPY=X", "GBPJPY=X", "AUDJPY=X",
        "CADJPY=X", "CHFJPY=X", "EURCHF=X", "GBPCHF=X",
    ],
    "crypto": [
        "BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD",
        "XRP-USD", "ADA-USD", "AVAX-USD", "DOT-USD",
        "MATIC-USD", "LINK-USD", "LTC-USD", "BCH-USD",
    ],
    "indices": [
        "^GSPC", "^DJI", "^IXIC", "^FTSE",
        "^GDAXI", "^FCHI", "^N225", "^HSI",
    ],
    "commodities": [
        "GC=F", "SI=F", "CL=F", "BZ=F",
        "NG=F", "HG=F", "PL=F",
    ]
}

SYMBOL_NAMES = {
    "EURUSD=X": "EUR/USD", "GBPUSD=X": "GBP/USD", "USDJPY=X": "USD/JPY",
    "USDCHF=X": "USD/CHF", "AUDUSD=X": "AUD/USD", "USDCAD=X": "USD/CAD",
    "NZDUSD=X": "NZD/USD", "EURGBP=X": "EUR/GBP", "EURJPY=X": "EUR/JPY",
    "GBPJPY=X": "GBP/JPY", "AUDJPY=X": "AUD/JPY", "CADJPY=X": "CAD/JPY",
    "CHFJPY=X": "CHF/JPY", "EURCHF=X": "EUR/CHF", "GBPCHF=X": "GBP/CHF",
    "BTC-USD": "BTC/USD", "ETH-USD": "ETH/USD", "BNB-USD": "BNB/USD",
    "SOL-USD": "SOL/USD", "XRP-USD": "XRP/USD", "ADA-USD": "ADA/USD",
    "AVAX-USD": "AVAX/USD", "DOT-USD": "DOT/USD", "MATIC-USD": "MATIC/USD",
    "LINK-USD": "LINK/USD", "LTC-USD": "LTC/USD", "BCH-USD": "BCH/USD",
    "^GSPC": "S&P 500", "^DJI": "Dow Jones", "^IXIC": "NASDAQ",
    "^FTSE": "FTSE 100", "^GDAXI": "DAX", "^FCHI": "CAC 40",
    "^N225": "Nikkei 225", "^HSI": "Hang Seng",
    "GC=F": "Gold", "SI=F": "Silver", "CL=F": "WTI Oil",
    "BZ=F": "Brent Oil", "NG=F": "Natural Gas", "HG=F": "Copper", "PL=F": "Platinum",
}

ALL_SYMBOLS = [s for cat in SYMBOLS.values() for s in cat]

def get_market(symbol: str) -> str:
    for market, syms in SYMBOLS.items():
        if symbol in syms:
            return market
    return "unknown"

def get_display_name(symbol: str) -> str:
    return SYMBOL_NAMES.get(symbol, symbol)
