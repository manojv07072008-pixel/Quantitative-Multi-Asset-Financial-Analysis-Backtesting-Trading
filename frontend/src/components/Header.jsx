import React from 'react';
import { Activity, ShieldCheck, TrendingUp, Cpu, Globe, RefreshCw } from 'lucide-react';

export default function Header({
  assets = [],
  selectedAsset,
  onSelectAsset,
  selectedPeriod,
  onSelectPeriod,
  summary = null,
  onRefresh,
  loading
}) {
  const periods = [
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
    { label: '2Y', value: '2y' },
    { label: '5Y', value: '5y' }
  ];

  return (
    <header className="glass-card" style={{ padding: '0.85rem 1.5rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.3) 100%)',
            border: '1px solid rgba(6,182,212,0.4)',
            padding: '0.55rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(6,182,212,0.3)'
          }}>
            <Activity size={22} color="#06b6d4" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>QUANTUM</span>
              <span className="badge-accent" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>PRO QUANT</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Multi-Asset Quantitative Financial Intelligence & Backtesting</p>
          </div>
        </div>

        {/* Real-time Ticker & Metrics Banner */}
        {summary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CURRENT CLOSE</div>
              <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                ${summary.current_price?.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL RETURN</div>
              <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: summary.total_return_pct >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
                {summary.total_return_pct >= 0 ? `+${summary.total_return_pct}%` : `${summary.total_return_pct}%`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SHARPE (ANN.)</div>
              <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: summary.sharpe_ratio >= 1.0 ? 'var(--cyan-primary)' : '#fff' }}>
                {summary.sharpe_ratio}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ANN. VOLATILITY</div>
              <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--amber-warning)' }}>
                {summary.annualized_volatility_pct}%
              </div>
            </div>
          </div>
        )}

        {/* Asset & Timeframe Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Asset Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ASSET:</span>
            <select
              className="fin-select"
              style={{ width: 'auto', minWidth: '150px', cursor: 'pointer' }}
              value={selectedAsset}
              onChange={(e) => onSelectAsset(e.target.value)}
            >
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol} style={{ background: '#0f172a', color: '#fff' }}>
                  {a.name} ({a.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => onSelectPeriod(p.value)}
                style={{
                  background: selectedPeriod === p.value ? 'var(--cyan-primary)' : 'transparent',
                  color: selectedPeriod === p.value ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="btn-secondary"
            title="Refresh quantitative calculation"
            disabled={loading}
            style={{ padding: '0.45rem 0.7rem' }}
          >
            <RefreshCw size={14} className={loading ? 'pulse-ping' : ''} />
          </button>

          {/* Operational Health Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--emerald-profit)', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--emerald-profit)' }}>ENGINE READY</span>
          </div>

        </div>
      </div>
    </header>
  );
}
