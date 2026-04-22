// Contract interaction helpers for StakePulse
// Runs ONLY on client side

import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Memo,
  Operation,
  SorobanRpc,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';

const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || '';
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '';

const RPC_URL =
  NETWORK === 'mainnet'
    ? 'https://soroban-rpc.stellar.org'
    : 'https://soroban-testnet.stellar.org';

const NETWORK_PASSPHRASE =
  NETWORK === 'mainnet'
    ? Networks.PUBLIC
    : Networks.TESTNET;

export function getRpcServer() {
  return new SorobanRpc.Server(RPC_URL, { allowHttp: false });
}

export function getContractId() {
  return CONTRACT_ID;
}

export function getTokenAddress() {
  return TOKEN_ADDRESS;
}

export function getNetworkPassphrase() {
  return NETWORK_PASSPHRASE;
}

// ── Safe parse i128 from ScVal ────────────────────────────────
export function parseI128(val: any): number {
  if (!val) return 0;
  try {
    const native = scValToNative(val);
    if (typeof native === 'bigint') return Number(native);
    if (typeof native === 'number') return native;
    return 0;
  } catch {
    return 0;
  }
}

// ── Build + simulate + sign + submit ──────────────────────────
export async function invokeContract(
  functionName: string,
  args: xdr.ScVal[],
  sourceAddress: string,
  signTransaction: (xdr: string, opts?: any) => Promise<string>,
): Promise<{ hash: string; result?: any }> {

  const server = getRpcServer();
  const account = await server.getAccount(sourceAddress);

  const contract = new Contract(CONTRACT_ID);
  const op = contract.call(functionName, ...args);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  let assembled;

  try {
    const simResult = await server.simulateTransaction(tx);

    if (!SorobanRpc.Api.isSimulationError(simResult)) {
      assembled = SorobanRpc.assembleTransaction(tx, simResult).build();
    } else {
      assembled = tx;
    }
  } catch {
    assembled = tx;
  }

  const signedXdr = await signTransaction(assembled.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const submitResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE),
  );

  if (submitResult.status === 'ERROR') {
    throw new Error(`Submit failed`);
  }

  return { hash: submitResult.hash };
}



// ── Read-only call ────────────────────────────────────────────
export async function readContract(
  functionName: string,
  args: xdr.ScVal[],
  sourceAddress: string,
): Promise<any> {

  const server = getRpcServer();
  const account = await server.getAccount(sourceAddress);

  const contract = new Contract(CONTRACT_ID);
  const op = contract.call(functionName, ...args);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  try {
    const simResult = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error("Read simulation failed");
    }

    if (simResult.result?.retval) {
      try {
        return scValToNative(simResult.result.retval);
      } catch {
        return simResult.result.retval;
      }
    }

    return null;
  } catch (e) {
    console.warn("Read error:", e);
    return null;
  }
}



// ── ScVal helpers ─────────────────────────────────────────────
export function addressArg(addr: string): xdr.ScVal {
  return nativeToScVal(addr, { type: 'address' });
}

export function u64Arg(val: number): xdr.ScVal {
  return nativeToScVal(BigInt(val), { type: 'u64' });
}

export function u32Arg(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: 'u32' });
}

export function i128Arg(val: number): xdr.ScVal {
  return nativeToScVal(BigInt(val), { type: 'i128' });
}

export function stringArg(val: string): xdr.ScVal {
  return nativeToScVal(val, { type: 'string' });
}

export function vecArg(vals: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(vals);
}

// ── Friendbot ─────────────────────────────────────────────────
export async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(
    `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`,
  );
  if (!res.ok) throw new Error('Friendbot funding failed');
}

// ── Format address ────────────────────────────────────────────
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Format lumens (stroops → XLM) ────────────────────────────
export function fromStroops(stroops: number): number {
  return stroops / 10_000_000;
}

export function toStroops(xlm: number): number {
  return Math.floor(xlm * 10_000_000);
}
