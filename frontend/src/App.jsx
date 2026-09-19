import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Activity,
  Network,
  PlayCircle,
  Sliders,
  Compass,
  Shield,
  FileText,
  Brain
} from 'lucide-react';
import Header from './components/Header';
import OverviewTab from './components/OverviewTab';
import IndicatorsTab from './components/IndicatorsTab';
import CorrelationTab from './components/CorrelationTab';
import BacktestTab from './components/BacktestTab';
import RobustnessTab from './components/RobustnessTab';
import RegimeTab from './components/RegimeTab';
import RiskMonteCarloTab from './components/RiskMonteCarloTab';
import AILabTab from './components/AILabTab';
import { fetchAssets, fetchMarketData } from './services/api';

export default function App() {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('BTC-USD');
  const [selectedPeriod, setSelectedPeriod] = useState('2y');
  const [activeTab, setActiveTab] = useState('overview');
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load assets list
  useEffect(() => {
    async function loadAssets() {
      try {
        const list = await fetchAssets();
        setAssets(list);
      } catch (err) {
        console.error('Failed to fetch assets list', err);
        // Fallback default list
        setAssets([
          { symbol: 'GC=F', name: 'Gold Futures', category: 'Commodities' },
          { symbol: 'BTC-USD', name: 'Bitcoin USD', category: 'Cryptocurrency' },
          { symbol: 'NVDA', name: 'NVIDIA Corp', category: 'Equities' },
          { symbol: 'SPY', name: 'S&P 500 ETF', category: 'Equities' }
        ]);
      }
    }
    loadAssets();
  }, []);

  // Load active asset market data
  const loadActiveMarketData = async () => {
    setLoading(true);
    try {
      const res = await fetchMarketData(selectedAsset, selectedPeriod);
      setMarketData(res);
    } catch (err) {
      console.error(`Failed to load data for ${selectedAsset}`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveMarketData();
  }, [selectedAsset, selectedPeriod]);

  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'indicators', label: 'Technical & Quant Indicators', icon: <Activity size={16} /> },
    { id: 'correlation', label: 'Cross-Asset Correlation', icon: <Network size={16} /> },
    { id: 'backtest', label: 'Strategy Backtester', icon: <PlayCircle size={16} /> },
    { id: 'ailab', label: '🤖 AI & Machine Learning Lab', icon: <Brain size={16} /> },
    { id: 'robustness', label: 'Parameter Robustness', icon: <Sliders size={16} /> },
    { id: 'regimes', label: 'Market Regime Analysis', icon: <Compass size={16} /> },
    { id: 'risk', label: 'Risk & Monte Carlo', icon: <Shield size={16} /> }
  ];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.25rem' }}>
      
      {/* Top Header */}
      <Header
        assets={assets}
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
        summary={marketData?.summary}
        onRefresh={loadActiveMarketData}
        loading={loading}
      />

      {/* Main Tab Navigation */}
      <div className="nav-tabs" style={{ marginBottom: '1.25rem' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`nav-tab-btn ${activeTab === t.id ? 'active' : ''}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Tab View */}
      <main>
        {activeTab === 'overview' && (
          <OverviewTab
            assets={assets}
            selectedPeriod={selectedPeriod}
            onSelectAsset={(sym) => {
              setSelectedAsset(sym);
              setActiveTab('indicators');
            }}
          />
        )}

        {activeTab === 'indicators' && (
          <IndicatorsTab
            marketData={marketData}
            assetSymbol={selectedAsset}
          />
        )}

        {activeTab === 'correlation' && (
          <CorrelationTab
            selectedPeriod={selectedPeriod}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestTab
            assetSymbol={selectedAsset}
            selectedPeriod={selectedPeriod}
          />
        )}

        {activeTab === 'ailab' && (
          <AILabTab
            assetSymbol={selectedAsset}
            selectedPeriod={selectedPeriod}
          />
        )}

        {activeTab === 'robustness' && (
          <RobustnessTab
            assetSymbol={selectedAsset}
            selectedPeriod={selectedPeriod}
          />
        )}

        {activeTab === 'regimes' && (
          <RegimeTab
            assetSymbol={selectedAsset}
            selectedPeriod={selectedPeriod}
          />
        )}

        {activeTab === 'risk' && (
          <RiskMonteCarloTab
            assetSymbol={selectedAsset}
            selectedPeriod={selectedPeriod}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '2.5rem', padding: '1.25rem 0', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
        <div>
          <span style={{ fontWeight: 600, color: '#cbd5e1' }}>QUANTUM</span> | Quantitative Multi-Asset Financial Intelligence & Backtesting Engine
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>Commodities (Gold)</span>
          <span>•</span>
          <span>Crypto (Bitcoin, ETH)</span>
          <span>•</span>
          <span>Equities (NVDA, SPY)</span>
        </div>
        <div>
          HackHere Hackathon Edition • Zero Look-Ahead Bias Backtester
        </div>
      </footer>

    </div>
  );
}
