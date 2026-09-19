import React, { useState, useEffect } from 'react';
import { Sliders, ShieldCheck, Flame, BarChart2, Zap, AlertTriangle } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { evaluateRobustness } from '../services/api';

export default function RobustnessTab({ assetSymbol, selectedPeriod }) {
  const [data, setData] = useState(null);
  const [metricView, setMetricView] = useState('sharpe'); // 'sharpe' | 'return'
  const [loading, setLoading] = useState(true);

  const fastRange = [5, 10, 15, 20, 25];
  const slowRange = [30, 40, 50, 60, 80];

  useEffect(() => {
    async function loadRobustness() {
      setLoading(true);
      try {
        const res = await evaluateRobustness({
          symbol: assetSymbol,
          period: selectedPeriod,
          strategy: 'sma_crossover',
          fast_range: fastRange,
          slow_range: slowRange,
          initial_capital: 100000.0,
          transaction_cost_pct: 0.001
        });
        setData(res);
      } catch (err) {
        console.error('Failed to load robustness', err);
      } finally {
        setLoading(false);
      }
    }
    loadRobustness();
  }, [assetSymbol, selectedPeriod]);

  // Heatmap color generator
  const getCellColor = (val) => {
    if (val === 0) return 'rgba(255,255,255,0.03)';
    if (metricView === 'sharpe') {
      if (val > 1.0) return 'rgba(16, 185, 129, 0.75)';
      if (val > 0.5) return 'rgba(6, 182, 212, 0.6)';
      if (val > 0) return 'rgba(99, 102, 241, 0.4)';
      return 'rgba(244, 63, 94, 0.5)';
    } else {
      if (val > 50) return 'rgba(16, 185, 129, 0.8)';
      if (val > 20) return 'rgba(6, 182, 212, 0.65)';
      if (val > 0) return 'rgba(99, 102, 241, 0.45)';
      return 'rgba(244, 63, 94, 0.5)';
    }
  };

  // Fee Stress Test Chart Data
  const feeData = data?.fee_stress_test || [];
  const feeChartData = {
    labels: feeData.map(f => `${f.fee_bps} bps (${f.fee_pct}%)`),
    datasets: [{
      label: 'Net Strategy Return (%)',
      data: feeData.map(f => f.strategy_return_pct),
      backgroundColor: feeData.map(f => f.strategy_return_pct >= 0 ? 'rgba(6, 182, 212, 0.75)' : 'rgba(244, 63, 94, 0.75)'),
      borderRadius: 4
    }]
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 2D Parameter Sensitivity Heatmap */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={20} color="#f59e0b" />
              Parameter Sensitivity & Robustness Grid
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Detect parameter stability zones vs overfitting cliffs across Fast MA vs Slow MA combinations.
            </p>
          </div>

          {/* Metric Selector */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setMetricView('sharpe')}
              className={metricView === 'sharpe' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            >
              Sharpe Ratio Grid
            </button>
            <button
              onClick={() => setMetricView('return')}
              className={metricView === 'return' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            >
              Net Return (%) Grid
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Calculating 25-parameter backtest permutations...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
              SLOW MA PERIOD →
            </div>

            <table style={{ margin: '0 auto', borderCollapse: 'separate', borderSpacing: '6px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.4rem', fontSize: '0.75rem', color: 'var(--cyan-primary)' }}>FAST MA ↓</th>
                  {data?.slow_range?.map(s => (
                    <th key={s} style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                      {s}d
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.fast_range?.map((fast, rIdx) => {
                  const matrix = metricView === 'sharpe' ? data.sharpe_matrix : data.return_matrix;
                  return (
                    <tr key={fast}>
                      <td style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                        {fast}d
                      </td>
                      {matrix[rIdx]?.map((val, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            backgroundColor: getCellColor(val),
                            padding: '0.85rem 1.25rem',
                            textAlign: 'center',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}
                          title={`Fast: ${fast}d, Slow: ${data.slow_range[cIdx]}d => ${val}`}
                        >
                          <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                            {metricView === 'sharpe' ? val.toFixed(2) : `${val.toFixed(1)}%`}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Cost Stress-Test */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="#06b6d4" />
              Execution Friction & Transaction Cost Stress-Test
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Assessing strategy resilience against broker commissions, bid-ask spreads, and market slippage.
            </p>
          </div>
        </div>

        <div style={{ height: '240px', width: '100%' }}>
          <Bar
            data={feeChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: { label: (c) => `Return: ${c.parsed.y}%` }
                }
              },
              scales: {
                x: { ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }, grid: { display: false } },
                y: {
                  ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: (v) => `${v}%` },
                  grid: { color: 'rgba(255,255,255,0.04)' }
                }
              }
            }}
          />
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {feeData.map(f => (
            <div key={f.fee_bps} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>FEE: {f.fee_bps} BPS</div>
              <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: f.strategy_return_pct >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
                {f.strategy_return_pct}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Net PnL: ${f.net_profit?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
