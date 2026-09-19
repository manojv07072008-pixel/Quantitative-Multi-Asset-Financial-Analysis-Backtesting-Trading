import React, { useState } from 'react';
import { Activity, Sliders, Eye, EyeOff, BarChart3, TrendingDown, Percent } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function IndicatorsTab({ marketData, assetSymbol }) {
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showEMA12, setShowEMA12] = useState(false);
  const [showEMA26, setShowEMA26] = useState(false);
  const [activeSubChart, setActiveSubChart] = useState('returns'); // 'returns' | 'volatility' | 'sharpe' | 'drawdown'

  const dataList = marketData?.data || [];
  const labels = dataList.map(d => d.date);

  // 1. Price + Moving Average Chart Datasets
  const priceDatasets = [
    {
      label: `${assetSymbol} Close`,
      data: dataList.map(d => d.close),
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6, 182, 212, 0.05)',
      fill: true,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1
    },
    showSMA20 && {
      label: 'SMA 20',
      data: dataList.map(d => d.sma_20),
      borderColor: '#f59e0b',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.1
    },
    showSMA50 && {
      label: 'SMA 50',
      data: dataList.map(d => d.sma_50),
      borderColor: '#ec4899',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.1
    },
    showSMA200 && {
      label: 'SMA 200',
      data: dataList.map(d => d.sma_200),
      borderColor: '#8b5cf6',
      borderWidth: 1.5,
      pointRadius: 0,
      borderDash: [5, 5],
      tension: 0.1
    },
    showEMA12 && {
      label: 'EMA 12',
      data: dataList.map(d => d.ema_12),
      borderColor: '#10b981',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.1
    },
    showEMA26 && {
      label: 'EMA 26',
      data: dataList.map(d => d.ema_26),
      borderColor: '#3b82f6',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.1
    }
  ].filter(Boolean);

  const priceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { family: 'Inter', size: 11, weight: 600 } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#0f172a',
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
        position: 'right',
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' }
      }
    }
  };

  // 2. Sub-Charts
  const renderSubChart = () => {
    if (activeSubChart === 'returns') {
      const barData = {
        labels,
        datasets: [{
          label: 'Daily Return (%)',
          data: dataList.map(d => (d.daily_return * 100).toFixed(2)),
          backgroundColor: dataList.map(d => d.daily_return >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)'),
          borderRadius: 2
        }]
      };
      return (
        <Bar
          data={barData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: { label: (c) => `${c.parsed.y}%` }
              }
            },
            scales: {
              x: { ticks: { color: '#64748b', maxTicksLimit: 10, font: { family: 'JetBrains Mono', size: 9 } }, grid: { display: false } },
              y: { position: 'right', ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } }, grid: { color: 'rgba(255,255,255,0.03)' } }
            }
          }}
        />
      );
    }

    if (activeSubChart === 'volatility') {
      const volData = {
        labels,
        datasets: [{
          label: '30-Day Rolling Annualized Volatility (%)',
          data: dataList.map(d => (d.rolling_volatility_30d * 100).toFixed(2)),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          borderWidth: 1.5,
          pointRadius: 0
        }]
      };
      return (
        <Line
          data={volData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#64748b', maxTicksLimit: 10, font: { family: 'JetBrains Mono', size: 9 } }, grid: { display: false } },
              y: { position: 'right', ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } }, grid: { color: 'rgba(255,255,255,0.03)' } }
            }
          }}
        />
      );
    }

    if (activeSubChart === 'sharpe') {
      const sharpeData = {
        labels,
        datasets: [{
          label: '30-Day Rolling Sharpe Ratio',
          data: dataList.map(d => d.rolling_sharpe_30d?.toFixed(2)),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          borderWidth: 1.5,
          pointRadius: 0
        }]
      };
      return (
        <Line
          data={sharpeData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#64748b', maxTicksLimit: 10, font: { family: 'JetBrains Mono', size: 9 } }, grid: { display: false } },
              y: { position: 'right', ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } }, grid: { color: 'rgba(255,255,255,0.03)' } }
            }
          }}
        />
      );
    }

    if (activeSubChart === 'drawdown') {
      const ddData = {
        labels,
        datasets: [{
          label: 'Drawdown (%)',
          data: dataList.map(d => (d.drawdown * 100).toFixed(2)),
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.2)',
          fill: true,
          borderWidth: 1.5,
          pointRadius: 0
        }]
      };
      return (
        <Line
          data={ddData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#64748b', maxTicksLimit: 10, font: { family: 'JetBrains Mono', size: 9 } }, grid: { display: false } },
              y: { position: 'right', ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } }, grid: { color: 'rgba(255,255,255,0.03)' } }
            }
          }}
        />
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Price & Moving Average Panel */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        
        {/* Header & Indicator Toggles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="#06b6d4" />
              {assetSymbol} Quantitative Technical Analysis
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Interactive price trajectory with configurable Simple & Exponential Moving Averages.
            </p>
          </div>

          {/* Toggle Switches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.2rem', fontWeight: 600 }}>OVERLAYS:</span>
            
            <button
              onClick={() => setShowSMA20(!showSMA20)}
              className={showSMA20 ? 'badge-accent' : 'badge-neutral'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              SMA 20
            </button>
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={showSMA50 ? 'badge-accent' : 'badge-neutral'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              SMA 50
            </button>
            <button
              onClick={() => setShowSMA200(!showSMA200)}
              className={showSMA200 ? 'badge-accent' : 'badge-neutral'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              SMA 200
            </button>
            <button
              onClick={() => setShowEMA12(!showEMA12)}
              className={showEMA12 ? 'badge-accent' : 'badge-neutral'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              EMA 12
            </button>
            <button
              onClick={() => setShowEMA26(!showEMA26)}
              className={showEMA26 ? 'badge-accent' : 'badge-neutral'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              EMA 26
            </button>
          </div>
        </div>

        {/* Main Price Chart */}
        <div style={{ height: '380px', width: '100%' }}>
          <Line data={{ labels, datasets: priceDatasets }} options={priceChartOptions} />
        </div>
      </div>

      {/* Auxiliary Quantitative Indicator Panel */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="#6366f1" />
              Dynamic Rolling Indicator Engine
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Inspect daily return distributions, annualized rolling volatility, rolling Sharpe, and underwater drawdown risk.
            </p>
          </div>

          {/* Sub-Chart Selector Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveSubChart('returns')}
              className={activeSubChart === 'returns' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            >
              Daily Returns
            </button>
            <button
              onClick={() => setActiveSubChart('volatility')}
              className={activeSubChart === 'volatility' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            >
              Rolling Volatility
            </button>
            <button
              onClick={() => setActiveSubChart('sharpe')}
              className={activeSubChart === 'sharpe' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            >
              Rolling Sharpe
            </button>
            <button
              onClick={() => setActiveSubChart('drawdown')}
              className={activeSubChart === 'drawdown' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            >
              Underwater Drawdown
            </button>
          </div>
        </div>

        {/* Sub-Chart Canvas */}
        <div style={{ height: '220px', width: '100%' }}>
          {renderSubChart()}
        </div>
      </div>

    </div>
  );
}
