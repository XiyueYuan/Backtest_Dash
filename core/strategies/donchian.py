import pandas as pd
from ..indicators import donchian

def donchian_breakout(df: pd.DataFrame, window: int = 20):
    df = df.copy()
    upper, lower = donchian(df['High'], df['Low'], window)
    signal = pd.Series(0, index=df.index)
    signal[df['Close'] > upper] = 1
    signal[df['Close'] < lower] = -1
    return signal
