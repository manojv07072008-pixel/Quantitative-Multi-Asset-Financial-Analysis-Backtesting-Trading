import numpy as np
import pandas as pd
from typing import Dict, List, Any

def classify_market_regimes(
    df: pd.DataFrame,
    trend_window: int = 100,
    vol_window: int = 30
) -> pd.DataFrame:
    """
    Classifies market data into:
    - Trend: Bull Market vs Bear Market (based on close relative to trend moving average)
    - Volatility: High Volatility vs Low Volatility (based on rolling volatility vs median)
    - Combined Regime: 'Bull / Low Vol', 'Bull / High Vol', 'Bear / Low Vol', 'Bear / High Vol'
    """
    res = df.copy()
    res["date"] = pd.to_datetime(res["date"])
    res.sort_values("date", inplace=True)
    res.reset_index(drop=True, inplace=True)

    closes = res["close"]
    daily_returns = closes.pct_change().fillna(0)

    # Trend regime (Bull vs Bear)
    sma_trend = closes.rolling(window=trend_window, min_periods=20).mean()
    res["is_bull"] = closes >= sma_trend
    res["trend_regime"] = np.where(res["is_bull"], "Bull Market", "Bear Market")

    # Volatility regime (High Vol vs Low Vol)
    rolling_vol = daily_returns.rolling(window=vol_window, min_periods=10).std() * np.sqrt(252)
    vol_median = rolling_vol.median()
    res["is_high_vol"] = rolling_vol > vol_median
    res["vol_regime"] = np.where(res["is_high_vol"], "High Volatility", "Low Volatility")

    # Combined regime
    def combine_regimes(row):
        t = "Bull" if row["is_bull"] else "Bear"
        v = "High Vol" if row["is_high_vol"] else "Low Vol"
        return f"{t} / {v}"

    res["combined_regime"] = res.apply(combine_regimes, axis=1)
    res["rolling_volatility"] = rolling_vol.fillna(0).round(4)
    res["trend_sma"] = sma_trend.bfill().round(2)
    res["date"] = res["date"].dt.strftime("%Y-%m-%d")
    return res

def analyze_strategy_by_regime(
    equity_curve: List[Dict[str, Any]],
    regime_df: pd.DataFrame
) -> Dict[str, Any]:
    """
    Attributes strategy performance across market regimes.
    """
    eq_df = pd.DataFrame(equity_curve)
    if eq_df.empty:
        return {}

    merged = pd.merge(eq_df, regime_df[["date", "trend_regime", "vol_regime", "combined_regime"]], on="date")
    if merged.empty:
        return {}

    merged["strat_return"] = merged["strategy_equity"].pct_change().fillna(0)
    merged["bench_return"] = merged["benchmark_equity"].pct_change().fillna(0)

    regimes = ["Bull Market", "Bear Market", "High Volatility", "Low Volatility"]
    combined_regimes = ["Bull / Low Vol", "Bull / High Vol", "Bear / Low Vol", "Bear / High Vol"]

    summary = {}

    for r in regimes:
        # Check in trend or vol
        mask = (merged["trend_regime"] == r) | (merged["vol_regime"] == r)
        sub = merged[mask]
        n_days = len(sub)
        if n_days > 0:
            strat_ret = (sub["strat_return"] + 1).prod() - 1
            bench_ret = (sub["bench_return"] + 1).prod() - 1
            strat_vol = sub["strat_return"].std() * np.sqrt(252)
            strat_ann_ret = ((1 + strat_ret) ** (252 / max(n_days, 1))) - 1 if strat_ret > -1 else -1.0
            win_days = (sub["strat_return"] > 0).sum()
            summary[r] = {
                "days": int(n_days),
                "strategy_cumulative_return_pct": float(round(strat_ret * 100, 2)),
                "benchmark_cumulative_return_pct": float(round(bench_ret * 100, 2)),
                "strategy_annualized_return_pct": float(round(strat_ann_ret * 100, 2)),
                "strategy_volatility_pct": float(round(strat_vol * 100, 2)),
                "positive_days_pct": float(round((win_days / n_days) * 100, 2))
            }
        else:
            summary[r] = {"days": 0, "strategy_cumulative_return_pct": 0.0, "benchmark_cumulative_return_pct": 0.0, "strategy_volatility_pct": 0.0, "positive_days_pct": 0.0}

    combined_summary = {}
    for cr in combined_regimes:
        sub = merged[merged["combined_regime"] == cr]
        n_days = len(sub)
        if n_days > 0:
            strat_ret = (sub["strat_return"] + 1).prod() - 1
            bench_ret = (sub["bench_return"] + 1).prod() - 1
            strat_ann_ret = ((1 + strat_ret) ** (252 / max(n_days, 1))) - 1 if strat_ret > -1 else -1.0
            combined_summary[cr] = {
                "days": int(n_days),
                "strategy_return_pct": float(round(strat_ret * 100, 2)),
                "benchmark_return_pct": float(round(bench_ret * 100, 2)),
                "strategy_annualized_pct": float(round(strat_ann_ret * 100, 2)),
                "percentage_of_time": float(round((n_days / len(merged)) * 100, 1))
            }

    # Timeline sample for visualization
    timeline = []
    step = max(1, len(merged) // 80)
    for i in range(0, len(merged), step):
        row = merged.iloc[i]
        timeline.append({
            "date": row["date"],
            "trend_regime": row["trend_regime"],
            "vol_regime": row["vol_regime"],
            "combined_regime": row["combined_regime"],
            "strategy_equity": float(row["strategy_equity"]),
            "benchmark_equity": float(row["benchmark_equity"])
        })

    return {
        "regime_metrics": summary,
        "combined_regimes": combined_summary,
        "timeline": timeline
    }
