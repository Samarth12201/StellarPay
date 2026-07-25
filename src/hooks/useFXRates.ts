import { useQuery } from '@tanstack/react-query';

interface FXRates {
  usd: number; inr: number; mxn: number;
  php: number; eur: number; gbp: number;
}

async function fetchRates(): Promise<FXRates> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd,inr,mxn,php,eur,gbp'
  );
  const data = await res.json();
  return data.stellar as FXRates;
}

export function useFXRates() {
  const { data, isLoading } = useQuery({
    queryKey: ['fx-rates'],
    queryFn: fetchRates,
    refetchInterval: 60_000,      // refresh every 60 seconds
    staleTime: 55_000,
    retry: 3,
    initialData: { usd: 0.12, inr: 10.0, mxn: 2.1, php: 6.8, eur: 0.11, gbp: 0.09 },
  });
  return { rates: data, isLoading };
}

// Convert XLM amount to local fiat string
export function xlmToFiat(
  xlmAmount: number,
  currency: string,
  rates: FXRates | undefined
): string {
  if (!rates) return '';
  const rate = rates[currency.toLowerCase() as keyof FXRates] ?? 0;
  const fiat = xlmAmount * rate;
  const symbols: Record<string, string> = {
    USD: '$', INR: '₹', MXN: 'MX$', PHP: '₱', EUR: '€', GBP: '£',
  };
  return `≈ ${symbols[currency] ?? ''}${fiat.toFixed(2)} ${currency}`;
}
