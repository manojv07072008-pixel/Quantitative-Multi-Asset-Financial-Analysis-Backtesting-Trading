import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional

RISK_FREE_RATE_DEFAULT = 0.04  # 4% annual risk-free rate assumption

def compute_technical_indicators(
    df: pd.DataFrame, 
    sma_periods: List[int] = [20, 50, 200],
    ema_periods: List[int] = [12, 26, 50],
    rolling_window: int = 30,
    risk_free_rate: float = RISK_FREE_RATE_DEFAULT
) -> pd.DataFrame:
    """
    Augments the OHLCV DataFrame with quantitative and technical indicators:
    SMA, EMA, Returns, Annualized Volatility, Rolling Returns, Rolling Volatility,
    Rolling Sharpe, and Drawdowns.
    """
    res = df.copy()
    res["date"] = pd.to_datetime(res["date"])
    res.sort_values("date", inplace=True)
    res.reset_index(drop=True, inplace=True)

    # 1. Simple Moving Averages (SMA)
    for p in sma_periods:
        res[f"sma_{p}"] = res["close"].rolling(window=p, min_periods=1).mean().round(2)

    # 2. Exponential Moving Averages (EMA)
    for p in ema_periods:
        res[f"ema_{p}"] = res["close"].ewm(span=p, adjust=False).mean().round(2)

    # 3. Daily Returns and Cumulative Returns
    res["daily_return"] = res["close"].pct_change().fillna(0)
    res["cumulative_return"] = (1 + res["daily_return"]).cumprod() - 1

    # 4. Rolling Returns (e.g., 30-day rolling return)
    res[f"rolling_return_{rolling_window}d"] = (
        res["close"].pct_change(periods=rolling_window).fillna(0)
    )

    # 5. Historical & Rolling Annualized Volatility (assuming 252 trading days/year)
    res[f"rolling_volatility_{rolling_window}d"] = (
        res["daily_return"].rolling(window=rolling_window, min_periods=5).std() * np.sqrt(252)
    ).fillna(0)

    # 6. Maximum Drawdown & Drawdown Series
    running_max = res["close"].cummax()
    res["drawdown"] = (res["close"] - running_max) / running_max
    
    # 7. Rolling Sharpe Ratio
    daily_rf = (1 + risk_free_rate) ** (1 / 252) - 1
    excess_daily = res["daily_return"] - daily_rf
    rolling_mean_excess = excess_daily.rolling(window=rolling_window, min_periods=5).mean() * 252
    rolling_std = res["daily_return"].rolling(window=rolling_window, min_periods=5).std() * np.sqrt(252)
    res[f"rolling_sharpe_{rolling_window}d"] = (rolling_mean_excess / (rolling_std + 1e-9)).fillna(0)

    # Re-format date to ISO string for JSON serialization
    res["date"] = res["date"].dt.strftime("%Y-%m-%d")
    return res

def compute_summary_metrics(df: pd.DataFrame, risk_free_rate: float = RISK_FREE_RATE_DEFAULT) -> Dict[str, Any]:
    """
    Computes overarching summary quantitative statistics for an asset.
    """
    returns = df["close"].pct_change().dropna()
    if len(returns) == 0:
        return {}

    total_return = (df["close"].iloc[-1] / df["close"].iloc[0]) - 1
    n_days = len(returns)
    cagr = ((1 + total_return) ** (252 / max(n_days, 1))) - 1 if total_return > -1 else -1.0

    ann_vol = returns.std() * np.sqrt(252)
    
    # Sharpe
    daily_rf = (1 + risk_free_rate) ** (1 / 252) - 1
    excess_returns = returns - daily_rf
    sharpe = (excess_returns.mean() * 252) / (ann_vol + 1e-9)

    # Sortino
    downside_returns = returns[returns < 0]
    downside_vol = (downside_returns.std() * np.sqrt(252)) if len(downside_returns) > 0 else 1e-9
    sortino = (excess_returns.mean() * 252) / (downside_vol + 1e-9)

    # Max Drawdown
    running_max = df["close"].cummax()
    drawdowns = (df["close"] - running_max) / running_max
    max_drawdown = drawdowns.min()

    # Calmar Ratio
    calmar = cagr / (abs(max_drawdown) + 1e-9)

    return {
        "current_price": float(round(df["close"].iloc[-1], 2)),
        "price_change_abs": float(round(df["close"].iloc[-1] - df["close"].iloc[0], 2)),
        "total_return_pct": float(round(total_return * 100, 2)),
        "cagr_pct": float(round(cagr * 100, 2)),
        "annualized_volatility_pct": float(round(ann_vol * 100, 2)),
        "sharpe_ratio": float(round(sharpe, 2)),
        "sortino_ratio": float(round(sortino, 2)),
        "calmar_ratio": float(round(calmar, 2)),
        "max_drawdown_pct": float(round(max_drawdown * 100, 2)),
        "total_data_points": int(len(df)),
        "start_date": str(df["date"].iloc[0]),
        "end_date": str(df["date"].iloc[-1])
    }

def compute_cross_asset_correlation(
    datasets: Dict[str, pd.DataFrame], 
    method: str = "pearson"
) -> Dict[str, Any]:
    """
    Computes cross-asset correlation matrix based on daily returns.
    """
    price_dfs = []
    symbols = list(datasets.keys())

    for sym, df in datasets.items():
        sub = df[["date", "close"]].copy()
        sub["date"] = pd.to_datetime(sub["date"])
        sub.rename(columns={"close": sym}, inplace=True)
        sub.set_index("date", inplace=True)
        price_dfs.append(sub)

    if not price_dfs:
        return {"symbols": [], "matrix": []}

    combined = pd.concat(price_dfs, axis=1).dropna()
    returns = combined.pct_change().dropna()

    corr_matrix = returns.corr(method=method)
    matrix_data = []
    for s1 in symbols:
        row = []
        for s2 in symbols:
            val = corr_matrix.loc[s1, s2] if (s1 in corr_matrix.index and s2 in corr_matrix.columns) else 0.0
            row.append(float(round(val, 3)))
        matrix_data.append(row)

    return {
        "symbols": symbols,
        "method": method,
        "matrix": matrix_data
    }

def compute_rolling_correlation(
    df1: pd.DataFrame, 
    df2: pd.DataFrame, 
    sym1: str, 
    sym2: str, 
    window: int = 30
) -> List[Dict[str, Any]]:
    """
    Computes rolling correlation time series between two assets.
    """
    m1 = df1[["date", "close"]].copy()
    m2 = df2[["date", "close"]].copy()
    m1["date"] = pd.to_datetime(m1["date"])
    m2["date"] = pd.to_datetime(m2["date"])

    merged = pd.merge(m1, m2, on="date", suffixes=(f"_{sym1}", f"_{sym2}")).dropna()
    merged.sort_values("date", inplace=True)

    r1 = merged[f"close_{sym1}"].pct_change()
    r2 = merged[f"close_{sym2}"].pct_change()

    rolling_corr = r1.rolling(window=window, min_periods=10).corr(r2).fillna(0)

    result = []
    for d, val in zip(merged["date"], rolling_corr):
        result.append({
            "date": d.strftime("%Y-%m-%d"),
            "correlation": float(round(val, 3))
        })
    return result
