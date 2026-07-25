import { useFXRates, xlmToFiat } from '../../hooks/useFXRates';
import { useProfile } from '../../hooks/useProfile';

interface Props {
  xlmAmount: number;
  className?: string;
}

export function FXBadge({ xlmAmount, className = '' }: Props) {
  const { rates } = useFXRates();
  const { profile } = useProfile();
  const currency = profile?.preferred_currency ?? 'USD';
  const fiatStr = xlmToFiat(xlmAmount, currency, rates);

  if (!fiatStr) return null;

  return (
    <span className={`text-xs text-gray-400 font-medium ${className}`}>
      {fiatStr}
    </span>
  );
}
