import os
import logging
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data_engine import (
    SUPPORTED_ASSETS,
    fetch_historical_data,
    get_multi_asset_dataframe
)
from quant_engine import (
    compute_technical_indicators,
    compute_summary_metrics,
    compute_cross_asset_correlation,
    compute_rolling_correlation
)
from backtest_engine import run_backtest
from regime_engine import classify_market_regimes, analyze_strategy_by_regime
from risk_engine import (
    compute_monte_carlo_simulation,
    compute_var_cvar,
    generate_quant_research_report
)
from ml_engine import (
    train_predictive_model,
    cluster_unsupervised_regimes,
    call_ai_quant_assistant
)

app = FastAPI(
    title="Quantitative Multi-Asset Financial Intelligence & Backtesting Platform",
    version="1.0.0",
    description="Full-stack quantitative research and algorithmic backtesting platform for Gold, Bitcoin, NVIDIA, and Multi-Asset Portfolios."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("API")

# Models
class BacktestRequest(BaseModel):
    symbol: str = "BTC-USD"
    period: str = "2y"
    strategy: str = "sma_crossover"
    params: Dict[str, Any] = Field(default_factory=lambda: {"fast_period": 20, "slow_period": 50})
    initial_capital: float = 100000.0
    position_size_pct: float = 1.0
    transaction_cost_pct: float = 0.001
    risk_free_rate: float = 0.04

class RobustnessRequest(BaseModel):
    symbol: str = "NVDA"
    period: str = "2y"
    strategy: str = "sma_crossover"
    fast_range: List[int] = Field(default_factory=lambda: [5, 10, 15, 20, 25])
    slow_range: List[int] = Field(default_factory=lambda: [30, 40, 50, 60, 80])
    initial_capital: float = 100000.0
    transaction_cost_pct: float = 0.001

class RegimeRequest(BaseModel):
    symbol: str = "GC=F"
    period: str = "2y"
    strategy: str = "sma_crossover"
    params: Dict[str, Any] = Field(default_factory=lambda: {"fast_period": 20, "slow_period": 50})

class MonteCarloRequest(BaseModel):
    symbol: str = "BTC-USD"
    period: str = "2y"
    strategy: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    num_simulations: int = 500
    forecast_days: int = 252

# Endpoints
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Quantitative FinTech Engine", "assets_count": len(SUPPORTED_ASSETS)}

@app.get("/api/assets")
def get_assets():
    """Returns list of supported multi-asset classes."""
    return [
        {"symbol": sym, **info}
        for sym, info in SUPPORTED_ASSETS.items()
    ]

@app.get("/api/market-data")
def get_market_data(
    symbol: str = Query("BTC-USD", description="Asset symbol (GC=F, BTC-USD, NVDA, etc.)"),
    period: str = Query("2y", description="Time period: 6mo, 1y, 2y, 5y, max"),
    sma_periods: str = Query("20,50,200", description="Comma-separated SMA periods"),
    ema_periods: str = Query("12,26,50", description="Comma-separated EMA periods"),
    rolling_window: int = Query(30, description="Window for rolling returns & volatility"),
    force_refresh: bool = Query(False, description="Force refetch from live provider")
):
    """
    Returns normalized OHLCV data enriched with quantitative indicators:
    SMA, EMA, daily/cumulative returns, rolling volatility, rolling Sharpe, and drawdowns.
    """
    df = fetch_historical_data(symbol, period=period, force_refresh=force_refresh)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data available for symbol {symbol}")

    try:
        smas = [int(x.strip()) for x in sma_periods.split(",") if x.strip().isdigit()]
    except Exception:
        smas = [20, 50, 200]

    try:
        emas = [int(x.strip()) for x in ema_periods.split(",") if x.strip().isdigit()]
    except Exception:
        emas = [12, 26, 50]

    enriched = compute_technical_indicators(
        df,
        sma_periods=smas,
        ema_periods=emas,
        rolling_window=rolling_window
    )
    summary = compute_summary_metrics(enriched)

    return {
        "symbol": symbol,
        "period": period,
        "summary": summary,
        "data": enriched.to_dict(orient="records")
    }

@app.get("/api/correlation")
def get_correlation_matrix(
    symbols: str = Query("GC=F,BTC-USD,NVDA,SPY", description="Comma-separated symbols"),
    period: str = Query("2y", description="Time period"),
    method: str = Query("pearson", description="pearson or spearman")
):
    """Computes cross-asset correlation matrix."""
    sym_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not sym_list:
        sym_list = ["GC=F", "BTC-USD", "NVDA", "SPY"]

    datasets = get_multi_asset_dataframe(sym_list, period=period)
    corr_data = compute_cross_asset_correlation(datasets, method=method)
    return corr_data

@app.get("/api/rolling-correlation")
def get_rolling_correlation(
    sym1: str = Query("GC=F", description="First asset symbol"),
    sym2: str = Query("BTC-USD", description="Second asset symbol"),
    period: str = Query("2y", description="Time period"),
    window: int = Query(30, description="Rolling window size in trading days")
):
    """Computes rolling correlation time series between two assets."""
    df1 = fetch_historical_data(sym1, period=period)
    df2 = fetch_historical_data(sym2, period=period)

    series = compute_rolling_correlation(df1, df2, sym1, sym2, window=window)
    return {
        "sym1": sym1,
        "sym2": sym2,
        "window": window,
        "series": series
    }

@app.post("/api/backtest")
def execute_backtest(req: BacktestRequest):
    """
    Runs discrete strategy backtest with initial capital, position sizing,
    slippage & transaction costs, and benchmark comparison.
    """
    df = fetch_historical_data(req.symbol, period=req.period)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for symbol {req.symbol}")

    res = run_backtest(
        df=df,
        strategy=req.strategy,
        params=req.params,
        initial_capital=req.initial_capital,
        position_size_pct=req.position_size_pct,
        transaction_cost_pct=req.transaction_cost_pct,
        risk_free_rate=req.risk_free_rate
    )
    res["symbol"] = req.symbol
    res["period"] = req.period
    return res

@app.post("/api/robustness")
def evaluate_robustness(req: RobustnessRequest):
    """
    Evaluates strategy robustness over a 2D parameter sensitivity grid (e.g. Fast MA vs Slow MA).
    Returns Sharpe ratio and Return heatmaps.
    """
    df = fetch_historical_data(req.symbol, period=req.period)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for symbol {req.symbol}")

    matrix_sharpe = []
    matrix_return = []

    for fast in req.fast_range:
        row_sharpe = []
        row_return = []
        for slow in req.slow_range:
            if fast >= slow:
                row_sharpe.append(0.0)
                row_return.append(0.0)
                continue
            
            p = {"fast_period": fast, "slow_period": slow}
            bt = run_backtest(
                df=df,
                strategy=req.strategy,
                params=p,
                initial_capital=req.initial_capital,
                transaction_cost_pct=req.transaction_cost_pct
            )
            row_sharpe.append(bt["metrics"]["strategy_sharpe"])
            row_return.append(bt["metrics"]["strategy_return_pct"])
        matrix_sharpe.append(row_sharpe)
        matrix_return.append(row_return)

    # Fee stress test (0 bps, 5 bps, 10 bps, 25 bps, 50 bps)
    fee_levels = [0.0, 0.0005, 0.001, 0.0025, 0.005]
    fee_results = []
    base_params = {"fast_period": 20, "slow_period": 50}
    for fee in fee_levels:
        bt = run_backtest(
            df=df,
            strategy=req.strategy,
            params=base_params,
            initial_capital=req.initial_capital,
            transaction_cost_pct=fee
        )
        fee_results.append({
            "fee_bps": int(fee * 10000),
            "fee_pct": float(round(fee * 100, 3)),
            "strategy_return_pct": bt["metrics"]["strategy_return_pct"],
            "strategy_sharpe": bt["metrics"]["strategy_sharpe"],
            "net_profit": bt["net_profit"]
        })

    return {
        "symbol": req.symbol,
        "strategy": req.strategy,
        "fast_range": req.fast_range,
        "slow_range": req.slow_range,
        "sharpe_matrix": matrix_sharpe,
        "return_matrix": matrix_return,
        "fee_stress_test": fee_results
    }

@app.post("/api/regimes")
def analyze_regimes(req: RegimeRequest):
    """
    Classifies historical data into Bull/Bear and High/Low Vol regimes,
    and attributes strategy performance across each market environment.
    """
    df = fetch_historical_data(req.symbol, period=req.period)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for symbol {req.symbol}")

    regime_df = classify_market_regimes(df)
    
    # Run backtest to get equity curve
    bt = run_backtest(df=df, strategy=req.strategy, params=req.params)
    regime_analysis = analyze_strategy_by_regime(bt["equity_curve"], regime_df)

    return {
        "symbol": req.symbol,
        "strategy": req.strategy,
        "regime_analysis": regime_analysis
    }

@app.post("/api/monte-carlo")
def run_monte_carlo(req: MonteCarloRequest):
    """
    Executes Monte Carlo simulation (500 bootstrap paths) on strategy equity curve
    or asset returns, producing percentile projections.
    """
    df = fetch_historical_data(req.symbol, period=req.period)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for symbol {req.symbol}")

    if req.strategy:
        bt = run_backtest(df=df, strategy=req.strategy, params=req.params or {})
        equity_series = [p["strategy_equity"] for p in bt["equity_curve"]]
    else:
        equity_series = df["close"].tolist()

    mc = compute_monte_carlo_simulation(
        equity_series=equity_series,
        num_simulations=req.num_simulations,
        forecast_days=req.forecast_days
    )
    return mc

@app.post("/api/risk-analytics")
def get_risk_analytics(
    symbol: str = Query("BTC-USD"),
    period: str = Query("2y"),
    portfolio_value: float = Query(100000.0)
):
    """Returns Parametric & Historical VaR and Expected Shortfall (CVaR)."""
    df = fetch_historical_data(symbol, period=period)
    returns = df["close"].pct_change().dropna().tolist()
    var_res = compute_var_cvar(returns, portfolio_value=portfolio_value)
    return var_res

@app.post("/api/research-report")
def get_research_report(req: BacktestRequest):
    """Generates an executive-level Quantitative Intelligence audit report."""
    df = fetch_historical_data(req.symbol, period=req.period)
    bt = run_backtest(
        df=df,
        strategy=req.strategy,
        params=req.params,
        initial_capital=req.initial_capital,
        position_size_pct=req.position_size_pct,
        transaction_cost_pct=req.transaction_cost_pct,
        risk_free_rate=req.risk_free_rate
    )
    report = generate_quant_research_report(
        asset=req.symbol,
        strategy=req.strategy,
        metrics=bt["metrics"]
    )
    return {
        "report": report,
        "metrics": bt["metrics"]
    }

class AIChatRequest(BaseModel):
    prompt: str
    symbol: str = "BTC-USD"
    period: str = "2y"

@app.post("/api/ml/train-predict")
def get_ml_prediction(
    symbol: str = Query("BTC-USD"),
    period: str = Query("2y")
):
    """
    Trains XGBoost and Random Forest classifiers on technical factors,
    returning walk-forward test accuracy, feature importance, and probability forecast.
    """
    df = fetch_historical_data(symbol, period=period)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    res = train_predictive_model(df)
    res["symbol"] = symbol
    return res

@app.post("/api/ml/gmm-regimes")
def get_gmm_regimes(
    symbol: str = Query("BTC-USD"),
    period: str = Query("2y"),
    n_clusters: int = Query(3)
):
    """
    Performs Unsupervised Machine Learning Regime Clustering using Gaussian Mixture Models (GMM).
    """
    df = fetch_historical_data(symbol, period=period)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    res = cluster_unsupervised_regimes(df, n_clusters=n_clusters)
    res["symbol"] = symbol
    return res

@app.post("/api/ai/chat")
def chat_ai_assistant(req: AIChatRequest):
    """
    Queries the AI Quant Copilot (powered by Featherless AI with user's key),
    grounded with real-time market data, indicators, and ML forecasts.
    """
    df = fetch_historical_data(req.symbol, period=req.period)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {req.symbol}")
    
    enriched = compute_technical_indicators(df)
    metrics = compute_summary_metrics(enriched)
    ml_forecast = train_predictive_model(df)

    response_text = call_ai_quant_assistant(
        prompt=req.prompt,
        asset=req.symbol,
        market_metrics=metrics,
        ml_forecast=ml_forecast
    )
    return {
        "response": response_text,
        "symbol": req.symbol,
        "metrics": metrics,
        "forecast": ml_forecast
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
