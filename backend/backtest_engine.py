import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional

RISK_FREE_RATE_DEFAULT = 0.04

def generate_signals(
    df: pd.DataFrame,
    strategy: str,
    params: Dict[str, Any]
) -> pd.Series:
    """
    Generates 1 (Long position) or 0 (Cash / Out of market) signals.
    Minimizes look-ahead bias: signals are computed strictly on past and current bar info.
    """
    closes = df["close"]
    signals = pd.Series(0, index=df.index)

    if strategy == "sma_crossover":
        fast = int(params.get("fast_period", 20))
        slow = int(params.get("slow_period", 50))
        sma_fast = closes.rolling(window=fast, min_periods=fast).mean()
        sma_slow = closes.rolling(window=slow, min_periods=slow).mean()
        # Buy when fast > slow
        signals = (sma_fast > sma_slow).astype(int)

    elif strategy == "ema_trend":
        fast = int(params.get("fast_period", 12))
        slow = int(params.get("slow_period", 26))
        trend_period = int(params.get("trend_period", 100))
        
        ema_fast = closes.ewm(span=fast, adjust=False).mean()
        ema_slow = closes.ewm(span=slow, adjust=False).mean()
        sma_trend = closes.rolling(window=trend_period, min_periods=trend_period).mean()
        
        # Bullish cross + price above long term trend
        condition = (ema_fast > ema_slow) & (closes > sma_trend)
        signals = condition.astype(int)

    elif strategy == "momentum":
        lookback = int(params.get("lookback_period", 14))
        threshold = float(params.get("threshold_pct", 1.0)) / 100.0  # e.g., 1% return
        
        # Momentum = Rate of Change over lookback
        roc = closes.pct_change(periods=lookback).fillna(0)
        signals = (roc > threshold).astype(int)

    elif strategy == "mean_reversion":
        window = int(params.get("window", 20))
        num_std = float(params.get("num_std", 2.0))
        
        rolling_mean = closes.rolling(window=window, min_periods=window).mean()
        rolling_std = closes.rolling(window=window, min_periods=window).std()
        
        lower_band = rolling_mean - (num_std * rolling_std)
        upper_band = rolling_mean + (num_std * rolling_std)

        # In mean reversion, buy when price falls below lower band, exit when crosses mean or upper band
        in_pos = False
        sig_list = []
        for i in range(len(closes)):
            p = closes.iloc[i]
            lb = lower_band.iloc[i]
            mb = rolling_mean.iloc[i]
            if pd.isna(lb) or pd.isna(mb):
                sig_list.append(0)
                continue
            
            if not in_pos and p < lb:
                in_pos = True
            elif in_pos and p >= mb:
                in_pos = False
            
            sig_list.append(1 if in_pos else 0)
        signals = pd.Series(sig_list, index=df.index)

    elif strategy == "ml_ensemble":
        # Machine Learning Predictive Alpha Strategy
        from sklearn.ensemble import RandomForestClassifier
        
        # Calculate features strictly on past bars
        rsi_window = int(params.get("rsi_window", 14))
        delta = closes.diff()
        gain = delta.clip(lower=0).rolling(rsi_window).mean()
        loss = -delta.clip(upper=0).rolling(rsi_window).mean()
        rsi = (100 - (100 / (1 + (gain / (loss + 1e-9))))).fillna(50)
        
        sma_fast = closes.rolling(20, min_periods=10).mean()
        sma_slow = closes.rolling(50, min_periods=20).mean()
        ma_ratio = (sma_fast / (sma_slow + 1e-9)) - 1.0
        
        vol = (closes.pct_change().rolling(15, min_periods=5).std() * np.sqrt(252)).fillna(0)
        mom = closes.pct_change(5).fillna(0)

        # Build feature matrix
        feat_matrix = pd.DataFrame({
            "rsi": rsi,
            "ma_ratio": ma_ratio,
            "vol": vol,
            "mom": mom
        }).fillna(0)

        # Target: next-day return > 0
        target = (closes.shift(-1) > closes).astype(int)

        # Walk-forward periodic re-fitting (retrain every 10 bars for realistic low computational latency)
        sig_list = [0] * len(closes)
        min_train = 60
        threshold = float(params.get("confidence_threshold", 0.51))
        rebalance_stride = 10
        clf = None

        for t in range(min_train, len(closes) - 1):
            if (t - min_train) % rebalance_stride == 0 or clf is None:
                X_tr = feat_matrix.iloc[:t].values
                y_tr = target.iloc[:t].values
                if len(np.unique(y_tr)) >= 2:
                    clf = RandomForestClassifier(n_estimators=25, max_depth=3, random_state=42)
                    clf.fit(X_tr, y_tr)
            
            if clf is not None:
                curr_x = feat_matrix.iloc[t:t+1].values
                prob = clf.predict_proba(curr_x)[0][1]
                sig_list[t] = 1 if prob >= threshold else 0

        signals = pd.Series(sig_list, index=df.index)

    else:
        # Default buy and hold
        signals = pd.Series(1, index=df.index)

    return signals

def run_backtest(
    df: pd.DataFrame,
    strategy: str = "sma_crossover",
    params: Optional[Dict[str, Any]] = None,
    initial_capital: float = 100000.0,
    position_size_pct: float = 1.0,  # Fraction of portfolio to allocate
    transaction_cost_pct: float = 0.001,  # 0.1% per trade (slippage + broker fee)
    risk_free_rate: float = RISK_FREE_RATE_DEFAULT
) -> Dict[str, Any]:
    """
    Executes a realistic discrete portfolio backtest simulating equity, trades,
    transaction costs, position sizing, and comparison against Buy-and-Hold benchmark.
    """
    if params is None:
        params = {}

    data = df.copy()
    data.sort_values("date", inplace=True)
    data.reset_index(drop=True, inplace=True)

    # 1. Generate Strategy Signals (1 = Long, 0 = Flat)
    target_position = generate_signals(data, strategy, params)
    
    # 2. Prevent Look-Ahead Bias: Execute trades on the open of the following day, or close of same bar with execution delay
    # We lag target signal by 1 bar to simulate entering on next bar
    trade_signals = target_position.shift(1).fillna(0).astype(int)

    n = len(data)
    dates = data["date"].tolist()
    closes = data["close"].values
    
    cash = initial_capital
    shares = 0.0
    portfolio_values = []
    cash_history = []
    positions_history = []
    trades = []

    current_trade = None

    for i in range(n):
        price = closes[i]
        sig = trade_signals.iloc[i]
        curr_val = cash + (shares * price)

        # Signal changes from 0 to 1 (Enter Long)
        if sig == 1 and shares == 0:
            target_alloc = curr_val * min(max(position_size_pct, 0.1), 1.0)
            cost_factor = 1 + transaction_cost_pct
            shares_to_buy = target_alloc / (price * cost_factor)
            fee = shares_to_buy * price * transaction_cost_pct
            total_spent = (shares_to_buy * price) + fee
            
            cash -= total_spent
            shares = shares_to_buy
            
            current_trade = {
                "entry_date": dates[i],
                "entry_price": float(round(price, 2)),
                "shares": float(round(shares, 4)),
                "entry_fee": float(round(fee, 2))
            }

        # Signal changes from 1 to 0 (Exit Long to Cash)
        elif sig == 0 and shares > 0:
            proceeds = shares * price
            fee = proceeds * transaction_cost_pct
            net_proceeds = proceeds - fee
            cash += net_proceeds

            if current_trade:
                pnl = net_proceeds - (current_trade["shares"] * current_trade["entry_price"] + current_trade["entry_fee"])
                ret_pct = (pnl / (current_trade["shares"] * current_trade["entry_price"])) * 100
                trades.append({
                    "trade_id": len(trades) + 1,
                    "type": "LONG",
                    "entry_date": current_trade["entry_date"],
                    "entry_price": current_trade["entry_price"],
                    "exit_date": dates[i],
                    "exit_price": float(round(price, 2)),
                    "shares": current_trade["shares"],
                    "pnl": float(round(pnl, 2)),
                    "return_pct": float(round(ret_pct, 2)),
                    "fees": float(round(current_trade["entry_fee"] + fee, 2))
                })
                current_trade = None
            
            shares = 0.0

        port_val = cash + (shares * price)
        portfolio_values.append(port_val)
        cash_history.append(cash)
        positions_history.append(shares * price)

    # If trade still open at end of period, mark-to-market
    if shares > 0 and current_trade:
        final_price = closes[-1]
        proceeds = shares * final_price
        fee = proceeds * transaction_cost_pct
        net_proceeds = proceeds - fee
        pnl = net_proceeds - (current_trade["shares"] * current_trade["entry_price"] + current_trade["entry_fee"])
        ret_pct = (pnl / (current_trade["shares"] * current_trade["entry_price"])) * 100
        trades.append({
            "trade_id": len(trades) + 1,
            "type": "LONG (OPEN)",
            "entry_date": current_trade["entry_date"],
            "entry_price": current_trade["entry_price"],
            "exit_date": dates[-1],
            "exit_price": float(round(final_price, 2)),
            "shares": current_trade["shares"],
            "pnl": float(round(pnl, 2)),
            "return_pct": float(round(ret_pct, 2)),
            "fees": float(round(current_trade["entry_fee"] + fee, 2))
        })

    # Benchmark: Buy and Hold benchmark from day 0
    benchmark_shares = (initial_capital * (1 - transaction_cost_pct)) / closes[0]
    benchmark_values = benchmark_shares * closes

    # Compute Equity Curve Series & Drawdowns
    equity_curve = []
    strat_vals = np.array(portfolio_values)
    strat_running_max = np.maximum.accumulate(strat_vals)
    strat_drawdowns = (strat_vals - strat_running_max) / strat_running_max

    bench_vals = np.array(benchmark_values)
    bench_running_max = np.maximum.accumulate(bench_vals)
    bench_drawdowns = (bench_vals - bench_running_max) / bench_running_max

    for i in range(n):
        equity_curve.append({
            "date": dates[i],
            "strategy_equity": float(round(strat_vals[i], 2)),
            "benchmark_equity": float(round(bench_vals[i], 2)),
            "strategy_drawdown_pct": float(round(strat_drawdowns[i] * 100, 2)),
            "benchmark_drawdown_pct": float(round(bench_drawdowns[i] * 100, 2)),
            "position": int(trade_signals.iloc[i]),
            "cash": float(round(cash_history[i], 2))
        })

    # Metrics for Strategy
    strat_returns = pd.Series(strat_vals).pct_change().dropna()
    bench_returns = pd.Series(bench_vals).pct_change().dropna()

    strat_tot_ret = (strat_vals[-1] / initial_capital) - 1
    bench_tot_ret = (bench_vals[-1] / initial_capital) - 1

    n_days = max(n, 1)
    strat_cagr = ((1 + strat_tot_ret) ** (252 / n_days)) - 1 if strat_tot_ret > -1 else -1.0
    bench_cagr = ((1 + bench_tot_ret) ** (252 / n_days)) - 1 if bench_tot_ret > -1 else -1.0

    strat_vol = strat_returns.std() * np.sqrt(252) if len(strat_returns) > 0 else 0.0
    bench_vol = bench_returns.std() * np.sqrt(252) if len(bench_returns) > 0 else 0.0

    daily_rf = (1 + risk_free_rate) ** (1 / 252) - 1
    strat_excess = strat_returns - daily_rf
    bench_excess = bench_returns - daily_rf

    strat_sharpe = (strat_excess.mean() * 252) / (strat_vol + 1e-9)
    bench_sharpe = (bench_excess.mean() * 252) / (bench_vol + 1e-9)

    strat_downside = strat_returns[strat_returns < 0]
    strat_sortino = (strat_excess.mean() * 252) / ((strat_downside.std() * np.sqrt(252)) + 1e-9) if len(strat_downside) > 0 else 0.0

    strat_max_dd = strat_drawdowns.min()
    bench_max_dd = bench_drawdowns.min()

    # Trade statistics
    winning_trades = [t for t in trades if t["pnl"] > 0]
    losing_trades = [t for t in trades if t["pnl"] <= 0]
    gross_profits = sum([t["pnl"] for t in winning_trades])
    gross_losses = abs(sum([t["pnl"] for t in losing_trades]))
    profit_factor = (gross_profits / gross_losses) if gross_losses > 0 else (gross_profits if gross_profits > 0 else 1.0)
    win_rate = (len(winning_trades) / len(trades) * 100) if trades else 0.0
    avg_trade_pnl = (sum([t["pnl"] for t in trades]) / len(trades)) if trades else 0.0

    # Alpha & Beta relative to Benchmark
    cov = np.cov(strat_returns, bench_returns)[0, 1] if len(strat_returns) > 1 else 0.0
    bench_var = np.var(bench_returns) if len(bench_returns) > 1 else 1e-9
    beta = cov / (bench_var + 1e-9)
    alpha = (strat_cagr - (risk_free_rate + beta * (bench_cagr - risk_free_rate)))

    return {
        "strategy": strategy,
        "parameters": params,
        "initial_capital": initial_capital,
        "ending_capital": float(round(strat_vals[-1], 2)),
        "net_profit": float(round(strat_vals[-1] - initial_capital, 2)),
        "metrics": {
            "strategy_return_pct": float(round(strat_tot_ret * 100, 2)),
            "benchmark_return_pct": float(round(bench_tot_ret * 100, 2)),
            "strategy_cagr_pct": float(round(strat_cagr * 100, 2)),
            "benchmark_cagr_pct": float(round(bench_cagr * 100, 2)),
            "strategy_volatility_pct": float(round(strat_vol * 100, 2)),
            "benchmark_volatility_pct": float(round(bench_vol * 100, 2)),
            "strategy_sharpe": float(round(strat_sharpe, 2)),
            "benchmark_sharpe": float(round(bench_sharpe, 2)),
            "strategy_sortino": float(round(strat_sortino, 2)),
            "strategy_max_drawdown_pct": float(round(strat_max_dd * 100, 2)),
            "benchmark_max_drawdown_pct": float(round(bench_max_dd * 100, 2)),
            "alpha_pct": float(round(alpha * 100, 2)),
            "beta": float(round(beta, 2)),
            "profit_factor": float(round(profit_factor, 2)),
            "win_rate_pct": float(round(win_rate, 2)),
            "total_trades": int(len(trades)),
            "winning_trades": int(len(winning_trades)),
            "losing_trades": int(len(losing_trades)),
            "avg_trade_pnl": float(round(avg_trade_pnl, 2))
        },
        "trades": trades,
        "equity_curve": equity_curve
    }
