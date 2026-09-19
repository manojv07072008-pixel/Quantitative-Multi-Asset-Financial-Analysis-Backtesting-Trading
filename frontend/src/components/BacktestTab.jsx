import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, TrendingUp, DollarSign, Percent, ShieldAlert, Award, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { runBacktest } from '../services/api';

export default function BacktestTab({ assetSymbol, selectedPeriod }) {
  // Config state
  const [strategy, setStrategy] = useState('sma_crossover');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [positionSizePct, setPositionSizePct] = useState(1.0);
  const [transactionCostBps, setTransactionCostBps] = useState(10); // 10 bps = 0.1%

  // Strategy Params
  const [fastPeriod, setFastPeriod] = useState(20);
  const [slowPeriod, setSlowPeriod] = useState(50);
  const [trendPeriod, setTrendPeriod] = useState(100);
  const [momentumLookback, setMomentumLookback] = useState(14);
  const [momentumThreshold, setMomentumThreshold] = useState(1.0);
  const [bollingerWindow, setBollingerWindow] = useState(20);
  const [bollingerStd, setBollingerStd] = useState(2.0);

  // Result state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tradeFilter, setTradeFilter] = useState('all'); // 'all' | 'win' | 'loss'
  const [chartView, setChartView] = useState('equity'); // 'equity' | 'drawdown'

  const executeBacktestRun = async () => {
    setLoading(true);
    try {
      let params = {};
      if (strategy === 'sma_crossover') {
        params = { fast_period: fastPeriod, slow_period: slowPeriod };
      } else if (strategy === 'ema_trend') {
        params = { fast_period: fastPeriod, slow_period: slowPeriod, trend_period: trendPeriod };
      } else if (strategy === 'momentum') {
        params = { lookback_period: momentumLookback, threshold_pct: momentumThreshold };
      } else if (strategy === 'mean_reversion') {
        params = { window: bollingerWindow, num_std: bollingerStd };
      } else if (strategy === 'ml_ensemble') {
        params = { confidence_threshold: 0.51, rsi_window: 14 };
      }

      const payload = {
        symbol: assetSymbol,
        period: selectedPeriod,
        strategy,
        params,
        initial_capital: Number(initialCapital),
        position_size_pct: Number(positionSizePct),
        transaction_cost_pct: transactionCostBps / 10000.0,
        risk_free_rate: 0.04
      };

      const res = await runBacktest(payload);
      setResult(res);
    } catch (err) {
      console.error('Backtest failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeBacktestRun();
  }, [assetSymbol, selectedPeriod, strategy]);

  const m = result?.metrics;
  const equityCurve = result?.equity_curve || [];
  const trades = result?.trades || [];

  // Filtered trades
  const filteredTrades = trades.filter(t => {
    if (tradeFilter === 'win') return t.pnl > 0;
    if (tradeFilter === 'loss') return t.pnl <= 0;
    return true;
  });

  // Chart datasets
  const labels = equityCurve.map(e => e.date);

  const equityChartData = {
    labels,
    datasets: [
      {
        label: `${strategy.toUpperCase().replace('_', ' ')} Strategy`,
        data: equityCurve.map(e => e.strategy_equity),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.06)',
        fill: true,
        borderWidth: 2.2,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: `Buy & Hold Benchmark (${assetSymbol})`,
        data: equityCurve.map(e => e.benchmark_equity),
        borderColor: '#94a3b8',
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.1
      }
    ]
  };

  const drawdownChartData = {
    labels,
    datasets: [
      {
        label: 'Strategy Drawdown (%)',
        data: equityCurve.map(e => e.strategy_drawdown_pct),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        fill: true,
        borderWidth: 1.5,
        pointRadius: 0
      },
      {
        label: 'Benchmark Drawdown (%)',
        data: equityCurve.map(e => e.benchmark_drawdown_pct),
        borderColor: '#64748b',
        borderWidth: 1.2,
        borderDash: [3, 3],
        pointRadius: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#cbd5e1', font: { family: 'Inter', size: 11, weight: 600 } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#0f172a',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            if (chartView === 'equity') {
              return `${ctx.dataset.label}: $${Number(ctx.parsed.y).toLocaleString()}`;
            }
            return `${ctx.dataset.label}: ${ctx.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 10, font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: {
        position: 'right',
        ticks: {
          color: '#64748b',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (val) => (chartView === 'equity' ? `$${Number(val).toLocaleString()}` : `${val}%`)
        },
        grid: { color: 'rgba(255,255,255,0.04)' }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Simulation Configuration Control Bar */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Play size={18} color="#06b6d4" />
              Quantitative Strategy Configuration & Simulation
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Simulates realistic portfolio execution including fees, slippage, and position sizing without look-ahead bias.
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={executeBacktestRun}
            disabled={loading}
          >
            <Play size={14} />
            {loading ? 'Simulating...' : 'Execute Backtest'}
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          
          {/* Strategy Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              STRATEGY LOGIC
            </label>
            <select
              className="fin-select"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              <option value="sma_crossover">SMA Crossover</option>
              <option value="ema_trend">EMA Trend Following</option>
              <option value="momentum">Momentum Breakout (ROC)</option>
              <option value="mean_reversion">Mean Reversion (Bollinger)</option>
              <option value="ml_ensemble">🤖 AI / ML Predictive Alpha (XGBoost & RF)</option>
            </select>
          </div>

          {strategy === 'ml_ensemble' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cyan-primary)', marginBottom: '0.35rem' }}>
                AI MODEL ARCHITECTURE
              </label>
              <div className="badge-accent font-mono" style={{ padding: '0.5rem', textAlign: 'center', display: 'block' }}>
                XGBoost + Random Forest Ensemble
              </div>
            </div>
          )}

          {/* Strategy Specific Dynamic Params */}
          {(strategy === 'sma_crossover' || strategy === 'ema_trend') && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  FAST PERIOD ({fastPeriod}D)
                </label>
                <input
                  type="number"
                  className="fin-input"
                  min={2}
                  max={100}
                  value={fastPeriod}
                  onChange={(e) => setFastPeriod(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  SLOW PERIOD ({slowPeriod}D)
                </label>
                <input
                  type="number"
                  className="fin-input"
                  min={5}
                  max={300}
                  value={slowPeriod}
                  onChange={(e) => setSlowPeriod(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {strategy === 'momentum' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  LOOKBACK ({momentumLookback}D)
                </label>
                <input
                  type="number"
                  className="fin-input"
                  min={3}
                  max={60}
                  value={momentumLookback}
                  onChange={(e) => setMomentumLookback(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  THRESHOLD ({momentumThreshold}%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="fin-input"
                  value={momentumThreshold}
                  onChange={(e) => setMomentumThreshold(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {strategy === 'mean_reversion' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  WINDOW ({bollingerWindow}D)
                </label>
                <input
                  type="number"
                  className="fin-input"
                  min={5}
                  max={100}
                  value={bollingerWindow}
                  onChange={(e) => setBollingerWindow(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  DEV MULTIPLIER (±{bollingerStd}σ)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="fin-input"
                  value={bollingerStd}
                  onChange={(e) => setBollingerStd(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {/* Initial Capital */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              INITIAL CAPITAL ($)
            </label>
            <select
              className="fin-select"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
            >
              <option value={10000}>$10,000</option>
              <option value={50000}>$50,000</option>
              <option value={100000}>$100,000</option>
              <option value={250000}>$250,000</option>
              <option value={1000000}>$1,000,000</option>
            </select>
          </div>

          {/* Transaction Costs Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                FEE & SLIPPAGE
              </label>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--cyan-primary)' }}>
                {transactionCostBps} bps ({(transactionCostBps / 100).toFixed(2)}%)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={transactionCostBps}
              onChange={(e) => setTransactionCostBps(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cyan-primary)', cursor: 'pointer' }}
            />
          </div>

        </div>
      </div>

      {/* Strategy vs Benchmark Scorecard */}
      {m && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          
          {/* Net Return */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STRATEGY RETURN</div>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: m.strategy_return_pct >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
              {m.strategy_return_pct >= 0 ? `+${m.strategy_return_pct}%` : `${m.strategy_return_pct}%`}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Bench: {m.benchmark_return_pct >= 0 ? `+${m.benchmark_return_pct}%` : `${m.benchmark_return_pct}%`}
            </div>
          </div>

          {/* Net Capital Ending */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PORTFOLIO VALUE</div>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
              ${result.ending_capital?.toLocaleString()}
            </div>
            <div className="font-mono" style={{ fontSize: '0.7rem', color: result.net_profit >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)', marginTop: '0.2rem' }}>
              PnL: ${result.net_profit?.toLocaleString()}
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SHARPE RATIO</div>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: m.strategy_sharpe >= 1.0 ? 'var(--cyan-primary)' : '#fff' }}>
              {m.strategy_sharpe}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Benchmark Sharpe: {m.benchmark_sharpe}
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MAX DRAWDOWN</div>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--rose-loss)' }}>
              {m.strategy_max_drawdown_pct}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Benchmark DD: {m.benchmark_max_drawdown_pct}%
            </div>
          </div>

          {/* Win Rate & Profit Factor */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WIN RATE / PROFIT FACTOR</div>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--emerald-profit)' }}>
              {m.win_rate_pct}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Profit Factor: {m.profit_factor} ({m.total_trades} trades)
            </div>
          </div>

          {/* Alpha & Beta */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ALPHA & BETA</div>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: m.alpha_pct >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
              α {m.alpha_pct}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Market Beta: β {m.beta}
            </div>
          </div>

        </div>
      )}

      {/* Equity Curve & Underwater Chart Panel */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#06b6d4" />
              {chartView === 'equity' ? 'Portfolio Equity Curve vs Benchmark' : 'Underwater Drawdown Comparison'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {chartView === 'equity' 
                ? 'Discrete simulation of portfolio equity starting at $' + initialCapital?.toLocaleString() + ' with transaction fees deducted.'
                : 'Comparative peak-to-trough decline over time.'
              }
            </p>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setChartView('equity')}
              className={chartView === 'equity' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            >
              Equity Curve ($)
            </button>
            <button
              onClick={() => setChartView('drawdown')}
              className={chartView === 'drawdown' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            >
              Drawdown (%)
            </button>
          </div>
        </div>

        <div style={{ height: '360px', width: '100%' }}>
          {loading ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Simulating discrete trade executions...
            </div>
          ) : (
            <Line
              data={chartView === 'equity' ? equityChartData : drawdownChartData}
              options={chartOptions}
            />
          )}
        </div>
      </div>

      {/* Detailed Trade Execution Ledger */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#6366f1" />
              Simulated Trade Ledger ({trades.length} Executions)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Detailed chronological log of all completed long transactions and fees incurred.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setTradeFilter('all')}
              className={tradeFilter === 'all' ? 'badge-accent' : 'badge-neutral'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              All ({trades.length})
            </button>
            <button
              onClick={() => setTradeFilter('win')}
              className={tradeFilter === 'win' ? 'badge-profit' : 'badge-neutral'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              Winners ({trades.filter(t => t.pnl > 0).length})
            </button>
            <button
              onClick={() => setTradeFilter('loss')}
              className={tradeFilter === 'loss' ? 'badge-loss' : 'badge-neutral'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              Losers ({trades.filter(t => t.pnl <= 0).length})
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          <table className="fin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Entry Date</th>
                <th>Entry Price</th>
                <th>Exit Date</th>
                <th>Exit Price</th>
                <th>Net PnL ($)</th>
                <th>Return (%)</th>
                <th>Fees Paid</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No trades match filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => (
                  <tr key={t.trade_id}>
                    <td>{t.trade_id}</td>
                    <td>
                      <span className={t.type.includes('OPEN') ? 'badge-neutral' : 'badge-accent'} style={{ fontSize: '0.68rem' }}>
                        {t.type}
                      </span>
                    </td>
                    <td>{t.entry_date}</td>
                    <td>${t.entry_price?.toLocaleString()}</td>
                    <td>{t.exit_date}</td>
                    <td>${t.exit_price?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: t.pnl >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
                      {t.pnl >= 0 ? `+$${t.pnl.toLocaleString()}` : `-$${Math.abs(t.pnl).toLocaleString()}`}
                    </td>
                    <td>
                      <span className={t.return_pct >= 0 ? 'badge-profit' : 'badge-loss'}>
                        {t.return_pct >= 0 ? `+${t.return_pct}%` : `${t.return_pct}%`}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-faint)' }}>${t.fees}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
