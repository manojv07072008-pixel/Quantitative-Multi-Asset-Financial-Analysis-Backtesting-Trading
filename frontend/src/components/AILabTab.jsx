import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Layers,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { fetchMLPrediction, fetchGMMRegimes, sendAIChat } from '../services/api';

export default function AILabTab({ assetSymbol, selectedPeriod }) {
  const [mlData, setMlData] = useState(null);
  const [gmmData, setGmmData] = useState(null);
  const [loadingModels, setLoadingModels] = useState(true);

  // Chat State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I am your **QUANTUM AI Research Analyst** powered by Mistral-7B via Featherless AI. I analyze your live portfolio data, machine learning signals, and market regimes in real-time. Ask me any quantitative question below!`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef(null);

  const loadAIModels = async () => {
    setLoadingModels(true);
    try {
      const [mlRes, gmmRes] = await Promise.all([
        fetchMLPrediction(assetSymbol, selectedPeriod),
        fetchGMMRegimes(assetSymbol, selectedPeriod, 3)
      ]);
      setMlData(mlRes);
      setGmmData(gmmRes);
    } catch (err) {
      console.error('Failed to load AI models', err);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadAIModels();
  }, [assetSymbol, selectedPeriod]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (promptToSend) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || sendingChat) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setSendingChat(true);

    try {
      const res = await sendAIChat(text, assetSymbol, selectedPeriod);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.response }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error connecting to Featherless AI. Please check network connectivity.'
        }
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  // Feature Importance Chart Data
  const features = mlData?.feature_importance || [];
  const featureChartData = {
    labels: features.map((f) => f.feature),
    datasets: [
      {
        label: 'Predictive Feature Importance (%)',
        data: features.map((f) => f.importance),
        backgroundColor: 'rgba(6, 182, 212, 0.75)',
        borderRadius: 4
      }
    ]
  };

  const featureChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Importance: ${ctx.parsed.x}%`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: (v) => `${v}%` },
        grid: { color: 'rgba(255,255,255,0.04)' }
      },
      y: {
        ticks: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { display: false }
      }
    }
  };

  const samplePrompts = [
    `What is your outlook on ${assetSymbol} given the ML forecast and volatility?`,
    `Explain the top predictive technical factors driving the AI model for ${assetSymbol}`,
    `How should I allocate a portfolio between Gold, Bitcoin, and NVIDIA right now?`,
    `Audit the tail risk and drawdown vulnerability of ${assetSymbol}`
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner: AI Model Status */}
      <div className="glass-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(6,182,212,0.08) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)', padding: '0.5rem', borderRadius: '10px' }}>
              <Brain size={22} color="var(--cyan-primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                  Institutional AI & Machine Learning Lab
                </h2>
                <span className="badge-accent" style={{ fontSize: '0.65rem' }}>FEATHERLESS AI MISTRAL-7B ACTIVE</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Walk-forward Supervised ML direction forecasting (XGBoost + Random Forest), GMM regime clustering, and AI Quant Copilot.
              </p>
            </div>
          </div>

          <button
            onClick={loadAIModels}
            className="btn-secondary"
            disabled={loadingModels}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} className={loadingModels ? 'pulse-ping' : ''} />
            Re-Train Models
          </button>
        </div>
      </div>

      {/* Grid: Predictive Forecast + Feature Importance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* ML Directional Forecast Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={18} color="var(--cyan-primary)" />
                  Supervised ML Directional Forecast
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {mlData?.model_type || 'XGBoost & Random Forest Ensemble'}
                </p>
              </div>
              <span className="badge-neutral font-mono">{assetSymbol}</span>
            </div>

            {/* Prediction Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
              <div style={{
                background: mlData?.next_bar_prediction === 'BULLISH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                border: `1px solid ${mlData?.next_bar_prediction === 'BULLISH' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                {mlData?.next_bar_prediction === 'BULLISH' ? (
                  <TrendingUp size={28} color="var(--emerald-profit)" />
                ) : (
                  <TrendingDown size={28} color="var(--rose-loss)" />
                )}
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>NEXT-PERIOD SIGNAL</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: mlData?.next_bar_prediction === 'BULLISH' ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
                    {mlData?.next_bar_prediction || 'COMPUTING...'}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MODEL CONFIDENCE</div>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  {mlData?.confidence_pct}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                  Test Acc: {mlData?.test_accuracy_pct}%
                </div>
              </div>
            </div>

            {/* Probability Distribution Bar */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--emerald-profit)', fontWeight: 600 }}>Bullish {mlData?.bullish_probability_pct}%</span>
                <span style={{ color: 'var(--rose-loss)', fontWeight: 600 }}>Bearish {mlData?.bearish_probability_pct}%</span>
              </div>
              <div style={{ height: '8px', width: '100%', background: 'rgba(244, 63, 94, 0.5)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${mlData?.bullish_probability_pct || 50}%`, background: 'var(--emerald-profit)', transition: 'width 0.5s' }}></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <div>Training Samples: <span className="font-mono" style={{ color: '#fff' }}>{mlData?.train_samples} bars</span></div>
            <div>Walk-Forward Test: <span className="font-mono" style={{ color: '#fff' }}>{mlData?.test_samples} bars</span></div>
          </div>
        </div>

        {/* Explainable AI (XAI) Feature Importance Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} color="#6366f1" />
              Explainable AI (XAI): Feature Importance
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Quantifies which technical indicators have the strongest influence on the ML ensemble's predictions.
            </p>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            {loadingModels ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Computing feature attribution...
              </div>
            ) : (
              <Bar data={featureChartData} options={featureChartOptions} />
            )}
          </div>
        </div>

      </div>

      {/* Unsupervised Machine Learning Regime Clustering (GMM) */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="#06b6d4" />
            Unsupervised ML Regime Clustering (Gaussian Mixture Models)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Discovers latent market macro-regimes via unsupervised GMM clustering on return and volatility distributions.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {gmmData?.profiles?.map((p) => (
            <div key={p.cluster_id} className="glass-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${p.cluster_id === 0 ? '#10b981' : (p.cluster_id === 1 ? '#f43f5e' : '#6366f1')}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Cluster {p.cluster_id}</span>
                <span className="badge-neutral font-mono">{p.frequency_pct}% of Time</span>
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.75rem' }}>
                {p.label}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.72rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ann. Return:</span>
                  <div className="font-mono" style={{ color: p.annualized_return_pct >= 0 ? 'var(--emerald-profit)' : 'var(--rose-loss)' }}>
                    {p.annualized_return_pct >= 0 ? `+${p.annualized_return_pct}%` : `${p.annualized_return_pct}%`}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Avg. Volatility:</span>
                  <div className="font-mono" style={{ color: 'var(--amber-warning)' }}>
                    {p.average_volatility_pct}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive AI Quantitative Research Copilot (Powered by Featherless AI) */}
      <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} color="var(--cyan-primary)" />
              AI Quantitative Research Copilot
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Interactive institutional reasoning assistant grounded with live market data and ML signals via Featherless AI (Mistral-7B).
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--emerald-profit)' }}></span>
            <span style={{ fontSize: '0.7rem', color: 'var(--emerald-profit)', fontWeight: 600 }}>FEATHERLESS CONNECTED</span>
          </div>
        </div>

        {/* Prompt Recommendation Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={sendingChat}
              className="badge-neutral"
              style={{
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
                transition: 'all 0.15s'
              }}
            >
              💡 {p}
            </button>
          ))}
        </div>

        {/* Chat Messages Container */}
        <div style={{
          height: '320px',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          marginBottom: '1rem'
        }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: '0.5rem'
                }}
              >
                {!isUser && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={16} color="var(--cyan-primary)" />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    lineHeight: '1.5',
                    background: isUser ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : 'rgba(255, 255, 255, 0.04)',
                    color: isUser ? '#fff' : '#cbd5e1',
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {sendingChat && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <Bot size={16} color="var(--cyan-primary)" className="pulse-ping" />
              <span>QUANTUM AI is analyzing live quant data via Featherless...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: 'flex', gap: '0.5rem' }}
        >
          <input
            type="text"
            className="fin-input"
            placeholder={`Ask QUANTUM AI about ${assetSymbol}, optimal strategies, or risk management...`}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={sendingChat}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={sendingChat || !inputPrompt.trim()}
          >
            <Send size={15} />
            Send
          </button>
        </form>
      </div>

    </div>
  );
}
