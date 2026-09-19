import React, { useState, useEffect } from 'react';
import { Network, GitCompare, Info, Calendar, Sparkles } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { fetchCorrelation, fetchRollingCorrelation } from '../services/api';

export default function CorrelationTab({ selectedPeriod }) {
  const [matrixData, setMatrixData] = useState(null);
  const [method, setMethod] = useState('pearson');
  const [loadingMatrix, setLoadingMatrix] = useState(true);

  // Rolling Correlation Pair
  const [sym1, setSym1] = useState('GC=F');
  const [sym2, setSym2] = useState('BTC-USD');
  const [rollingWindow, setRollingWindow] = useState(30);
  const [rollingSeries, setRollingSeries] = useState([]);
  const [loadingRolling, setLoadingRolling] = useState(false);

  const availableSymbols = [
    { symbol: 'GC=F', name: 'Gold Futures' },
    { symbol: 'BTC-USD', name: 'Bitcoin' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'SPY', name: 'S&P 500' },
    { symbol: 'ETH-USD', name: 'Ethereum' },
    { symbol: 'AAPL', name: 'Apple' }
  ];

  // Load Matrix
  useEffect(() => {
    async function loadMatrix() {
      setLoadingMatrix(true);
      try {
        const symbolsStr = availableSymbols.map(s => s.symbol).join(',');
        const res = await fetchCorrelation(symbolsStr, selectedPeriod, method);
        setMatrixData(res);
      } catch (err) {
        console.error('Failed to load correlation matrix', err);
      } finally {
        setLoadingMatrix(false);
      }
    }
    loadMatrix();
  }, [selectedPeriod, method]);

  // Load Rolling Pair Correlation
  useEffect(() => {
    async function loadRolling() {
      setLoadingRolling(true);
      try {
        const res = await fetchRollingCorrelation(sym1, sym2, selectedPeriod, rollingWindow);
        setRollingSeries(res.series || []);
      } catch (err) {
        console.error('Failed to load rolling correlation', err);
      } finally {
        setLoadingRolling(false);
      }
    }
    loadRolling();
  }, [sym1, sym2, selectedPeriod, rollingWindow]);

  // Get color for correlation value (-1 to +1)
  const getHeatmapColor = (val) => {
    if (val === null || val === undefined) return 'rgba(255,255,255,0.05)';
    if (val > 0) {
      // Positive: Cyan to Emerald
      const alpha = Math.min(Math.abs(val) * 0.75 + 0.15, 0.9);
      return `rgba(6, 182, 212, ${alpha})`;
    } else {
      // Negative: Rose
      const alpha = Math.min(Math.abs(val) * 0.75 + 0.15, 0.9);
      return `rgba(244, 63, 94, ${alpha})`;
    }
  };

  // Rolling Chart Data
  const chartLabels = rollingSeries.map(s => s.date);
  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: `${sym1} vs ${sym2} (${rollingWindow}-Day Rolling Correlation)`,
      data: rollingSeries.map(s => s.correlation),
      borderColor: '#06b6d4',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
        return gradient;
      },
      fill: true,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12, weight: 600 } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#0f172a',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 10, font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: {
        min: -1.0,
        max: 1.0,
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
        grid: {
          color: (ctx) => (ctx.tick.value === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)'),
          lineWidth: (ctx) => (ctx.tick.value === 0 ? 1.5 : 1)
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Section: Heatmap Matrix */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Network size={20} color="#06b6d4" />
              Cross-Asset Correlation Matrix
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Statistical co-movement analysis based on daily returns across multi-asset classes.
            </p>
          </div>

          {/* Pearson vs Spearman Toggle */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setMethod('pearson')}
              className={method === 'pearson' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            >
              Pearson (Linear)
            </button>
            <button
              onClick={() => setMethod('spearman')}
              className={method === 'spearman' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            >
              Spearman (Rank)
            </button>
          </div>
        </div>

        {/* Heatmap Grid */}
        {loadingMatrix ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Calculating cross-asset matrix...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ margin: '0 auto', borderCollapse: 'separate', borderSpacing: '6px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-faint)' }}></th>
                  {matrixData?.symbols?.map(s => (
                    <th key={s} style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData?.symbols?.map((rowSym, rIdx) => (
                  <tr key={rowSym}>
                    <td style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                      {rowSym}
                    </td>
                    {matrixData.matrix[rIdx]?.map((val, cIdx) => {
                      const colSym = matrixData.symbols[cIdx];
                      return (
                        <td
                          key={colSym}
                          onClick={() => {
                            if (rowSym !== colSym) {
                              setSym1(rowSym);
                              setSym2(colSym);
                            }
                          }}
                          style={{
                            backgroundColor: getHeatmapColor(val),
                            padding: '0.8rem 1.1rem',
                            textAlign: 'center',
                            borderRadius: '8px',
                            cursor: rowSym !== colSym ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}
                          className={rowSym !== colSym ? 'glass-card-interactive' : ''}
                          title={`Click to analyze rolling correlation: ${rowSym} vs ${colSym}`}
                        >
                          <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                            {val.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Heatmap Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(244, 63, 94, 0.75)' }}></span>
                <span>Negative Correlation (-1.0)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }}></span>
                <span>Uncorrelated (0.0)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(6, 182, 212, 0.75)' }}></span>
                <span>Positive Correlation (+1.0)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Rolling Correlation Explorer */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitCompare size={19} color="#6366f1" />
              Dynamic Rolling Correlation Analysis
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Detect changing macro relationships, regime shifts, and flight-to-safety dynamics over time.
            </p>
          </div>

          {/* Controls: Sym 1, Sym 2, Window */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PAIR:</span>
              <select
                className="fin-select"
                style={{ width: 'auto', minWidth: '120px' }}
                value={sym1}
                onChange={(e) => setSym1(e.target.value)}
              >
                {availableSymbols.map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.symbol} ({s.name})</option>
                ))}
              </select>
              <span style={{ color: 'var(--text-faint)' }}>vs</span>
              <select
                className="fin-select"
                style={{ width: 'auto', minWidth: '120px' }}
                value={sym2}
                onChange={(e) => setSym2(e.target.value)}
              >
                {availableSymbols.map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.symbol} ({s.name})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WINDOW:</span>
              <select
                className="fin-select"
                style={{ width: 'auto' }}
                value={rollingWindow}
                onChange={(e) => setRollingWindow(Number(e.target.value))}
              >
                <option value={15}>15 Days</option>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rolling Correlation Time Series Chart */}
        <div style={{ height: '320px', width: '100%' }}>
          {loadingRolling ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Calculating rolling series...
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>

        {/* Dynamic Quantitative Insight Callout */}
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(6,182,212,0.06)', borderRadius: '10px', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Sparkles size={18} color="var(--cyan-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.45' }}>
            <strong>Quantitative Decoupling Insight:</strong> When correlation between <strong>{sym1}</strong> and <strong>{sym2}</strong> drops below zero, portfolio diversification benefits reach maximum efficiency. Periods of sudden positive correlation spikes often indicate systemic liquidity contractions or macroeconomic shocks.
          </div>
        </div>
      </div>

    </div>
  );
}
