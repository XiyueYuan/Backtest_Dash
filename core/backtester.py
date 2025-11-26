import pandas as pd

class Backtester:
    def __init__(self, df: pd.DataFrame, signal, initial_capital: float = 10000):
        self.df = df.copy()
        self.signal = signal
        self.initial_capital = initial_capital

    def run(self):
        df = self.df.copy()
        df['signal'] = self.signal
        cash = self.initial_capital
        position = 0.0
        equity_curve = []
        buy_signals = []
        sell_signals = []
        for idx, row in df.iterrows():
            price = float(row['Close'])
            sig = int(row['signal'])
            if sig == 1 and position == 0:
                position = cash / price
                cash = 0.0
                buy_signals.append((idx, price))
            elif sig == -1 and position > 0:
                cash = position * price
                position = 0.0
                sell_signals.append((idx, price))
            equity_curve.append(cash + position * price)
        if position > 0:
            final_price = float(df['Close'].iloc[-1])
            cash = position * final_price
            position = 0.0
            sell_signals.append((df.index[-1], final_price))
            equity_curve[-1] = cash
        return {
            'dates': df.index.tolist(),
            'equity_curve': equity_curve,
            'buy_signals': buy_signals,
            'sell_signals': sell_signals,
            'signal': df['signal'].astype(float).tolist(),
        }
