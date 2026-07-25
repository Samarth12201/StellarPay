import { useState, useEffect } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useWalletStore } from '../store/walletStore';
import { useUSDCBalance } from '../hooks/useUSDCBalance';
import { useFXRates, xlmToFiat } from '../hooks/useFXRates';
import { CURRENCIES } from '../constants/assets';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export function Profile() {
  const navigate = useNavigate();
  const { address, balance } = useWalletStore();
  const { profile, saveProfile } = useProfile();
  const { balance: usdcBalance } = useUSDCBalance(address);
  const { rates } = useFXRates();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setCurrency(profile.preferred_currency);
    }
  }, [profile]);

  const xlmFiat = xlmToFiat(parseFloat(balance ?? '0'), currency, rates);

  const copyAddress = () => {
    navigator.clipboard.writeText(address ?? '');
    toast.success('Address copied!');
  };

  const handleSave = async () => {
    await saveProfile({ username: username.trim(), preferred_currency: currency });
    setEditing(false);
    toast.success('Profile updated!');
  };

  return (
    <div className="w-full max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 sm:p-5 min-w-0">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
          style={{ background: profile?.avatar_color ?? '#7C3AED' }}
        >
          {(profile?.username ?? address ?? '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-gray-900">{profile?.username ?? 'Unnamed'}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs font-mono text-gray-400 truncate max-w-[180px]">
              {address?.slice(0, 12)}…{address?.slice(-4)}
            </p>
            <button onClick={copyAddress} className="text-gray-400 hover:text-gray-600">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a
              href={`https://stellar.expert/explorer/testnet/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-violet-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
          <p className="text-xs text-violet-500 font-semibold">XLM Balance</p>
          <p className="text-xl font-bold text-violet-800 mt-0.5">{parseFloat(balance ?? '0').toFixed(2)}</p>
          <p className="text-xs text-violet-400 mt-0.5">{xlmFiat}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-500 font-semibold">USDC Balance</p>
          <p className="text-xl font-bold text-green-800 mt-0.5">
            {usdcBalance ? parseFloat(usdcBalance).toFixed(2) : '—'}
          </p>
          <p className="text-xs text-green-400 mt-0.5">Circle USDC</p>
        </div>
      </div>

      {/* Edit profile */}
      {!editing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Preferred currency</p>
            <span className="text-sm text-gray-500">
              {CURRENCIES.find((c) => c.code === profile?.preferred_currency)?.flag}{' '}
              {profile?.preferred_currency ?? 'USD'}
            </span>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="w-full border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Edit profile
          </button>
        </div>
      ) : (
        <div className="space-y-4 border border-violet-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-800">Edit profile</p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display name</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Preferred currency</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  type="button"
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border text-xs font-medium transition-all ${
                    currency === c.code ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span>{c.code}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
