import pandas as pd
from ..indicators import ema

def ema_crossover(df: pd.DataFrame, short_window: int = 12, long_window: int = 26):
    df = df.copy()
    df['ema_short'] = ema(df['Close'], short_window)
    df['ema_long'] = ema(df['Close'], long_window)
    signal = []
    prev_s, prev_l = None, None
    for s, l in zip(df['ema_short'], df['ema_long']):
        if prev_s is None:
            signal.append(0)
        elif prev_s < prev_l and s > l:
            signal.append(1)
        elif prev_s > prev_l and s < l:
            signal.append(-1)
        else:
            signal.append(0)
        prev_s, prev_l = s, l
    return signal
