'use client';

import { useState } from 'react';

const WALLETS = [
  {
    id: 'freighter',
    name: 'Freighter',
    icon: '🦄',
    description: 'Browser extension by SDF',
    installUrl: 'https://www.freighter.app/',
  },
  {
    id: 'albedo',
    name: 'Albedo',
    icon: '🌐',
    description: 'Web-based, no install needed',
    installUrl: 'https://albedo.link/',
  },
  {
    id: 'xbull',
    name: 'xBull',
    icon: '🐂',
    description: 'Feature-rich browser extension',
    installUrl: 'https://xbull.app/',
  },
];

interface Props {
  wallet: any;
  onClose: () => void;
}

export default function WalletModal({ wallet, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  async function handleConnect(walletId: string) {
    setSelected(walletId);
    await wallet.connect(walletId);
    if (!wallet.error) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900 }}>
            CONNECT <span style={{ color: 'var(--yellow)' }}>WALLET</span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 20 }}>
          Choose your Stellar wallet to start predicting.
        </p>

        {wallet.error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
            ⚠ {wallet.error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {WALLETS.map((w) => (
            <button
              key={w.id}
              onClick={() => handleConnect(w.id)}
              disabled={wallet.connecting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: selected === w.id && wallet.connecting ? 'rgba(243,186,47,0.08)' : 'var(--surface2)',
                border: `1px solid ${selected === w.id ? 'var(--yellow)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                transition: 'var(--transition)',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--yellow)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = selected === w.id ? 'var(--yellow)' : 'var(--border)'; }}
            >
              <span style={{ fontSize: 28 }}>{w.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                  {w.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {w.description}
                </div>
              </div>
              {selected === w.id && wallet.connecting ? (
                <span className="spinner" />
              ) : (
                <span style={{ color: 'var(--text-dim)', fontSize: 16 }}>→</span>
              )}
            </button>
          ))}
        </div>

        <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          Don't have a wallet?{' '}
          <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--yellow)' }}>
            Install Freighter
          </a>
        </p>
      </div>
    </div>
  );
}
