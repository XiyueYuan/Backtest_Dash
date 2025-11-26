import numpy as np

def compute_returns(equity_curve: list) -> np.ndarray:
    eq = np.array(equity_curve, dtype=float)
    if eq.size < 2:
        return np.array([], dtype=float)
    return np.diff(eq) / eq[:-1]

def annual_return(equity_curve: list) -> float:
    if len(equity_curve) < 2:
        return 0.0
    total = float(equity_curve[-1]) / float(equity_curve[0]) - 1.0
    years = len(equity_curve) / 252.0
    if years <= 0:
        return 0.0
    return (1.0 + total) ** (1.0 / years) - 1.0

def max_drawdown(equity_curve: list) -> float:
    eq = np.array(equity_curve, dtype=float)
    if eq.size == 0:
        return 0.0
    peak = np.maximum.accumulate(eq)
    dd = (eq - peak) / peak
    return float(dd.min())

def volatility(returns: np.ndarray) -> float:
    if returns.size == 0:
        return 0.0
    return float(returns.std() * np.sqrt(252.0))

def sharpe_ratio(returns: np.ndarray, risk_free_rate: float = 0.02) -> float:
    if returns.size == 0:
        return 0.0
    excess = returns - risk_free_rate / 252.0
    std = excess.std()
    if std == 0:
        return 0.0
    return float(excess.mean() / std * np.sqrt(252.0))

def compute_metrics(equity_curve: list) -> dict:
    r = compute_returns(equity_curve)
    return {
        'annual_return': annual_return(equity_curve),
        'max_drawdown': max_drawdown(equity_curve),
        'volatility': volatility(r),
        'sharpe_ratio': sharpe_ratio(r),
    }
