import pandas as pd

class Backtester:
    """
    slippage: Model the percent price deviation from the original
    max_position_pct: Max position percentage
    """
    def __init__(
        self, 
        df: pd.DataFrame,
        signal, initial_capital: float = 10000, 
        fee_rate: float = 0.0, 
        slippage: float = 0.002, 
        max_position_pct: float = 1.0):

        self.df = df.copy()
        self.signal = signal
        self.initial_capital = initial_capital
        self.fee_rate = fee_rate
        self.slippage = slippage
        self.max_position_pct = max_position_pct 


    def run(self):
        df = self.df.copy()
        df['signal'] = self.signal
        cash = self.initial_capital
        position = 0.0
        equity_curve = []
        buy_signals = []
        sell_signals = []
        invested_initial = None
        for idx, row in df.iterrows():
            price = float(row['Close'])
            sig = int(row['signal'])
            if sig == 1 and position == 0:
                exec_price = price * (1.0 + float(self.slippage))
                invest_target = float(self.initial_capital) * max(0.0, min(1.0, float(self.max_position_pct)))
                invest = min(cash, invest_target)
                qty = invest / exec_price if exec_price > 0 else 0.0
                fee = invest * float(self.fee_rate)
                cash = cash - invest - fee
                position = qty
                buy_signals.append((idx, exec_price))
                if invested_initial is None:
                    invested_initial = invest_target
            elif sig == -1 and position > 0:
                exec_price = price * (1.0 - float(self.slippage))
                proceeds = position * exec_price
                fee = proceeds * float(self.fee_rate)
                cash = cash + proceeds - fee
                position = 0.0
                sell_signals.append((idx, exec_price))
            equity_curve.append(cash + position * price)
        if position > 0:
            final_price = float(df['Close'].iloc[-1])
            exec_price = final_price * (1.0 - float(self.slippage))
            proceeds = position * exec_price
            fee = proceeds * float(self.fee_rate)
            cash = cash + proceeds - fee
            position = 0.0
            sell_signals.append((df.index[-1], exec_price))
            equity_curve[-1] = cash
        return {
            'dates': df.index.tolist(),
            'equity_curve': equity_curve,
            'buy_signals': buy_signals,
            'sell_signals': sell_signals,
            'signal': df['signal'].astype(float).tolist(),
            'invested_initial': invested_initial if invested_initial is not None else 0.0,
        }
