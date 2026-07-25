import { useEffect, useState } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { USDC_TESTNET } from '../constants/assets';

const server = new Horizon.Server(import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org');

export function useUSDCBalance(address: string | null) {
  const [balance, setBalance] = useState<string | null>(null);
  const [hasTrustline, setHasTrustline] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    server.loadAccount(address)
      .then((account) => {
        const usdcBalance = account.balances.find(
          (b) =>
            b.asset_type === 'credit_alphanum4' &&
            (b as any).asset_code === USDC_TESTNET.code &&
            (b as any).asset_issuer === USDC_TESTNET.issuer
        );
        if (usdcBalance) {
          setBalance(usdcBalance.balance);
          setHasTrustline(true);
        } else {
          setBalance('0');
          setHasTrustline(false);
        }
      })
      .catch(() => { setBalance(null); })
      .finally(() => setLoading(false));
  }, [address]);

  return { balance, hasTrustline, loading };
}
