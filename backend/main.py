from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import sys
import pandas as pd

# make core importable
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CORE_DIR = os.path.join(BASE_DIR, 'core')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
sys.path.append(BASE_DIR)

from core.data_loader import load_price_data
from core.strategies import sma_crossover, ema_crossover, macd_strategy, rsi_threshold, bb_breakout, donchian_breakout
from core.backtester import Backtester
from core.metrics import compute_metrics

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount('/static', StaticFiles(directory=FRONTEND_DIR), name='static')

@app.get('/')
def index():
    return FileResponse(os.path.join(FRONTEND_DIR, 'index.html'))

def sanitize_dates(start: str, end: str):
    s = str(start).strip()
    e = str(end).strip()
    s_dt = pd.to_datetime(s, errors='coerce')
    e_dt = pd.to_datetime(e, errors='coerce')
    if s_dt is pd.NaT or e_dt is pd.NaT:
        return None, None, JSONResponse(status_code=400, content={'error': 'Invalid date format. Use YYYY-MM-DD'})
    if e_dt < s_dt:
        return None, None, JSONResponse(status_code=400, content={'error': 'End date must be after start date'})
    return s_dt.strftime('%Y-%m-%d'), e_dt.strftime('%Y-%m-%d'), None

@app.get('/ohlcv')
def ohlcv(symbol: str, start: str, end: str):
    symbol = str(symbol).strip().upper()
    start_s, end_s, err = sanitize_dates(start, end)
    if err: return err
    try:
        df = load_price_data(symbol, start_s, end_s)
        out = []
        for idx, row in df.iterrows():
            t = int(pd.Timestamp(idx).timestamp())
            out.append({'time': t, 'open': float(row['Open']), 'high': float(row['High']), 'low': float(row['Low']), 'close': float(row['Close'])})
        return out
    except ValueError as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

@app.get('/backtest')
def backtest(symbol: str, start: str, end: str, strategy: str = 'sma', short: int = 10, long: int = 20, rsi_low: int = 30, rsi_high: int = 70, bb_window: int = 20, bb_mult: float = 2.0, donchian_window: int = 20):
    symbol = str(symbol).strip().upper()
    start_s, end_s, err = sanitize_dates(start, end)
    if err: return err
    try:
        df = load_price_data(symbol, start_s, end_s)
    except ValueError as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

    if strategy == 'sma':
        signal = sma_crossover(df, short_window=short, long_window=long)
    elif strategy == 'ema':
        signal = pd.Series(ema_crossover(df, short_window=short, long_window=long), index=df.index)
    elif strategy == 'macd':
        signal = pd.Series(macd_strategy(df), index=df.index)
    elif strategy == 'rsi':
        signal = pd.Series(rsi_threshold(df, low=rsi_low, high=rsi_high), index=df.index)
    elif strategy == 'bbands':
        signal = bb_breakout(df, window=bb_window, mult=bb_mult)
    elif strategy == 'donchian':
        signal = donchian_breakout(df, window=donchian_window)
    else:
        return JSONResponse(status_code=400, content={'error': 'unknown strategy'})

    bt = Backtester(df, signal)
    result = bt.run()
    metrics = compute_metrics(result['equity_curve']) if len(result['equity_curve']) >= 2 else {"annual_return":0.0,"sharpe_ratio":0.0,"volatility":0.0,"max_drawdown":0.0}

    curve = {
        'dates': [pd.Timestamp(d).isoformat() for d in result['dates']],
        'equity_curve': [float(x) for x in result['equity_curve']],
        'buy_signals': [(pd.Timestamp(d).isoformat(), float(p)) for d, p in result['buy_signals']],
        'sell_signals': [(pd.Timestamp(d).isoformat(), float(p)) for d, p in result['sell_signals']],
    }
    return {'curve': curve, 'metrics': metrics}
