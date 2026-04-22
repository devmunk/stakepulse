'use client';

import { shortAddress } from '@/lib/contract';

interface Props {
  wallet: any;
  onConnectClick: () => void;
  onRulesClick: () => void;
}

export default function Header({ wallet, onConnectClick, onRulesClick }: Props) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 16px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(11,11,11,0.95)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Logo */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, letterSpacing: '0.04em', color: 'var(--text)' }}>
        STAKE<span style={{ color: 'var(--yellow)' }}>PULSE</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginLeft: 8, fontWeight: 400 }}>
          SOROBAN
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={onRulesClick}>
          📋 RULES
        </button>

        {wallet.connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '6px 12px',
              background: 'var(--surface)',
              border: '1px solid var(--border-yellow)',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, animation: 'pulse-yellow 2s infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-yellow)' }}>
                {shortAddress(wallet.address)}
              </span>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={wallet.disconnect}>
              DISCONNECT
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onConnectClick}>
            CONNECT WALLET
          </button>
        )}
      </div>
    </header>
  );
}
