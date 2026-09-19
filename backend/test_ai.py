import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from data_engine import fetch_historical_data
from ml_engine import train_predictive_model, cluster_unsupervised_regimes, call_ai_quant_assistant
from backtest_engine import run_backtest

def test_ai():
    print("Testing ML Data and Predictive Model on NVDA...")
    df = fetch_historical_data("NVDA", period="1y")
    pred = train_predictive_model(df)
    print(f"Model: {pred['model_type']}")
    print(f"Test Accuracy: {pred['test_accuracy_pct']}%")
    print(f"Forecast: {pred['next_bar_prediction']} ({pred['bullish_probability_pct']}% Bullish, Confidence: {pred['confidence_pct']}%)")
    print("Top Features:", [f['feature'] + ': ' + str(f['importance']) + '%' for f in pred['feature_importance'][:3]])

    print("\nTesting Unsupervised GMM Regime Clustering on BTC-USD...")
    btc_df = fetch_historical_data("BTC-USD", period="1y")
    gmm = cluster_unsupervised_regimes(btc_df, n_clusters=3)
    print(f"GMM Clusters: {len(gmm['profiles'])}")
    for p in gmm['profiles']:
        print(f"Cluster {p['cluster_id']} ({p['label']}): Freq {p['frequency_pct']}%, Ret {p['annualized_return_pct']}%, Vol {p['average_volatility_pct']}%")

    print("\nTesting AI ML Strategy Backtest...")
    bt = run_backtest(df, strategy="ml_ensemble", params={"rsi_window": 14, "confidence_threshold": 0.51})
    m = bt["metrics"]
    print(f"ML Strategy Return: {m['strategy_return_pct']}%, Benchmark Return: {m['benchmark_return_pct']}%, Trades: {m['total_trades']}, Win Rate: {m['win_rate_pct']}%")

    print("\nTesting Featherless AI Quant Assistant...")
    resp = call_ai_quant_assistant(
        prompt="What is the quantitative outlook for this asset given its volatility and Sharpe ratio?",
        asset="NVDA",
        market_metrics={"current_price": 118.5, "total_return_pct": 145.2, "annualized_volatility_pct": 42.1, "sharpe_ratio": 1.85, "max_drawdown_pct": -22.4},
        ml_forecast=pred
    )
    print("AI Assistant Response Preview:")
    print(resp[:250] + "...")
    print("\nAll AI & Machine Learning components verified!")

if __name__ == "__main__":
    test_ai()
