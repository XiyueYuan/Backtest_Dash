import pandas as pd
from ..indicators import bbands

def bb_breakout(df: pd.DataFrame, window: int = 20, mult: float = 2.0):
    df = df.copy()
    mid, upper, lower = bbands(df['Close'], window, mult)
    signal = pd.Series(0, index=df.index)
    signal[df['Close'] > upper] = 1
    signal[df['Close'] < lower] = -1
    return signal
