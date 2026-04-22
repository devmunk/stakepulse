'use client';

import { useState, useEffect } from 'react';
import type { Prediction } from '@/types';
import { fromStroops, shortAddress, readContract, addressArg } from '@/lib/contract';

interface LeaderboardEntry {
  address: string;
  totalReward: number;
  wins: number;
}

interface Props {
  predictions: Prediction[];
  userAddress: string;
}

export default function Leaderboard({ predictions, userAddress }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    buildLeaderboard();
  }, [predictions, userAddress]);

  async function buildLeaderboard() {
    if (!userAddress || predictions.length === 0) return;
    setLoading(true);

    try {
      // Collect all unique addresses from resolved predictions
      const addressSet = new Set<string>();
      addressSet.add(userAddress);

      // For now, we can only show the current user's stats from on-chain
      // In a production app, you'd index events or use an indexer service
      const resolved = predictions.filter((p) => p.resolved);

      // Build per-address stats using available data
      const stats: Record<string, { totalReward: number; wins: number }> = {};

      // Try to load current user's on-chain total reward
      try {
        const rewardRaw = await readContract(
          'get_user_total_reward',
          [addressArg(userAddress)],
          userAddress,
        );
        const reward = typeof rewardRaw === 'bigint' ? Number(rewardRaw) : (rewardRaw ?? 0);
        if (reward > 0) {
          stats[userAddress] = { totalReward: reward, wins: 0 };
        }
      } catch {}

      // Count wins from local prediction data for the current user
      let wins = 0;
      resolved.forEach((p) => {
        if (p.user_stake && p.user_stake > 0 && p.user_option === p.winning_option) {
          wins++;
        }
      });

      if (!stats[userAddress]) {
        stats[userAddress] = { totalReward: 0, wins };
      } else {
        stats[userAddress].wins = wins;
      }

      const result: LeaderboardEntry[] = Object.entries(stats)
        .map(([address, s]) => ({ address, ...s }))
        .sort((a, b) => b.totalReward - a.totalReward);

      setEntries(result);
    } catch (err) {
      console.warn('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
      }}>
        {[
          { label: 'TOTAL MARKETS', value: predictions.length },
          { label: 'ACTIVE', value: predictions.filter(p => !p.resolved && p.end_time > Math.floor(Date.now() / 1000)).length },
          { label: 'RESOLVED', value: predictions.filter(p => p.resolved).length },
          { label: 'YOUR STAKES', value: predictions.filter(p => p.user_stake && p.user_stake > 0).length },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
            <div className="label" style={{ marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: 'var(--yellow)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard table */}
      <div className="card">
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 900,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          🏆 TOP <span style={{ color: 'var(--yellow)' }}>EARNERS</span>
          {loading && <span className="spinner" style={{ marginLeft: 8 }} />}
        </div>

        {entries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-dim)',
            fontSize: 13,
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
          }}>
            {loading ? 'Loading leaderboard...' : 'No earnings data yet. Claim rewards to appear here!'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 120px 80px',
              padding: '8px 14px',
              fontSize: 10,
              color: 'var(--text-dim)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--border)',
            }}>
              <span>RANK</span>
              <span>ADDRESS</span>
              <span style={{ textAlign: 'right' }}>TOTAL EARNED</span>
              <span style={{ textAlign: 'right' }}>WINS</span>
            </div>

            {entries.map((entry, idx) => (
              <div
                key={entry.address}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 120px 80px',
                  padding: '14px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  background: entry.address === userAddress ? 'rgba(243,186,47,0.04)' : undefined,
                  transition: 'background var(--transition)',
                }}
              >
                {/* Rank */}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: idx < 3 ? 22 : 16,
                  fontWeight: 900,
                  color: idx < 3 ? 'var(--yellow)' : 'var(--text-dim)',
                }}>
                  {idx < 3 ? medals[idx] : `#${idx + 1}`}
                </span>

                {/* Address */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                    {shortAddress(entry.address)}
                  </span>
                  {entry.address === userAddress && (
                    <span className="badge badge-yellow" style={{ fontSize: 9 }}>YOU</span>
                  )}
                </div>

                {/* Total earned */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 18,
                    fontWeight: 800,
                    color: entry.totalReward > 0 ? 'var(--green)' : 'var(--text-dim)',
                  }}>
                    {fromStroops(entry.totalReward).toFixed(2)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>XLM</span>
                </div>

                {/* Wins */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 18,
                    fontWeight: 800,
                    color: entry.wins > 0 ? 'var(--yellow)' : 'var(--text-dim)',
                  }}>
                    {entry.wins}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          Leaderboard updates as rewards are claimed on-chain.
        </p>
      </div>

      {/* Your activity */}
      {predictions.some((p) => p.user_stake && p.user_stake > 0) && (
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, marginBottom: 16 }}>
            YOUR <span style={{ color: 'var(--yellow)' }}>ACTIVITY</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {predictions
              .filter((p) => p.user_stake && p.user_stake > 0)
              .map((p) => {
                const won = p.resolved && p.user_option === p.winning_option;
                const lost = p.resolved && p.user_option !== p.winning_option;
                const pending = !p.resolved;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'var(--surface2)',
                      borderRadius: 'var(--radius)',
                      border: `1px solid ${won ? 'rgba(34,197,94,0.2)' : lost ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>
                        {p.question.length > 60 ? p.question.slice(0, 60) + '…' : p.question}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        Staked on: <strong style={{ color: 'var(--text)' }}>{p.options[p.user_option ?? 0]}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
                        {fromStroops(p.user_stake ?? 0).toFixed(2)} XLM
                      </div>
                      <span className={`badge ${won ? 'badge-green' : lost ? 'badge-red' : 'badge-gray'}`}>
                        {won ? '✓ WON' : lost ? '✗ LOST' : '⏳ PENDING'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
