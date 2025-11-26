import pandas as pd

def sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window).mean()

def ema(series: pd.Series, window: int) -> pd.Series:
    return series.ewm(span=window, adjust=False).mean()

def rsi(series: pd.Series, window: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window).mean()
    avg_loss = loss.rolling(window).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = ema(series, fast)
    ema_slow = ema(series, slow)
    diff = ema_fast - ema_slow
    dea = diff.ewm(span=signal, adjust=False).mean()
    hist = diff - dea
    return diff, dea, hist

def bbands(series: pd.Series, window: int = 20, mult: float = 2.0):
    mid = sma(series, window)
    std = series.rolling(window).std()
    upper = mid + mult * std
    lower = mid - mult * std
    return mid, upper, lower

def donchian(high: pd.Series, low: pd.Series, window: int = 20):
    upper = high.rolling(window).max()
    lower = low.rolling(window).min()
    return upper, lower
