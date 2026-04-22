'use client';

import { useState, useEffect } from 'react';
import type { Prediction, TxState } from '@/types';
import {
  invokeContract,
  getTokenAddress,
  addressArg, u64Arg, u32Arg, i128Arg,
  fromStroops, toStroops, shortAddress,
} from '@/lib/contract';

interface Props {
  prediction: Prediction;
  wallet: any;
  onSuccess: () => void;
}

function useCountdown(endTime: number) {
  const [timeLeft, setTimeLeft] = useState(endTime - Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(endTime - Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);
  return timeLeft;
}

function formatTime(secs: number) {
  if (secs <= 0) return 'EXPIRED';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function PredictionCard({ prediction: pred, wallet, onSuccess }: Props) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS;
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });
  const [showStakeForm, setShowStakeForm] = useState(false);

  const timeLeft = useCountdown(pred.end_time);
  const isExpired = timeLeft <= 0;
  const isActive = !pred.resolved && !isExpired;
      console.log({
      wallet: wallet.address,
      creator: pred.creator,
      isExpired,
      resolved: pred.resolved,
    });
  const totalPool = pred.total_pool ?? 0;
  const optionStakes = pred.option_stakes ?? pred.options.map(() => 0);
  const userStake = pred.user_stake ?? 0;
  const userOption = pred.user_option ?? -1;
  const hasStaked = userStake > 0 && userOption >= 0;

  // Live odds
  function getOdds(optionIdx: number): number {
    if (totalPool === 0) return 0;
    return (optionStakes[optionIdx] ?? 0) / totalPool;
  }

  // Estimated reward
  function estimatedReward(): number {
    if (!stakeAmount || selectedOption === null) return 0;
    const stakeStroops = toStroops(parseFloat(stakeAmount) || 0);
    const newWinStake = (optionStakes[selectedOption] ?? 0) + stakeStroops;
    const newTotal = totalPool + stakeStroops;
    if (newWinStake === 0) return 0;
    return fromStroops((stakeStroops * newTotal) / newWinStake);
  }

 async function handleStake() {
  if (selectedOption === null || !stakeAmount) return;

  // 👇 STEP 1: parse user input (XLM)
  const numericAmount = parseFloat(stakeAmount) || 0;

  // ✅ VALIDATION (correct place)
  if (numericAmount < 1) {
    setTxState({
      status: 'error',
      error: 'Minimum stake is 1 XLM',
    });
    return;
  }

  if (numericAmount > 1000) {
    setTxState({
      status: 'error',
      error: 'Maximum stake is 1000 XLM',
    });

    return;
  }

  // 👇 STEP 2: convert AFTER validation
  const amount = toStroops(numericAmount);

  if (amount <= 0) return;

  setTxState({ status: 'building', message: 'Building transaction...' });

  try {
    setTxState({
      status: 'signing',
      message: 'Check wallet to sign',
    });

    const { hash } = await invokeContract(
      'stake',
      [
        addressArg(wallet.address),
        u64Arg(pred.id),
        u32Arg(selectedOption),
        i128Arg(amount),
        addressArg(getTokenAddress()),
      ],
      wallet.address,
      wallet.signTransaction,
    );

    setTxState({ status: 'success', hash, message: 'Staked successfully!' });

    setStakeAmount('');
    setShowStakeForm(false);

    setTimeout(onSuccess, 1500);
  } catch (err: any) {
    setTxState({
      status: 'error',
      error: err?.message?.includes('already staked')
        ? 'You have already staked on this market.'
        : err?.message?.includes('staking period ended')
        ? 'Staking period has ended.'
        : err?.message || 'Transaction failed.',
    });
  }
}

  async function handleClaim() {
    setTxState({ status: 'building', message: 'Building claim transaction...' });
    try {
      setTxState({ status: 'signing', message: 'Please sign in your wallet...' });
      const { hash } = await invokeContract(
        'claim_reward',
        [
          addressArg(wallet.address),
          u64Arg(pred.id),
          addressArg(getTokenAddress()),
        ],
        wallet.address,
        wallet.signTransaction,
      );
      setTxState({ status: 'success', hash, message: 'Reward claimed!' });
      setTimeout(onSuccess, 1500);
    } catch (err: any) {
      setTxState({
        status: 'error',
        error: err?.message?.includes('already claimed')
          ? 'You have already claimed this reward.'
          : err?.message?.includes('not pick the winning')
          ? 'You did not pick the winning option.'
          : err?.message || 'Claim failed.',
      });
    }
  }
  async function handleResolve(optionIndex: number) {
  setTxState({ status: 'building', message: 'Building resolve transaction...' });

  try {
    setTxState({ status: 'signing', message: 'Please sign in your wallet...' });

    const { hash } = await invokeContract(
      'resolve_prediction',
      [
        addressArg(wallet.address),
        u64Arg(pred.id),
        u32Arg(optionIndex),
      ],
      wallet.address,
      wallet.signTransaction,
    );

    setTxState({
      status: 'success',
      hash,
      message: 'Prediction resolved!',
    });

    setTimeout(onSuccess, 1500);
  } catch (err: any) {
    setTxState({
      status: 'error',
      error: err?.message || 'Failed to resolve prediction',
    });
  }
}
  const isBusy = txState.status !== 'idle' && txState.status !== 'success' && txState.status !== 'error';

  // Can claim if: resolved, user staked, winning option matches, not claimed
  const canClaim =
    pred.resolved &&
    hasStaked &&
    userOption === pred.winning_option &&
    !pred.has_claimed;
  const numericAmount = parseFloat(stakeAmount) || 0;

    const isValidAmount = numericAmount >= 1 && numericAmount <= 1000;
  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
            MARKET #{pred.id} · {shortAddress(pred.creator)}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, lineHeight: 1.2, color: 'var(--text)' }}>
            {pred.question}
          </div>
        </div>
        <div>
          {pred.resolved ? (
            <span className="badge badge-green">✓ RESOLVED</span>
          ) : isExpired ? (
            <span className="badge badge-red">EXPIRED</span>
          ) : (
            <span className="badge badge-yellow">⚡ LIVE</span>
          )}
        </div>
      </div>

      {/* Countdown */}
      {!pred.resolved && (
        <div style={{ fontSize: 12, color: isExpired ? 'var(--red)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          ⏱ {isExpired ? 'Expired' : `Closes in ${formatTime(timeLeft)}`}
        </div>
      )}

      {/* Pool info */}
      <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div>
          <div className="label">TOTAL POOL</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--yellow)' }}>
            {fromStroops(totalPool).toFixed(2)} <span style={{ fontSize: 13, fontWeight: 400 }}>XLM</span>
          </div>
        </div>
        {hasStaked && (
          <div style={{ marginLeft: 'auto' }}>
            <div className="label">YOUR STAKE</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
              {fromStroops(userStake).toFixed(2)} XLM
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              → {pred.options[userOption]}
            </div>
          </div>
        )}
      </div>

      {/* Options with odds */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pred.options.map((opt, idx) => {
          const odds = getOdds(idx);
          const stake = optionStakes[idx] ?? 0;
          const isWinner = pred.resolved && idx === pred.winning_option;
          const isUserPick = hasStaked && userOption === idx;

          return (
            <div
              key={idx}
              style={{
                padding: '10px 12px',
                border: `1px solid ${isWinner ? 'var(--green)' : isUserPick ? 'var(--border-yellow)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                background: isWinner ? 'rgba(34,197,94,0.06)' : isUserPick ? 'rgba(243,186,47,0.06)' : 'var(--surface2)',
                cursor: (isActive && !hasStaked) ? 'pointer' : 'default',
                transition: 'var(--transition)',
              }}
              onClick={() => {
                if (isActive && !hasStaked && showStakeForm) setSelectedOption(idx);
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isWinner && <span style={{ color: 'var(--green)' }}>✓</span>}
                  {isUserPick && !isWinner && <span style={{ color: 'var(--yellow)' }}>★</span>}
                  <span style={{ fontSize: 13, fontWeight: 600, color: isWinner ? 'var(--green)' : 'var(--text)' }}>
                    {opt}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {(odds * 100).toFixed(1)}%
                  {' · '}
                  {fromStroops(stake).toFixed(1)} XLM
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.max(odds * 100, 2)}%`, background: isWinner ? 'var(--green)' : 'var(--yellow)' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stake form */}
      {isActive && !hasStaked && (
        <>
          {!showStakeForm ? (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowStakeForm(true)}>
              ⚡ STAKE NOW
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--surface2)', border: '1px solid var(--border-yellow)', borderRadius: 'var(--radius)' }}>
              <div className="label">SELECT OPTION</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pred.options.map((opt, idx) => (
                  <button
                    key={idx}
                    className="btn btn-ghost"
                    style={{
                      fontSize: 12,
                      padding: '6px 14px',
                      background: selectedOption === idx ? 'var(--yellow)' : undefined,
                      color: selectedOption === idx ? 'var(--black)' : undefined,
                      borderColor: selectedOption === idx ? 'var(--yellow)' : undefined,
                    }}
                    onClick={() => setSelectedOption(idx)}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <div>
                <label className="label">STAKE AMOUNT (XLM)</label>
                <input
                  className="input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 10"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                />
                {stakeAmount && !isValidAmount && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                {numericAmount < 1
                  ? 'Minimum stake is 1 XLM'
                  : 'Maximum stake is 1000 XLM'}
              </div>
            )}
          </div>

              {stakeAmount && selectedOption !== null && isValidAmount && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '8px 10px', background: 'var(--surface3)', borderRadius: 'var(--radius)' }}>
                  Est. reward if you win: <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{estimatedReward().toFixed(2)} XLM</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowStakeForm(false)}>
                  CANCEL
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={selectedOption === null || !stakeAmount || isBusy || !isValidAmount}
                  onClick={handleStake}
                >
                  {isBusy ? <span className="spinner" /> : 'CONFIRM STAKE'}
                </button>
                {isBusy && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-dim)',
                    textAlign: 'center',
                    marginTop: 6,
                  }}
                >
                  {txState.message}
                </div>
              )}
              </div>
            </div>
          )}
        </>
      )}
      {/* Resolve button (only creator) */}
      {!pred.resolved && isExpired && (
  wallet.address === pred.creator?.toString() ||
  wallet.address === ADMIN_ADDRESS
) && (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: 8,
    }}
  >
    {pred.options.map((opt, idx) => (
      <button
        key={idx}
        className="btn btn-warning"
        style={{ width: '100%' }}
        disabled={isBusy}
        onClick={() => handleResolve(idx)}
      >
        Resolve: {opt}
      </button>
    ))}
  </div>
)}
      {/* Claim button */}
      {canClaim && (
        <button
          className="btn btn-success"
          style={{ width: '100%' }}
          disabled={isBusy}
          onClick={handleClaim}
        >
          {isBusy ? <><span className="spinner" />{txState.message}</> : '🏆 CLAIM REWARD'}
        </button>
      )}

      {/* Already staked */}
      {hasStaked && !pred.resolved && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '8px', background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
          ✓ You're staked on <strong style={{ color: 'var(--text-yellow)' }}>{pred.options[userOption]}</strong>. Awaiting result.
        </div>
      )}

      {/* Already claimed */}
      {pred.has_claimed && (
        <div style={{ fontSize: 12, color: 'var(--green)', textAlign: 'center', padding: '8px', background: 'rgba(34,197,94,0.06)', borderRadius: 'var(--radius)', border: '1px solid rgba(34,197,94,0.2)' }}>
          ✓ Reward claimed!
        </div>
      )}

      {/* TX status */}
      {(txState.status === 'success' || txState.status === 'error') && (
        <div style={{
          padding: '10px 14px',
          background: txState.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${txState.status === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 'var(--radius)',
          fontSize: 12,
          color: txState.status === 'success' ? 'var(--green)' : 'var(--red)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{txState.status === 'success' ? `✓ ${txState.message}` : `✗ ${txState.error}`}</span>
          {txState.hash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txState.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--yellow)', fontSize: 11, marginLeft: 8 }}
            >
              VIEW TX →
            </a>
          )}
          <button
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 8 }}
            onClick={() => setTxState({ status: 'idle' })}
          >✕</button>
        </div>
      )}
    </div>
  );
}
