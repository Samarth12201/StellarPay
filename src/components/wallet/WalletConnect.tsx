import { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { WalletError } from '../../errors/WalletError';
import toast from 'react-hot-toast';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_INSTALLED: '🔌 No wallet found. Install Freighter, Lobstr, or xBull.',
  USER_REJECTED: '❌ Connection cancelled.',
  WRONG_NETWORK: '🌐 Please switch your wallet to Stellar Testnet.',
  LOCKED: '🔒 Wallet is locked. Please unlock it.',
};

export function WalletConnect() {
  const [loading, setLoading] = useState(false);
  const { openModal } = useWallet();

  const handleConnect = async () => {
    setLoading(true);
    try {
      await openModal();
      toast.success('Wallet connected!');
    } catch (err) {
      if (err instanceof WalletError) {
        toast.error(ERROR_MESSAGES[err.code] ?? err.message);
      } else {
        toast.error('Connection failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
