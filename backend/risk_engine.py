import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Any, Optional

def compute_monte_carlo_simulation(
    equity_series: List[float],
    num_simulations: int = 500,
    forecast_days: int = 252,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Performs bootstrap / geometric Brownian Monte Carlo simulation
    projecting future equity paths with confidence intervals.
    """
    if len(equity_series) < 5:
        return {}

    np.random.seed(seed)
    equity = np.array(equity_series)
    daily_returns = np.diff(equity) / equity[:-1]
    
    mu = np.mean(daily_returns)
    sigma = np.std(daily_returns)
    initial_equity = equity[-1]

    # Generate bootstrap returns or normal shocks
    # Use randomized bootstrap sampling for realistic fat tails
    random_indices = np.random.randint(0, len(daily_returns), size=(num_simulations, forecast_days))
    sim_returns = daily_returns[random_indices]

    # Cumulative growth
    growth_factors = np.cumprod(1 + sim_returns, axis=1)
    sim_paths = initial_equity * np.column_stack([np.ones(num_simulations), growth_factors])

    # Percentiles along the forecast days
    days = list(range(forecast_days + 1))
    p5 = np.percentile(sim_paths, 5, axis=0)
    p25 = np.percentile(sim_paths, 25, axis=0)
    p50 = np.percentile(sim_paths, 50, axis=0)
    p75 = np.percentile(sim_paths, 75, axis=0)
    p95 = np.percentile(sim_paths, 95, axis=0)

    # Sample of individual representative paths (first 10)
    sample_paths = []
    for i in range(min(10, num_simulations)):
        sample_paths.append([float(round(v, 2)) for v in sim_paths[i]])

    terminal_values = sim_paths[:, -1]
    prob_profit = float(np.mean(terminal_values > initial_equity) * 100)
    median_terminal = float(np.median(terminal_values))
    var_95_terminal = float(np.percentile(terminal_values, 5))

    return {
        "num_simulations": num_simulations,
        "forecast_days": forecast_days,
        "initial_equity": float(round(initial_equity, 2)),
        "median_projected_equity": float(round(median_terminal, 2)),
        "prob_positive_return_pct": float(round(prob_profit, 2)),
        "projected_return_50p_pct": float(round(((median_terminal / initial_equity) - 1) * 100, 2)),
        "var_95_terminal_equity": float(round(var_95_terminal, 2)),
        "percentile_curves": {
            "days": days,
            "p5": [float(round(v, 2)) for v in p5],
            "p25": [float(round(v, 2)) for v in p25],
            "p50": [float(round(v, 2)) for v in p50],
            "p75": [float(round(v, 2)) for v in p75],
            "p95": [float(round(v, 2)) for v in p95]
        },
        "sample_paths": sample_paths
    }

def compute_var_cvar(
    returns: List[float],
    portfolio_value: float = 100000.0,
    confidence_levels: List[float] = [0.95, 0.99]
) -> Dict[str, Any]:
    """
    Calculates Parametric & Historical Value-at-Risk (VaR) and Conditional VaR (Expected Shortfall).
    """
    arr = np.array(returns)
    if len(arr) < 10:
        return {}

    mu = np.mean(arr)
    sigma = np.std(arr)

    results = {}

    for conf in confidence_levels:
        alpha = 1.0 - conf
        # 1. Parametric VaR (Normal)
        z_score = stats.norm.ppf(conf)
        param_var_pct = -(mu - z_score * sigma)
        param_var_usd = param_var_pct * portfolio_value

        # 2. Historical VaR
        hist_var_pct = -float(np.percentile(arr, alpha * 100))
        hist_var_usd = hist_var_pct * portfolio_value

        # 3. Conditional VaR (Expected Shortfall)
        tail_losses = arr[arr <= -hist_var_pct]
        cvar_pct = -float(np.mean(tail_losses)) if len(tail_losses) > 0 else hist_var_pct
        cvar_usd = cvar_pct * portfolio_value

        conf_key = f"{int(conf * 100)}%"
        results[conf_key] = {
            "confidence": conf_key,
            "parametric_var_pct": float(round(param_var_pct * 100, 2)),
            "parametric_var_usd": float(round(param_var_usd, 2)),
            "historical_var_pct": float(round(hist_var_pct * 100, 2)),
            "historical_var_usd": float(round(hist_var_usd, 2)),
            "cvar_expected_shortfall_pct": float(round(cvar_pct * 100, 2)),
            "cvar_expected_shortfall_usd": float(round(cvar_usd, 2))
        }

    return {
        "portfolio_value": portfolio_value,
        "daily_mean_return_pct": float(round(mu * 100, 3)),
        "daily_volatility_pct": float(round(sigma * 100, 3)),
        "annualized_volatility_pct": float(round(sigma * np.sqrt(252) * 100, 2)),
        "risk_levels": results
    }

def generate_quant_research_report(
    asset: str,
    strategy: str,
    metrics: Dict[str, Any],
    regime_metrics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generates an automated executive Quantitative Intelligence summary report
    evaluating performance, risk attribution, and strategic recommendations.
    """
    strat_ret = metrics.get("strategy_return_pct", 0.0)
    bench_ret = metrics.get("benchmark_return_pct", 0.0)
    sharpe = metrics.get("strategy_sharpe", 0.0)
    max_dd = abs(metrics.get("strategy_max_drawdown_pct", 0.0))
    win_rate = metrics.get("win_rate_pct", 0.0)
    alpha = metrics.get("alpha_pct", 0.0)
    profit_factor = metrics.get("profit_factor", 1.0)

    # Quality Grade Determination
    score = 0
    if strat_ret > bench_ret: score += 25
    if sharpe > 1.0: score += 25
    elif sharpe > 0.5: score += 15
    if max_dd < 20: score += 25
    elif max_dd < 35: score += 15
    if profit_factor > 1.5: score += 25
    elif profit_factor > 1.1: score += 15

    grade = "A (Institutional Grade)" if score >= 80 else ("B+ (Strong Quantitative Edge)" if score >= 60 else ("C (Moderate / Needs Hedging)" if score >= 40 else "D (High Risk / Sub-optimal)"))

    insights = []
    if strat_ret > bench_ret:
        insights.append(f"Strategy outperformed Buy-and-Hold benchmark by {round(strat_ret - bench_ret, 2)}% net of transaction costs.")
    else:
        insights.append(f"Strategy underperformed Buy-and-Hold benchmark by {round(bench_ret - strat_ret, 2)}%. Consider tighter stop-loss or momentum filters.")

    if sharpe > 1.0:
        insights.append(f"Annualized Sharpe ratio of {sharpe} demonstrates strong risk-adjusted returns exceeding risk-free hurdle rate.")
    else:
        insights.append(f"Sharpe ratio of {sharpe} suggests return per unit of volatility is modest.")

    if max_dd < 18:
        insights.append(f"Exceptional capital preservation: maximum peak-to-trough drawdown was constrained to {max_dd}%.")
    else:
        insights.append(f"Peak-to-trough drawdown reached {max_dd}%. Position sizing reduction or volatility targeting recommended.")

    recommendations = [
        "Incorporate Dynamic Volatility Targeting to scale exposure downward during high-volatility spikes.",
        "Implement Multi-Asset Portfolio Rebalancing to harvest cross-asset decorrelation benefits.",
        "Add trailing take-profit thresholds to lock in alpha during parabolic trend extensions."
    ]

    return {
        "report_title": f"Quantitative Strategy Audit: {strategy.upper()} on {asset}",
        "executive_grade": grade,
        "score": score,
        "key_findings": insights,
        "recommendations": recommendations,
        "institutional_summary": f"The quantitative analysis reveals an annualized Sharpe ratio of {sharpe} with a win rate of {win_rate}% across {metrics.get('total_trades', 0)} discrete simulated transactions."
    }
