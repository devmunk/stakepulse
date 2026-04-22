'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Prediction } from '@/types';
import { readContract, addressArg, u64Arg, u32Arg, fromStroops } from '@/lib/contract';

const CACHE_KEY = 'sp_predictions_cache';
const POLL_INTERVAL = 5000;

function loadCache(): Prediction[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCache(data: Prediction[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function usePredictions(userAddress: string) {
  const [predictions, setPredictions] = useState<Prediction[]>(loadCache());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (!userAddress) return;
    setLoading(true);
    setError('');
    try {
      // Get count
      const count = await readContract('get_prediction_count', [], userAddress);
      const numCount = typeof count === 'bigint' ? Number(count) : (count ?? 0);

      const results: Prediction[] = [];
      for (let i = 0; i < numCount; i++) {
        try {
          const raw = await readContract(
            'get_prediction_details',
            [u64Arg(i)],
            userAddress,
          );
          if (!raw) continue;

          const pred = parsePrediction(raw, i);

          // Fetch option stakes
          const optionStakes: number[] = [];
          for (let j = 0; j < pred.options.length; j++) {
            const stake = await readContract(
              'get_option_stake',
              [u64Arg(i), u32Arg(j)],
              userAddress,
            );
            optionStakes.push(
              typeof stake === 'bigint' ? Number(stake) : (stake ?? 0),
            );
          }
          pred.option_stakes = optionStakes;

          // Fetch user stake
          const userStakeRaw = await readContract(
            'get_user_stake',
            [u64Arg(i), addressArg(userAddress)],
            userAddress,
          );
          pred.user_stake =
            typeof userStakeRaw === 'bigint'
              ? Number(userStakeRaw)
              : (userStakeRaw ?? 0);

          // Fetch user option
          const userOptionRaw = await readContract(
            'get_user_option',
            [u64Arg(i), addressArg(userAddress)],
            userAddress,
          );
          pred.user_option =
            typeof userOptionRaw === 'bigint'
              ? Number(userOptionRaw)
              : (userOptionRaw ?? -1);

          // Has claimed
          const claimed = await readContract(
            'has_claimed',
            [u64Arg(i), addressArg(userAddress)],
            userAddress,
          );
          pred.has_claimed = Boolean(claimed);

          results.push(pred);
        } catch (predErr) {
          console.warn(`Failed to load prediction ${i}:`, predErr);
        }
      }

      setPredictions(results);
      saveCache(results);
    } catch (err: any) {
      setError(err?.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Start polling
  useEffect(() => {
    if (!userAddress) return;
    fetchPredictions();
    pollRef.current = setInterval(fetchPredictions, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [userAddress, fetchPredictions]);

  return { predictions, loading, error, refetch: fetchPredictions };
}

// ── Parse raw Soroban contract response ───────────────────────
function parsePrediction(raw: any, fallbackId: number): Prediction {
  // raw can be a plain object or Map — handle both
  const get = (key: string) => {
    if (!raw) return undefined;
    if (raw instanceof Map) return raw.get(key);
    return raw[key];
  };

  const id = toNum(get('id') ?? fallbackId);
  const question = toString(get('question'));
  const optionsRaw = get('options');
  const options: string[] = parseVec(optionsRaw);
  const end_time = toNum(get('end_time'));
  const total_pool = toNum(get('total_pool'));
  const resolved = Boolean(get('resolved'));
  const winning_option = toNum(get('winning_option'));
  const creator = toString(get('creator'));

  return {
    id,
    question,
    options,
    end_time,
    total_pool,
    resolved,
    winning_option,
    creator,
  };
}

function toNum(val: any): number {
  if (typeof val === 'bigint') return Number(val);
  if (typeof val === 'number') return val;
  if (val == null) return 0;
  try { return Number(val); } catch { return 0; }
}

function toString(val: any): string {
  if (!val) return '';

  if (typeof val === 'string') return val;

  try {
    if (val?.toString) {
      return val.toString();
    }
  } catch {}

  return String(val);
}

function parseVec(val: any): string[] {
  if (Array.isArray(val)) return val.map(toString);

  if (val?._value) {
    try {
      return val._value.map(toString);
    } catch {}
  }

  if (val instanceof Map) return Array.from(val.values()).map(toString);

  return [];
}
