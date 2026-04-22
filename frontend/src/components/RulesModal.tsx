'use client';

export default function RulesModal({ onClose }: { onClose: () => void }) {
  const rules = [
  { num: 1, text: "Minimum stake per prediction is 1 XLM." },
{ num: 2, text: "Maximum stake per prediction is 1000 XLM." },

  { num: 3, text: "Users can stake tokens on active predictions before expiry." },
  { num: 4, text: "No staking allowed after end time." },
  { num: 5, text: "Each user can stake only once per prediction." },
  { num: 6, text: "All stakes contribute to a shared pool." },
  { num: 7, text: "Rewards go only to users who selected the winning outcome." },
  { num: 8, text: "Reward = (Your Stake ÷ Total Winning Stake) × Total Pool", highlight: true },
  { num: 9, text: "Prediction result is set manually by the creator or admin." },
  { num: 10, text: "No refunds after staking." },
  { num: 11, text: "You may lose your entire stake if your prediction is incorrect." },
];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, letterSpacing: '0.04em' }}>
            📋 RULES <span style={{ color: 'var(--yellow)' }}>&amp; TERMS</span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>

        {/* Rules list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map((rule) => (
            <div
              key={rule.num}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                padding: '12px 14px',
                background: rule.highlight ? 'rgba(243,186,47,0.06)' : 'var(--surface2)',
                border: `1px solid ${rule.highlight ? 'var(--border-yellow)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 900,
                color: 'var(--yellow)',
                lineHeight: 1,
                minWidth: 24,
                marginTop: 1,
              }}>
                {rule.num}
              </span>
              <span style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: rule.highlight ? 'var(--text)' : 'var(--text-dim)',
                fontFamily: rule.highlight ? 'var(--font-mono)' : undefined,
              }}>
                {rule.text}
              </span>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div style={{
          marginTop: 20,
          padding: '12px 14px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius)',
          fontSize: 12,
          color: 'var(--red)',
          lineHeight: 1.5,
        }}>
          ⚠ <strong>RISK WARNING:</strong> Prediction markets involve financial risk. This is NOT financial advice. Only stake what you can afford to lose. Smart contracts may contain bugs.
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 20 }}
          onClick={onClose}
        >
          I UNDERSTAND — CLOSE
        </button>
      </div>
    </div>
  );
}
