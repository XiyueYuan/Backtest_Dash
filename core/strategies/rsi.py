import pandas as pd
from ..indicators import rsi

def rsi_threshold(df: pd.DataFrame, low: int = 30, high: int = 70):
    rs = rsi(df['Close'])
    signal = []
    for v in rs:
        if pd.isna(v):
            signal.append(0)
        elif v < low:
            signal.append(1)
        elif v > high:
            signal.append(-1)
        else:
            signal.append(0)
    return signal
