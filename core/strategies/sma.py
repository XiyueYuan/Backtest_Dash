import pandas as pd
from ..indicators import sma

def sma_crossover(df: pd.DataFrame, short_window: int = 10, long_window: int = 20) -> pd.Series:
    df = df.copy()
    df['sma_short'] = sma(df['Close'], short_window)
    df['sma_long'] = sma(df['Close'], long_window)
    signal = pd.Series(0, index=df.index)
    signal[df['sma_short'] > df['sma_long']] = 1
    signal[df['sma_short'] < df['sma_long']] = -1
    return signal
