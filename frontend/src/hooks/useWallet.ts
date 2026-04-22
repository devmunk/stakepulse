'use client';

import { useState, useCallback, useEffect } from 'react';
import type { WalletState } from '@/types';

// Lazy import to avoid SSR
let kitInstance: any = null;

async function getKit() {
  if (kitInstance) return kitInstance;

  const { StellarWalletsKit, WalletNetwork, FREIGHTER_ID, ALBEDO_ID, XBULL_ID } =
    await import('@creit.tech/stellar-wallets-kit');

  const network =
    (process.env.NEXT_PUBLIC_NETWORK || 'testnet') === 'mainnet'
      ? WalletNetwork.PUBLIC
      : WalletNetwork.TESTNET;

  kitInstance = new StellarWalletsKit({
    network,
    selectedWalletId: undefined,
    modules: [],
  });

  return kitInstance;
}

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: '',
    kit: null,
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  // Restore session from localStorage
 useEffect(() => {
  const restoreWallet = async () => {
    try {
      const saved = localStorage.getItem('sp_wallet_address');
      const savedWalletId = localStorage.getItem('sp_wallet_id');
      const manuallyDisconnected = localStorage.getItem('sp_disconnected');

      if (!saved || !savedWalletId || manuallyDisconnected) return;

      const {
        StellarWalletsKit,
        WalletNetwork,
        FreighterModule,
        AlbedoModule,
        xBullModule,
      } = await import('@creit.tech/stellar-wallets-kit');

      const network =
        (process.env.NEXT_PUBLIC_NETWORK || 'testnet') === 'mainnet'
          ? WalletNetwork.PUBLIC
          : WalletNetwork.TESTNET;

      const kit = new StellarWalletsKit({
        network,
        selectedWalletId: savedWalletId,
        modules: [
          new FreighterModule(),
          new AlbedoModule(),
          new xBullModule(),
        ],
      });

      await kit.setWallet(savedWalletId);

      const { address } = await kit.getAddress();

      setWalletState({
        connected: true,
        address,
        kit,
      });
    } catch (e) {
      console.warn("Wallet restore failed", e);
    }
  };

  restoreWallet();
}, []);

  const connect = useCallback(async (walletId: string) => {
    setConnecting(true);
    setError('');
    try {
      const {
        StellarWalletsKit,
        WalletNetwork,
        FREIGHTER_ID,
        ALBEDO_ID,
        XBULL_ID,
        FreighterModule,
        AlbedoModule,
        xBullModule,
      } = await import('@creit.tech/stellar-wallets-kit');

      const network =
        (process.env.NEXT_PUBLIC_NETWORK || 'testnet') === 'mainnet'
          ? WalletNetwork.PUBLIC
          : WalletNetwork.TESTNET;

      const kit = new StellarWalletsKit({
        network,
        selectedWalletId: walletId,
        modules: [
          new FreighterModule(),
          new AlbedoModule(),
          new xBullModule(),
        ],
      });

      await kit.setWallet(walletId);
      const { address } = await kit.getAddress();

      localStorage.setItem('sp_wallet_address', address);
      localStorage.setItem('sp_wallet_id', walletId);
      localStorage.removeItem('sp_disconnected');

      setWalletState({ connected: true, address, kit });
    } catch (err: any) {
      const msg =
        err?.message?.includes('User declined')
          ? 'Connection rejected by user.'
          : err?.message?.includes('not installed')
          ? 'Wallet extension not installed. Please install it and try again.'
          : err?.message || 'Failed to connect wallet.';
      setError(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.setItem('sp_disconnected', 'true');
    localStorage.removeItem('sp_wallet_address');
    localStorage.removeItem('sp_wallet_id');
    setWalletState({ connected: false, address: '', kit: null });
    kitInstance = null;
  }, []);

  const signTransaction = useCallback(
    async (xdrString: string, opts?: any): Promise<string> => {
      if (!walletState.kit) throw new Error('Wallet not connected');
      const { signedTxXdr } = await walletState.kit.signTransaction(xdrString, opts);
      return signedTxXdr;
    },
    [walletState.kit],
  );

  return {
    ...walletState,
    connecting,
    error,
    connect,
    disconnect,
    signTransaction,
  };
}
