import { Horizon, StrKey } from '@stellar/stellar-sdk';

export const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
export const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
export const server = new Horizon.Server(HORIZON_URL);

export function truncateAddress(address: string, chars = 6) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatXlm(balance?: string | null) {
  const amount = Number.parseFloat(balance || '0');
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function isValidStellarAddress(address: string) {
  return StrKey.isValidEd25519PublicKey(address);
}

export function paymentUrl(address: string | null, amount = '', memo = '') {
  const params = new URLSearchParams();
  if (address) params.set('address', address);
  if (amount) params.set('amount', amount);
  if (memo) params.set('memo', memo);
  return `${APP_URL}/pay?${params.toString()}`;
}
