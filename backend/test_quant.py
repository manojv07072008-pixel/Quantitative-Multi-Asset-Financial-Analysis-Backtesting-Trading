import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from data_engine import fetch_historical_data, SUPPORTED_ASSETS, get_multi_asset_dataframe
from quant_engine import compute_technical_indicators, compute_summary_metrics, compute_cross_asset_correlation
from backtest_engine import run_backtest
from regime_engine import classify_market_regimes, analyze_strategy_by_regime
from risk_engine import compute_monte_carlo_simulation, compute_var_cvar, generate_quant_research_report

def test_all():
    print("Testing Supported Assets...")
    print(f"Supported assets: {list(SUPPORTED_ASSETS.keys())}")

    print("\nTesting Data Engine on BTC-USD...")
    btc_df = fetch_historical_data("BTC-USD", period="1y")
    assert not btc_df.empty, "BTC data should not be empty"
    print(f"Fetched {len(btc_df)} rows for BTC-USD. First close: {btc_df['close'].iloc[0]}, Last close: {btc_df['close'].iloc[-1]}")

    print("\nTesting Technical Indicators...")
    enriched = compute_technical_indicators(btc_df)
    assert "sma_20" in enriched.columns
    assert "daily_return" in enriched.columns
    assert "rolling_volatility_30d" in enriched.columns
    metrics = compute_summary_metrics(enriched)
    print(f"Summary Metrics: Return={metrics['total_return_pct']}%, Sharpe={metrics['sharpe_ratio']}, MaxDD={metrics['max_drawdown_pct']}%")

    print("\nTesting Cross-Asset Correlation...")
    datasets = get_multi_asset_dataframe(["GC=F", "BTC-USD", "NVDA", "SPY"], period="1y")
    corr = compute_cross_asset_correlation(datasets)
    print(f"Correlation Matrix computed for: {corr['symbols']}")
    print(f"Matrix: {corr['matrix']}")

    print("\nTesting Backtest Engine (SMA Crossover)...")
    bt = run_backtest(btc_df, strategy="sma_crossover", params={"fast_period": 15, "slow_period": 40})
    m = bt["metrics"]
    print(f"Backtest result: Strat Return={m['strategy_return_pct']}%, Bench Return={m['benchmark_return_pct']}%, Total Trades={m['total_trades']}, Win Rate={m['win_rate_pct']}%")

    print("\nTesting Market Regime Analysis...")
    reg_df = classify_market_regimes(btc_df)
    reg_analysis = analyze_strategy_by_regime(bt["equity_curve"], reg_df)
    print("Regimes breakdown keys:", list(reg_analysis["regime_metrics"].keys()))

    print("\nTesting Monte Carlo Simulation...")
    equity_series = [p["strategy_equity"] for p in bt["equity_curve"]]
    mc = compute_monte_carlo_simulation(equity_series, num_simulations=100, forecast_days=120)
    print(f"Monte Carlo projected median return: {mc['projected_return_50p_pct']}% with prob profit {mc['prob_positive_return_pct']}%")

    print("\nTesting VaR & CVaR...")
    returns = btc_df["close"].pct_change().dropna().tolist()
    var_res = compute_var_cvar(returns)
    print("VaR 95%:", var_res["risk_levels"]["95%"])

    print("\nTesting Research Report...")
    report = generate_quant_research_report("BTC-USD", "sma_crossover", m)
    print("Report Grade:", report["executive_grade"])
    print("All backend components verified successfully!")

if __name__ == "__main__":
    test_all()
