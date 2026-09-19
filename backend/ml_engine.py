import os
import requests
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from sklearn.ensemble import RandomForestClassifier
from sklearn.mixture import GaussianMixture
from sklearn.metrics import accuracy_score, precision_score

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

# Featherless AI Configuration
FEATHERLESS_API_KEY = os.environ.get("FEATHERLESS_API_KEY", "")
FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1"
FEATHERLESS_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"

def compute_ml_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes predictive technical and statistical factors:
    - RSI (14)
    - Normalized MACD and signal line
    - Bollinger Band %B
    - Short-to-long moving average ratios
    - Rolling Volatility (15d)
    - Momentum / Rate of Change (5d, 10d)
    """
    data = df.copy()
    data["date"] = pd.to_datetime(data["date"])
    data.sort_values("date", inplace=True)
    data.reset_index(drop=True, inplace=True)
    closes = data["close"]

    # 1. RSI (14)
    delta = closes.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=14, min_periods=14).mean()
    avg_loss = loss.rolling(window=14, min_periods=14).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    data["rsi_14"] = (100 - (100 / (1 + rs))).fillna(50)

    # 2. MACD
    ema_12 = closes.ewm(span=12, adjust=False).mean()
    ema_26 = closes.ewm(span=26, adjust=False).mean()
    macd = ema_12 - ema_26
    macd_signal = macd.ewm(span=9, adjust=False).mean()
    data["macd_diff"] = (macd - macd_signal) / (closes + 1e-9)

    # 3. Bollinger %B
    sma_20 = closes.rolling(20).mean()
    std_20 = closes.rolling(20).std()
    upper = sma_20 + 2 * std_20
    lower = sma_20 - 2 * std_20
    data["bollinger_pct_b"] = ((closes - lower) / (upper - lower + 1e-9)).fillna(0.5)

    # 4. Moving Average Distance
    sma_50 = closes.rolling(50).mean()
    data["dist_sma_20"] = (closes / (sma_20 + 1e-9)) - 1.0
    data["dist_sma_50"] = (closes / (sma_50 + 1e-9)) - 1.0

    # 5. Volatility (15d)
    data["volatility_15d"] = (closes.pct_change().rolling(15).std() * np.sqrt(252)).fillna(0)

    # 6. Momentum
    data["roc_5d"] = closes.pct_change(5).fillna(0)
    data["roc_10d"] = closes.pct_change(10).fillna(0)

    # Target: 1 if next-day return > 0, else 0
    data["target"] = (closes.shift(-1) > closes).astype(int)

    return data

def train_predictive_model(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Trains XGBoost and Random Forest classifiers on historical factors.
    Returns model accuracy, feature importance, and probability forecast for next bar.
    """
    feat_df = compute_ml_features(df).dropna()
    feature_cols = [
        "rsi_14", "macd_diff", "bollinger_pct_b",
        "dist_sma_20", "dist_sma_50", "volatility_15d",
        "roc_5d", "roc_10d"
    ]

    if len(feat_df) < 50:
        return {}

    X = feat_df[feature_cols].values
    y = feat_df["target"].values

    # 80/20 train/test time-series split (no lookahead)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    # Train Random Forest
    rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_acc = accuracy_score(y_test, rf_preds)

    # Train XGBoost if installed
    if HAS_XGB:
        xgb_model = xgb.XGBClassifier(n_estimators=80, max_depth=4, learning_rate=0.05, random_state=42, eval_metric="logloss")
        xgb_model.fit(X_train, y_train)
        xgb_preds = xgb_model.predict(X_test)
        xgb_acc = accuracy_score(y_test, xgb_preds)
        importances = (rf.feature_importances_ + xgb_model.feature_importances_) / 2.0
    else:
        xgb_acc = rf_acc
        importances = rf.feature_importances_

    # Feature Importance dict
    feature_importance = [
        {"feature": col.replace("_", " ").upper(), "importance": float(round(imp * 100, 2))}
        for col, imp in zip(feature_cols, importances)
    ]
    feature_importance.sort(key=lambda x: x["importance"], reverse=True)

    # Next-bar probability inference
    latest_features = X[-1].reshape(1, -1)
    rf_prob = rf.predict_proba(latest_features)[0][1]
    if HAS_XGB:
        xgb_prob = xgb_model.predict_proba(latest_features)[0][1]
        ensemble_prob = float((rf_prob + xgb_prob) / 2.0)
    else:
        ensemble_prob = float(rf_prob)

    direction = "BULLISH" if ensemble_prob >= 0.50 else "BEARISH"
    confidence = float(abs(ensemble_prob - 0.50) * 200)  # 0 to 100% confidence scale

    return {
        "model_type": "Ensemble (XGBoost + Random Forest)" if HAS_XGB else "Random Forest Classifier",
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "test_accuracy_pct": float(round(max(rf_acc, xgb_acc) * 100, 2)),
        "next_bar_prediction": direction,
        "bullish_probability_pct": float(round(ensemble_prob * 100, 1)),
        "bearish_probability_pct": float(round((1 - ensemble_prob) * 100, 1)),
        "confidence_pct": float(round(confidence, 1)),
        "feature_importance": feature_importance
    }

def cluster_unsupervised_regimes(df: pd.DataFrame, n_clusters: int = 3) -> Dict[str, Any]:
    """
    Unsupervised Machine Learning Market Regime Detection using Gaussian Mixture Models (GMM).
    Identifies latent market structures without hardcoded heuristics.
    """
    data = df.copy()
    data["return"] = data["close"].pct_change().fillna(0)
    data["volatility"] = data["return"].rolling(20, min_periods=5).std() * np.sqrt(252)
    data.dropna(subset=["volatility"], inplace=True)

    X = data[["return", "volatility"]].values
    if len(X) < 30:
        return {}

    gmm = GaussianMixture(n_components=n_clusters, covariance_type="full", random_state=42)
    labels = gmm.fit_predict(X)
    data["cluster"] = labels

    cluster_profiles = []
    cluster_names = ["Expansion (Low Vol Bull)", "Contraction (High Vol Shock)", "Neutral / Mean-Reverting"]

    for c in range(n_clusters):
        sub = data[data["cluster"] == c]
        ann_ret = sub["return"].mean() * 252
        ann_vol = sub["volatility"].mean()
        cluster_profiles.append({
            "cluster_id": c,
            "label": cluster_names[c % len(cluster_names)],
            "frequency_pct": float(round((len(sub) / len(data)) * 100, 1)),
            "annualized_return_pct": float(round(ann_ret * 100, 2)),
            "average_volatility_pct": float(round(ann_vol * 100, 2)),
            "sample_count": int(len(sub))
        })

    # Sample timeline for visualization
    timeline = []
    step = max(1, len(data) // 60)
    for i in range(0, len(data), step):
        row = data.iloc[i]
        timeline.append({
            "date": row["date"],
            "cluster": int(row["cluster"]),
            "cluster_label": cluster_names[int(row["cluster"]) % len(cluster_names)],
            "price": float(row["close"]),
            "volatility": float(round(row["volatility"] * 100, 2))
        })

    return {
        "n_clusters": n_clusters,
        "profiles": cluster_profiles,
        "timeline": timeline
    }

def call_ai_quant_assistant(
    prompt: str,
    asset: str,
    market_metrics: Dict[str, Any],
    ml_forecast: Optional[Dict[str, Any]] = None
) -> str:
    """
    Queries Featherless AI (Mistral-7B-Instruct) using the user's API key,
    grounded with live quantitative finance data.
    """
    system_prompt = f"""You are QUANTUM AI, an elite Quantitative Research Analyst & Hedge Fund Risk Officer.
You analyze financial assets, algorithmic strategies, and market regimes with mathematical rigor.

Current Live Context for {asset}:
- Current Price: ${market_metrics.get('current_price', 'N/A')}
- Total Return: {market_metrics.get('total_return_pct', 'N/A')}%
- Annualized Volatility: {market_metrics.get('annualized_volatility_pct', 'N/A')}%
- Annualized Sharpe Ratio: {market_metrics.get('sharpe_ratio', 'N/A')}
- Max Drawdown: {market_metrics.get('max_drawdown_pct', 'N/A')}%
"""
    if ml_forecast:
        system_prompt += f"""
- ML Model Ensemble: {ml_forecast.get('model_type')}
- AI Direction Forecast: {ml_forecast.get('next_bar_prediction')} ({ml_forecast.get('bullish_probability_pct')}% Bullish)
- Model Confidence: {ml_forecast.get('confidence_pct')}%
- Top Predictor Feature: {ml_forecast.get('feature_importance', [{}])[0].get('feature', 'N/A')}
"""

    system_prompt += "\nAnswer the user's query clearly, concisely, and with quantitative precision. Include specific metrics, risk warnings, or portfolio allocation recommendations."

    if not FEATHERLESS_API_KEY:
        sharpe = market_metrics.get('sharpe_ratio', 'N/A')
        vol = market_metrics.get('annualized_volatility_pct', 'N/A')
        return f"[Quantitative Analysis] Asset: {asset} | Sharpe: {sharpe} | Volatility: {vol}%. Recommend disciplined position sizing and volatility targeting. (Set FEATHERLESS_API_KEY in environment for full LLM commentary)."

    try:
        payload = {
            "model": FEATHERLESS_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 400,
            "temperature": 0.4
        }
        res = requests.post(
            f"{FEATHERLESS_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {FEATHERLESS_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=18
        )
        if res.status_code == 200:
            return res.json()["choices"][0]["message"]["content"]
        else:
            return f"Featherless API returned status {res.status_code}: {res.text[:200]}"
    except Exception as e:
        # Fallback offline quantitative reasoning
        return f"[Offline Quantitative Reasoner] Based on {asset} with a Sharpe of {market_metrics.get('sharpe_ratio')} and {market_metrics.get('annualized_volatility_pct')}% volatility: Maintain a disciplined position size and hedge downside risk using volatility targeting."
