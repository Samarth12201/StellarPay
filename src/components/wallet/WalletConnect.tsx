import { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { WalletError } from '../../errors/WalletError';
import toast from 'react-hot-toast';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_INSTALLED: '🔌 No wallet found. Install Freighter, Lobstr, or xBull.',
  NOT_CONNECTED: '🔌 Could not connect. Make sure Freighter is unlocked.',
  USER_REJECTED: '❌ Connection cancelled.',
  WRONG_NETWORK: '🌐 Please switch your wallet to Stellar Testnet.',
  LOCKED: '🔒 Wallet is locked. Please unlock it.',
};

export function WalletConnect({ label, className }: { label?: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { openModal, connectFreighter } = useWallet();

  const handleFreighter = async () => {
    setLoading(true);
    setShowOptions(false);
    try {
      await connectFreighter();
      toast.success('Freighter connected!');
    } catch (err) {
      if (err instanceof WalletError) {
        toast.error(ERROR_MESSAGES[err.code] ?? err.message);
      } else {
        toast.error('Freighter connection failed. Is it installed & unlocked?');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtherWallets = async () => {
    setLoading(true);
    setShowOptions(false);
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

  if (loading) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-medium opacity-60 ${className || ''}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Connecting...
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={`flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all ${className || ''}`}
      >
        <Wallet className="w-4 h-4" />
        {label || 'Connect Wallet'}
      </button>

      {showOptions && (
        <>
          {/* Backdrop to close menu */}
          <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden min-w-[220px]">
            <button
              onClick={handleFreighter}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 text-left text-sm font-medium text-gray-800 transition-colors"
            >
              <img
                src="https://stellar.creit.tech/wallet-icons/freighter.png"
                alt="Freighter"
                className="w-6 h-6 rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              Freighter
            </button>
            <div className="border-t border-gray-100" />
            <button
              onClick={handleOtherWallets}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 text-left text-sm font-medium text-gray-800 transition-colors"
            >
              <Wallet className="w-5 h-5 text-violet-500" />
              Other Wallets...
            </button>
          </div>
        </>
      )}
    </div>
  );
}
