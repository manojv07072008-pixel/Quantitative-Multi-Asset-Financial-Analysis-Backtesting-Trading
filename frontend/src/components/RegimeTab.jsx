import React, { useState, useEffect } from 'react';
import { Compass, ShieldCheck, Sun, CloudRain, Flame, Snowflake, Activity, TrendingUp } from 'lucide-react';
import { analyzeRegimes } from '../services/api';

export default function RegimeTab({ assetSymbol, selectedPeriod }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRegimes() {
      setLoading(true);
      try {
        const res = await analyzeRegimes({
          symbol: assetSymbol,
          period: selectedPeriod,
          strategy: 'sma_crossover',
          params: { fast_period: 20, slow_period: 50 }
        });
        setData(res?.regime_analysis);
      } catch (err) {
        console.error('Failed to load regime analysis', err);
      } finally {
        setLoading(false);
      }
    }
    loadRegimes();
  }, [assetSymbol, selectedPeriod]);

  const metrics = data?.regime_metrics || {};
  const combined = data?.combined_regimes || {};
  const timeline = data?.timeline || [];

  const regimeIcons = {
    'Bull Market': <Sun size={20} color="#f59e0b" />,
    'Bear Market': <CloudRain size={20} color="#64748b" />,
    'High Volatility': <Flame size={20} color="#f43f5e" />,
    'Low Volatility': <Snowflake size={20} color="#06b6d4" />
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Regime Classification Header */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Compass size={20} color="#06b6d4" />
            Market Regime Intelligence & Strategy Attribution
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Categorizes historical market dynamics into macro trend and volatility regimes to audit performance robustness.
          </p>
        </div>

        {/* 4 Primary Regime Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {['Bull Market', 'Bear Market', 'High Volatility', 'Low Volatility'].map(r => {
            const m = metrics[r] || {};
            return (
              <div key={r} className="glass-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${r.includes('Bull') ? '#f59e0b' : (r.includes('Bear') ? '#64748b' : (r.includes('High') ? '#f43f5e' : '#06b6d4'))}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{r}</span>
                  {regimeIcons[r]}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: m.strategy_cumulative_return_pct >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
                    {m.strategy_cumulative_return_pct !== undefined ? `${m.strategy_cumulative_return_pct >= 0 ? '+' : ''}${m.strategy_cumulative_return_pct}%` : '—'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>({m.days} days)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', fontSize: '0.72rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Benchmark:</span>
                    <div className="font-mono" style={{ color: m.benchmark_cumulative_return_pct >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
                      {m.benchmark_cumulative_return_pct}%
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Win Days:</span>
                    <div className="font-mono" style={{ color: '#fff' }}>{m.positive_days_pct}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4-Quadrant Combined Regimes Breakdown */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#6366f1" />
            Four-Quadrant Regime Attribution Matrix
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Deep-dive attribution of strategy returns across combined trend and volatility climates.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="fin-table">
            <thead>
              <tr>
                <th>Combined Regime</th>
                <th>Days in Regime</th>
                <th>% of Time</th>
                <th>Strategy Return</th>
                <th>Benchmark Return</th>
                <th>Annualized Strategy Yield</th>
                <th>Regime Nature</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(combined).map(cr => {
                const item = combined[cr];
                const nature = cr === 'Bull / Low Vol' ? 'Goldilocks Growth'
                  : (cr === 'Bull / High Vol' ? 'Parabolic / Euphoria'
                  : (cr === 'Bear / High Vol' ? 'Panic Capitulation' : 'Liquidity Drain'));
                return (
                  <tr key={cr}>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{cr}</td>
                    <td>{item.days} days</td>
                    <td>{item.percentage_of_time}%</td>
                    <td style={{ fontWeight: 700, color: item.strategy_return_pct >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
                      {item.strategy_return_pct >= 0 ? `+${item.strategy_return_pct}%` : `${item.strategy_return_pct}%`}
                    </td>
                    <td>{item.benchmark_return_pct}%</td>
                    <td style={{ color: 'var(--cyan-primary)' }}>{item.strategy_annualized_pct}%</td>
                    <td><span className="badge-neutral">{nature}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regime Timeline Ribbon */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          Historical Regime Sequence Timeline
        </h4>
        <div style={{ display: 'flex', height: '28px', width: '100%', borderRadius: '6px', overflow: 'hidden' }}>
          {timeline.map((t, idx) => {
            const isBull = t.trend_regime === 'Bull Market';
            const isHighVol = t.vol_regime === 'High Volatility';
            let bg = isBull ? (isHighVol ? '#f59e0b' : '#10b981') : (isHighVol ? '#f43f5e' : '#475569');
            return (
              <div
                key={idx}
                style={{ flex: 1, backgroundColor: bg }}
                title={`${t.date}: ${t.combined_regime}`}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
          <span>{timeline[0]?.date || 'Start'}</span>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ color: '#10b981' }}>■ Bull / Low Vol</span>
            <span style={{ color: '#f59e0b' }}>■ Bull / High Vol</span>
            <span style={{ color: '#f43f5e' }}>■ Bear / High Vol</span>
            <span style={{ color: '#475569' }}>■ Bear / Low Vol</span>
          </div>
          <span>{timeline[timeline.length - 1]?.date || 'End'}</span>
        </div>
      </div>

    </div>
  );
}
