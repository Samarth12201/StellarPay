import { useState } from 'react';
import { Asset, BASE_FEE, Memo, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { useWalletStore } from '../store/walletStore';
import { useWallet } from './useWallet';
import { server, isValidStellarAddress } from '../utils';
import type { TransactionResult } from '../types';

export function getFreighterError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String(error.message);
  return fallback;
}

export function useSendPayment() {
  const { address } = useWalletStore();
  const { signXdr } = useWallet();
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendPayment = async (to: string, amount: string, memo?: string) => {
    if (!address) throw new Error('Connect Freighter first.');
    if (!isValidStellarAddress(to)) throw new Error('Recipient must be a valid Stellar public key.');

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const source = await server.loadAccount(address);
      let builder = new TransactionBuilder(source, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      }).addOperation(Operation.payment({ destination: to, asset: Asset.native(), amount })).setTimeout(180);

      if (memo) builder = builder.addMemo(Memo.text(memo.slice(0, 28)));
      const transaction = builder.build();
      const signedXdr = await signXdr(transaction.toXDR());

      const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      const response = await server.submitTransaction(signedTx);
      const tx = { hash: response.hash, to, amount, memo, status: 'success' as const, timestamp: new Date() };
      setResult(tx);
      return tx;
    } catch (error) {
      const message = getFreighterError(error, 'Transaction failed.');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { sendPayment, result, loading, error, reset: () => { setResult(null); setError(null); } };
}
