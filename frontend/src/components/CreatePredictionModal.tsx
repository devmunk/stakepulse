'use client';

import { useState } from 'react';
import type { TxState } from '@/types';
import { invokeContract, addressArg, stringArg, u64Arg, vecArg } from '@/lib/contract';
import { xdr } from '@stellar/stellar-sdk';

interface Props {
  wallet: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePredictionModal({ wallet, onClose, onSuccess }: Props) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endDate, setEndDate] = useState('');
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });

  const isBusy = txState.status !== 'idle' && txState.status !== 'success' && txState.status !== 'error';

  function addOption() {
    if (options.length < 4) setOptions([...options, '']);
  }

  function removeOption(idx: number) {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  }

  function setOption(idx: number, val: string) {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  }

  async function handleCreate() {
    if (!question.trim()) return;
    const cleanOpts = options.filter((o) => o.trim());
    if (cleanOpts.length < 2) return;
    if (!endDate) return;

    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    if (endTimestamp <= Math.floor(Date.now() / 1000)) {
      setTxState({ status: 'error', error: 'End date must be in the future.' });
      return;
    }

    setTxState({ status: 'building', message: 'Building transaction...' });
    try {
      setTxState({
        status: 'signing',
        message: 'Connect Freighter',
      });
      const optArgs = vecArg(cleanOpts.map(stringArg));
      const { hash } = await invokeContract(
        'create_prediction',
        [
          addressArg(wallet.address),
          stringArg(question.trim()),
          optArgs,
          u64Arg(endTimestamp),
        ],
        wallet.address,
        wallet.signTransaction,
      );
      setTxState({ status: 'success', hash, message: 'Market created!' });
      setTimeout(onSuccess, 1500);
    } catch (err: any) {
      setTxState({ status: 'error', error: err?.message || 'Failed to create market.' });
    }
  }

  // Min date = now + 1 min
  const minDate = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900 }}>
            CREATE <span style={{ color: 'var(--yellow)' }}>MARKET</span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Question */}
          <div>
            <label className="label">PREDICTION QUESTION</label>
            <input
              className="input"
              placeholder="Will BTC reach $200k by end of year?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          {/* Options */}
          <div>
            <label className="label">OPTIONS (2–4)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => setOption(idx, e.target.value)}
                  />
                  {options.length > 2 && (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '8px 12px', fontSize: 14 }}
                      onClick={() => removeOption(idx)}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 4 && (
              <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: 11, padding: '6px 14px' }} onClick={addOption}>
                + ADD OPTION
              </button>
            )}
          </div>

          {/* End date */}
          <div>
            <label className="label">END DATE & TIME</label>
            <input
              className="input"
              type="datetime-local"
              min={minDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* TX Status */}
          {txState.status === 'error' && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 13 }}>
              ✗ {txState.error}
            </div>
          )}
          {txState.status === 'success' && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 'var(--radius)',
                color: 'var(--green)',
                fontSize: 13,
              }}
            >
              ✓ {txState.message}

              {txState.hash && (
                <div style={{ marginTop: 8 }}>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txState.hash}`}
                    target="_blank"
                    style={{ color: 'var(--yellow)', textDecoration: 'underline' }}
                  >
                    View Transaction ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={isBusy}>
              CANCEL
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2 || !endDate || isBusy}
              onClick={handleCreate}
            >
              {isBusy ? <><span className="spinner" />{txState.message || 'PROCESSING...'}</> : 'CREATE MARKET'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
