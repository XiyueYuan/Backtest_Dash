import yfinance as yf
import pandas as pd

def load_price_data(symbol: str, start: str, end: str) -> pd.DataFrame:
    df = yf.download(symbol, start=start, end=end, interval='1d', auto_adjust=True, actions=False)
    if df.empty:
        fallback = yf.download(symbol, period='1y', interval='1d', auto_adjust=True, actions=False)
        df = fallback.loc[start:end] if not fallback.empty else fallback
        if df.empty:
            raise ValueError(f'No data found for {symbol}. Check symbol or date')
    df = df.dropna()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    if df.index.name is None:
        df.index.name = 'Date'
    return df
