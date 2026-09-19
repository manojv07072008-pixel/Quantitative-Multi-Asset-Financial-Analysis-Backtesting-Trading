import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, DollarSign, Layers, ArrowUpRight, BarChart2, CheckCircle2 } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { fetchMarketData } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function OverviewTab({ assets = [], selectedPeriod, onSelectAsset }) {
  const [multiData, setMultiData] = useState({});
  const [loading, setLoading] = useState(true);

  const focusSymbols = ['GC=F', 'BTC-USD', 'NVDA', 'SPY'];

  useEffect(() => {
    async function loadAllAssets() {
      setLoading(true);
      try {
        const results = {};
        for (const sym of focusSymbols) {
          try {
            const res = await fetchMarketData(sym, selectedPeriod);
            results[sym] = res;
          } catch (err) {
            console.error(`Failed to fetch ${sym}`, err);
          }
        }
        setMultiData(results);
      } finally {
        setLoading(false);
      }
    }
    loadAllAssets();
  }, [selectedPeriod]);

  // Build Normalized Growth Chart (Base = 100)
  const chartLabels = multiData['BTC-USD']?.data?.map(d => d.date) || [];
  
  const colors = {
    'GC=F': { border: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', name: 'Gold' },
    'BTC-USD': { border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', name: 'Bitcoin' },
    'NVDA': { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', name: 'NVIDIA' },
    'SPY': { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', name: 'S&P 500' }
  };

  const datasets = Object.keys(multiData).map(sym => {
    const raw = multiData[sym]?.data || [];
    if (raw.length === 0) return null;
    const basePrice = raw[0].close;
    const normalized = raw.map(d => (d.close / basePrice) * 100);
    return {
      label: colors[sym]?.name || sym,
      data: normalized,
      borderColor: colors[sym]?.border || '#fff',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.15
    };
  }).filter(Boolean);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { family: 'Inter', size: 12, weight: 600 } }
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
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} (Base 100)`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 10, font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: {
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Asset KPI Scorecard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {focusSymbols.map(sym => {
          const item = multiData[sym];
          const summary = item?.summary;
          const conf = colors[sym];
          return (
            <div
              key={sym}
              className="glass-card glass-card-interactive"
              onClick={() => onSelectAsset(sym)}
              style={{ padding: '1.25rem', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: conf?.border || '#06b6d4' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{conf?.name}</h3>
                  <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sym}</span>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  onClick={(e) => { e.stopPropagation(); onSelectAsset(sym); }}
                >
                  Analyze <ArrowUpRight size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                  {summary ? `$${summary.current_price?.toLocaleString()}` : '—'}
                </span>
                {summary && (
                  <span className={summary.total_return_pct >= 0 ? 'badge-profit' : 'badge-loss'}>
                    {summary.total_return_pct >= 0 ? `+${summary.total_return_pct}%` : `${summary.total_return_pct}%`}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>SHARPE RATIO</div>
                  <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: summary?.sharpe_ratio >= 1.0 ? 'var(--cyan-primary)' : '#fff' }}>
                    {summary?.sharpe_ratio ?? '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>MAX DRAWDOWN</div>
                  <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rose-loss)' }}>
                    {summary?.max_drawdown_pct ? `${summary.max_drawdown_pct}%` : '—'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparative Normalized Chart */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#06b6d4" />
              Multi-Asset Normalized Performance (Indexed to 100)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Head-to-head trajectory comparison across Gold (Commodities), Bitcoin (Crypto), NVIDIA (Tech Equity), and S&P 500 Benchmark.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge-neutral font-mono">TIMEFRAME: {selectedPeriod.toUpperCase()}</span>
          </div>
        </div>

        <div style={{ height: '360px', width: '100%' }}>
          {loading ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Calculating quantitative multi-asset metrics...
            </div>
          ) : (
            <Line data={{ labels: chartLabels, datasets }} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Quantitative Matrix Table */}
      <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} color="#6366f1" />
            Cross-Asset Quantitative Scorecard
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Empirical statistical metrics computed across annual returns, volatility, risk-adjusted returns, and tail drawdown.
          </p>
        </div>

        <table className="fin-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Class</th>
              <th>Current Price</th>
              <th>Period Return</th>
              <th>CAGR</th>
              <th>Ann. Volatility</th>
              <th>Sharpe Ratio</th>
              <th>Sortino Ratio</th>
              <th>Calmar Ratio</th>
              <th>Max Drawdown</th>
            </tr>
          </thead>
          <tbody>
            {focusSymbols.map(sym => {
              const item = multiData[sym];
              const s = item?.summary;
              const conf = colors[sym];
              return (
                <tr key={sym}>
                  <td style={{ fontWeight: 700, color: '#fff' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: conf?.border, marginRight: '8px' }}></span>
                    {conf?.name} ({sym})
                  </td>
                  <td><span className="badge-neutral">{sym === 'GC=F' ? 'Commodity' : (sym === 'BTC-USD' ? 'Crypto' : 'Equity')}</span></td>
                  <td>${s?.current_price?.toLocaleString() ?? '—'}</td>
                  <td>
                    <span className={s?.total_return_pct >= 0 ? 'badge-profit' : 'badge-loss'}>
                      {s?.total_return_pct >= 0 ? `+${s.total_return_pct}%` : `${s?.total_return_pct}%`}
                    </span>
                  </td>
                  <td>{s?.cagr_pct ? `${s.cagr_pct}%` : '—'}</td>
                  <td style={{ color: 'var(--amber-warning)' }}>{s?.annualized_volatility_pct ? `${s.annualized_volatility_pct}%` : '—'}</td>
                  <td style={{ fontWeight: 700, color: s?.sharpe_ratio >= 1.0 ? 'var(--cyan-primary)' : '#fff' }}>{s?.sharpe_ratio ?? '—'}</td>
                  <td>{s?.sortino_ratio ?? '—'}</td>
                  <td>{s?.calmar_ratio ?? '—'}</td>
                  <td style={{ color: 'var(--rose-loss)' }}>{s?.max_drawdown_pct ? `${s.max_drawdown_pct}%` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Core Hackathon Innovation Card */}
      <div className="glass-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(99,102,241,0.08) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <CheckCircle2 size={18} color="var(--emerald-profit)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Hackathon Quantitative Objectives Checklist</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--emerald-profit)' }}>✓</span> Multi-Asset Normalization (Gold, BTC, NVDA)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--emerald-profit)' }}>✓</span> Vectorized SMA, EMA & Rolling Indicators
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--emerald-profit)' }}>✓</span> Dynamic Correlation & Rolling Decoupling
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--emerald-profit)' }}>✓</span> Realistic Discrete Backtester with Slippage & Fees
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--emerald-profit)' }}>✓</span> Market Regime Attribution (Bull/Bear & Vol)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--emerald-profit)' }}>✓</span> Monte Carlo Simulation & Institutional VaR
          </div>
        </div>
      </div>

    </div>
  );
}
