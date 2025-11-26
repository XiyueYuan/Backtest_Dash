import pandas as pd
from ..indicators import macd

def macd_strategy(df: pd.DataFrame, fast: int = 12, slow: int = 26, sig: int = 9):
    dif, dea, hist = macd(df['Close'], fast, slow, sig)
    signal = []
    prev_d, prev_e = None, None
    for d, e in zip(dif, dea):
        if prev_d is None:
            signal.append(0)
        elif prev_d < prev_e and d > e:
            signal.append(1)
        elif prev_d > prev_e and d < e:
            signal.append(-1)
        else:
            signal.append(0)
        prev_d, prev_e = d, e
    return signal
