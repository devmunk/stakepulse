'use client';

import { useState } from 'react';
import type { Prediction } from '@/types';
import PredictionCard from './PredictionCard';

interface Props {
  predictions: Prediction[];
  loading: boolean;
  wallet: any;
  onRefresh: () => void;
}

export default function PredictionList({ predictions, loading, wallet, onRefresh }: Props) {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const now = Math.floor(Date.now() / 1000);

  const filtered = predictions.filter((p) => {
    if (filter === 'active') return !p.resolved && p.end_time > now;
    if (filter === 'resolved') return p.resolved;
    return true;
  });

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        {(['all', 'active', 'resolved'] as const).map((f) => (
          <button
            key={f}
            className="btn btn-ghost"
            style={{
              padding: '6px 14px',
              fontSize: 11,
              background: filter === f ? 'var(--surface2)' : 'transparent',
              color: filter === f ? 'var(--text-yellow)' : 'var(--text-dim)',
              borderColor: filter === f ? 'var(--border-yellow)' : 'var(--border)',
            }}
            onClick={() => setFilter(f)}
          >
            {f.toUpperCase()} ({
              f === 'all' ? predictions.length
              : f === 'active' ? predictions.filter(p => !p.resolved && p.end_time > now).length
              : predictions.filter(p => p.resolved).length
            })
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
          {loading && <><span className="spinner" style={{ marginRight: 6 }} />SYNCING...</>}
        </div>
      </div>

      {filtered.length === 0 && !loading && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
          color: 'var(--text-dim)', fontSize: 13,
        }}>
          {filter === 'all'
            ? 'No markets yet. Create the first one!'
            : `No ${filter} markets.`}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {filtered.map((pred) => (
          <PredictionCard
            key={pred.id}
            prediction={pred}
            wallet={wallet}
            onSuccess={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
