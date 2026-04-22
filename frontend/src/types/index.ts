export interface Prediction {
  id: number;
  question: string;
  options: string[];
  end_time: number;
  total_pool: number;
  resolved: boolean;
  winning_option: number;
  creator: string;
  // derived on frontend
  option_stakes?: number[];
  user_stake?: number;
  user_option?: number;
  has_claimed?: boolean;
}

export interface WalletState {
  connected: boolean;
  address: string;
  kit: any | null;
}

export type TxStatus = 'idle' | 'building' | 'signing' | 'submitting' | 'confirming' | 'success' | 'error';

export interface TxState {
  status: TxStatus;
  hash?: string;
  message?: string;
  error?: string;
}

export interface LeaderboardEntry {
  address: string;
  total_reward: number;
}
