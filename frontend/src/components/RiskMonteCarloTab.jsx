import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Download, HelpCircle, Activity, Award, TrendingUp, AlertTriangle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { runMonteCarlo, fetchRiskAnalytics, fetchResearchReport } from '../services/api';

export default function RiskMonteCarloTab({ assetSymbol, selectedPeriod }) {
  const [mcData, setMcData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simHorizon, setSimHorizon] = useState(252); // 252 days = 1 year

  useEffect(() => {
    async function loadRiskAndMC() {
      setLoading(true);
      try {
        const [mcRes, riskRes, repRes] = await Promise.all([
          runMonteCarlo({
            symbol: assetSymbol,
            period: selectedPeriod,
            strategy: 'sma_crossover',
            params: { fast_period: 20, slow_period: 50 },
            num_simulations: 500,
            forecast_days: simHorizon
          }),
          fetchRiskAnalytics(assetSymbol, selectedPeriod, 100000),
          fetchResearchReport({
            symbol: assetSymbol,
            period: selectedPeriod,
            strategy: 'sma_crossover',
            params: { fast_period: 20, slow_period: 50 },
            initial_capital: 100000,
            position_size_pct: 1.0,
            transaction_cost_pct: 0.001
          })
        ]);
        setMcData(mcRes);
        setRiskData(riskRes);
        setReportData(repRes?.report);
      } catch (err) {
        console.error('Failed to load risk and Monte Carlo data', err);
      } finally {
        setLoading(false);
      }
    }
    loadRiskAndMC();
  }, [assetSymbol, selectedPeriod, simHorizon]);

  // Build Monte Carlo Fan Chart
  const days = mcData?.percentile_curves?.days || [];
  const mcChartData = {
    labels: days.map(d => `Day ${d}`),
    datasets: [
      {
        label: '95th Percentile (Bullish Tail)',
        data: mcData?.percentile_curves?.p95 || [],
        borderColor: 'rgba(16, 185, 129, 0.8)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0
      },
      {
        label: '75th Percentile',
        data: mcData?.percentile_curves?.p75 || [],
        borderColor: 'rgba(6, 182, 212, 0.6)',
        backgroundColor: 'transparent',
        borderWidth: 1.2,
        pointRadius: 0
      },
      {
        label: '50th Percentile (Median Projection)',
        data: mcData?.percentile_curves?.p50 || [],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        borderWidth: 2.5,
        pointRadius: 0
      },
      {
        label: '25th Percentile',
        data: mcData?.percentile_curves?.p25 || [],
        borderColor: 'rgba(245, 158, 11, 0.6)',
        backgroundColor: 'transparent',
        borderWidth: 1.2,
        pointRadius: 0
      },
      {
        label: '5th Percentile (Bearish Tail)',
        data: mcData?.percentile_curves?.p5 || [],
        borderColor: '#f43f5e',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
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
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 12, font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: {
        position: 'right',
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: (v) => `$${Number(v).toLocaleString()}` },
        grid: { color: 'rgba(255,255,255,0.04)' }
      }
    }
  };

  const downloadReportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      asset: assetSymbol,
      monte_carlo: mcData,
      risk_analytics: riskData,
      report: reportData
    }, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Quant_Research_${assetSymbol}.json`);
    dlAnchor.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Monte Carlo Section */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#06b6d4" />
              Monte Carlo Multi-Path Forward Simulation (500 Paths)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Bootstraps empirical return distributions across {simHorizon} forward trading days to project probabilistic outcome cones.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HORIZON:</span>
            <select
              className="fin-select"
              style={{ width: 'auto' }}
              value={simHorizon}
              onChange={(e) => setSimHorizon(Number(e.target.value))}
            >
              <option value={126}>6 Months (126d)</option>
              <option value={252}>1 Year (252d)</option>
              <option value={504}>2 Years (504d)</option>
            </select>
          </div>
        </div>

        {/* Monte Carlo KPI Cards */}
        {mcData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MEDIAN PROJECTED CAPITAL</div>
              <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
                ${mcData.median_projected_equity?.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--cyan-primary)' }}>
                +{mcData.projected_return_50p_pct}% Expected
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PROBABILITY OF PROFIT</div>
              <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--emerald-profit)' }}>
                {mcData.prob_positive_return_pct}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                500 Bootstrap Iterations
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>95% VaR TERMINAL CAPITAL</div>
              <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--rose-loss)' }}>
                ${mcData.var_95_terminal_equity?.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                5th Percentile Severe Drop
              </div>
            </div>
          </div>
        )}

        <div style={{ height: '360px', width: '100%' }}>
          {loading ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Executing 500-path stochastic Monte Carlo bootstrap...
            </div>
          ) : (
            <Line data={mcChartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Value-at-Risk (VaR) & CVaR Gauge Panel */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={19} color="#f43f5e" />
            Value-at-Risk (VaR) & Conditional VaR (Expected Shortfall)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Institutional capital-at-risk stress metrics calibrated on a standardized $100,000 position.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {['95%', '99%'].map(conf => {
            const r = riskData?.risk_levels?.[conf];
            return (
              <div key={conf} className="glass-card" style={{ padding: '1.25rem', borderTop: '3px solid var(--rose-loss)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{conf} Confidence Interval</span>
                  <span className="badge-loss">1-Day Horizon</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Parametric (Normal) VaR:</span>
                    <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rose-loss)' }}>
                      -${r?.parametric_var_usd?.toLocaleString()} ({r?.parametric_var_pct}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Historical Empirical VaR:</span>
                    <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rose-loss)' }}>
                      -${r?.historical_var_usd?.toLocaleString()} ({r?.historical_var_pct}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Expected Shortfall (CVaR):</span>
                    <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f43f5e' }}>
                      -${r?.cvar_expected_shortfall_usd?.toLocaleString()} ({r?.cvar_expected_shortfall_pct}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automated AI Quantitative Research Audit Report */}
      {reportData && (
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(6,182,212,0.06) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Award size={20} color="var(--cyan-primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{reportData.report_title}</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Synthesized by Automated Quantitative Research Engine
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="badge-accent" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                {reportData.executive_grade}
              </div>
              <button
                onClick={downloadReportJson}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              >
                <Download size={14} /> Export Report
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px', borderLeft: '3px solid var(--cyan-primary)' }}>
            {reportData.institutional_summary}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* Key Findings */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                Key Quantitative Findings:
              </h4>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                {reportData.key_findings?.map((f, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>{f}</li>
                ))}
              </ul>
            </div>

            {/* Strategic Recommendations */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                Actionable Quantitative Enhancements:
              </h4>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                {reportData.recommendations?.map((r, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
