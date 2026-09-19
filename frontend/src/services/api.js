const API_BASE_URL = 'http://localhost:8000/api';

export async function fetchAssets() {
  const res = await fetch(`${API_BASE_URL}/assets`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function fetchMarketData(symbol = 'BTC-USD', period = '2y', smaPeriods = '20,50,200', emaPeriods = '12,26,50', rollingWindow = 30) {
  const params = new URLSearchParams({
    symbol,
    period,
    sma_periods: smaPeriods,
    ema_periods: emaPeriods,
    rolling_window: rollingWindow.toString(),
  });
  const res = await fetch(`${API_BASE_URL}/market-data?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch market data for ${symbol}`);
  return res.json();
}

export async function fetchCorrelation(symbols = 'GC=F,BTC-USD,NVDA,SPY', period = '2y', method = 'pearson') {
  const params = new URLSearchParams({ symbols, period, method });
  const res = await fetch(`${API_BASE_URL}/correlation?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch correlation matrix');
  return res.json();
}

export async function fetchRollingCorrelation(sym1 = 'GC=F', sym2 = 'BTC-USD', period = '2y', window = 30) {
  const params = new URLSearchParams({ sym1, sym2, period, window: window.toString() });
  const res = await fetch(`${API_BASE_URL}/rolling-correlation?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch rolling correlation');
  return res.json();
}

export async function runBacktest(payload) {
  const res = await fetch(`${API_BASE_URL}/backtest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to run backtest');
  return res.json();
}

export async function evaluateRobustness(payload) {
  const res = await fetch(`${API_BASE_URL}/robustness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to run robustness evaluation');
  return res.json();
}

export async function analyzeRegimes(payload) {
  const res = await fetch(`${API_BASE_URL}/regimes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to analyze market regimes');
  return res.json();
}

export async function runMonteCarlo(payload) {
  const res = await fetch(`${API_BASE_URL}/monte-carlo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to run Monte Carlo simulation');
  return res.json();
}

export async function fetchRiskAnalytics(symbol = 'BTC-USD', period = '2y', portfolioValue = 100000) {
  const params = new URLSearchParams({
    symbol,
    period,
    portfolio_value: portfolioValue.toString()
  });
  const res = await fetch(`${API_BASE_URL}/risk-analytics?${params.toString()}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to fetch risk analytics');
  return res.json();
}

export async function fetchResearchReport(payload) {
  const res = await fetch(`${API_BASE_URL}/research-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate research report');
  return res.json();
}

export async function fetchMLPrediction(symbol = 'BTC-USD', period = '2y') {
  const params = new URLSearchParams({ symbol, period });
  const res = await fetch(`${API_BASE_URL}/ml/train-predict?${params.toString()}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to fetch ML prediction');
  return res.json();
}

export async function fetchGMMRegimes(symbol = 'BTC-USD', period = '2y', nClusters = 3) {
  const params = new URLSearchParams({ symbol, period, n_clusters: nClusters.toString() });
  const res = await fetch(`${API_BASE_URL}/ml/gmm-regimes?${params.toString()}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to fetch GMM regimes');
  return res.json();
}

export async function sendAIChat(prompt, symbol = 'BTC-USD', period = '2y') {
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, symbol, period })
  });
  if (!res.ok) throw new Error('Failed to get AI assistant response');
  return res.json();
}
