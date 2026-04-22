'use client';

import { useState } from 'react';
import Header from './Header';
import WalletModal from './WalletModal';
import PredictionList from './PredictionList';
import CreatePredictionModal from './CreatePredictionModal';
import RulesModal from './RulesModal';
import Leaderboard from './Leaderboard';
import Ticker from './Ticker';
import { useWallet } from '@/hooks/useWallet';
import { usePredictions } from '@/hooks/usePredictions';

export default function ClientApp() {
  const wallet = useWallet();

  const { predictions, loading, error, refetch } = usePredictions(wallet.address);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'markets' | 'leaderboard'>('markets');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Ticker />
      <Header
        wallet={wallet}
        onConnectClick={() => setShowWalletModal(true)}
        onRulesClick={() => setShowRulesModal(true)}
      />

      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '24px 16px' }}>
        {/* Hero */}
        {!wallet.connected && (
          <div className="fade-in" style={{
            textAlign: 'center',
            padding: '60px 24px',
            border: '1px solid var(--border-yellow)',
            borderRadius: 'var(--radius)',
            background: 'linear-gradient(135deg, var(--surface) 0%, rgba(243,186,47,0.04) 100%)',
            marginBottom: 32,
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
              STAKE<span style={{ color: 'var(--yellow)' }}>PULSE</span>
            </div>
            <div style={{ color: 'var(--text-dim)', marginTop: 12, fontSize: 14 }}>
              Predict. Stake. Win. — On Stellar Soroban
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 28, padding: '14px 36px', fontSize: 15 }}
              onClick={() => setShowWalletModal(true)}
            >
              ⚡ Connect Wallet to Start
            </button>
          </div>
        )}

        {wallet.connected && (     
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                {(['markets', 'leaderboard'] as const).map((tab) => (
                  <button
                    key={tab}
                    className="btn"
                    style={{
                      padding: '8px 18px',
                      fontSize: 12,
                      background: activeTab === tab ? 'var(--yellow)' : 'transparent',
                      color: activeTab === tab ? 'var(--black)' : 'var(--text-dim)',
                      border: 'none',
                    }}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'markets' ? '📊 MARKETS' : '🏆 LEADERBOARD'}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  onClick={refetch}
                  disabled={loading}
                >
                  {loading ? <span className="spinner" /> : '↻'} REFRESH
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  + NEW MARKET
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}

            {activeTab === 'markets' && (
              <PredictionList
                predictions={predictions}
                loading={loading}
                wallet={wallet}
                onRefresh={refetch}
              />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard predictions={predictions} userAddress={wallet.address} />
            )}
          </>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '16px', textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        STAKEPULSE — POWERED BY STELLAR SOROBAN — NOT FINANCIAL ADVICE
      </footer>

      {showWalletModal && (
        <WalletModal
          wallet={wallet}
          onClose={() => setShowWalletModal(false)}
        />
      )}

      {showCreateModal && wallet.connected && (
        <CreatePredictionModal
          wallet={wallet}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); refetch(); }}
        />
      )}

      {showRulesModal && (
        <RulesModal onClose={() => setShowRulesModal(false)} />
      )}
    </div>
  );
}
