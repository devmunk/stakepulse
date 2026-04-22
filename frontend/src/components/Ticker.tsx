'use client';

export default function Ticker() {
  const items = [
    '⚡ PREDICT · STAKE · WIN',
    '🔗 POWERED BY STELLAR SOROBAN',
    '💰 PROPORTIONAL REWARDS',
    '🏆 CLAIM YOUR WINNINGS',
    '📊 LIVE ODDS UPDATED IN REAL TIME',
    '🛡 TRUSTLESS SMART CONTRACTS',
    '⚡ NO KYC · NO CUSTODIAN',
    '🌐 MULTI-WALLET SUPPORT',
  ];

  // Duplicate for seamless loop
  const content = [...items, ...items].join('   ·   ');

  return (
    <div className="ticker-wrap">
      <span className="ticker-content">{content}&nbsp;&nbsp;&nbsp;&nbsp;</span>
    </div>
  );
}
