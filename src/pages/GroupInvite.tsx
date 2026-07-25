import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useInviteLink } from '../hooks/useInviteLink';
import { useWalletStore } from '../store/walletStore';
import { WalletConnect } from '../components/wallet/WalletConnect';
import { Loader2, Users } from 'lucide-react';

export function GroupInvite() {
  const { code } = useParams<{ code: string }>();
  const { address } = useWalletStore();
  const { acceptInvite } = useInviteLink();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase
      .from('group_invitations')
      .select('*, groups(*)')
      .eq('invite_code', code)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInvite(data);
          setGroup(data.groups);
        }
        setLoading(false);
      });
  }, [code]);

  const handleJoin = async () => {
    if (!address || !name.trim() || !code) return;
    setJoining(true);
    try {
      const groupId = await acceptInvite(code, name.trim(), address);
      navigate(`/dashboard/${groupId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-lg p-6 space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">You're invited!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Join <span className="font-semibold text-gray-800">{group?.name ?? 'a group'}</span> on StellarPay
          </p>
        </div>

        {!address ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-500">
              Connect your Stellar wallet to join and pay your share of group expenses.
            </p>
            <WalletConnect />
            <p className="text-xs text-gray-400">
              Don't have a wallet? Install{' '}
              <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">
                Freighter
              </a>{' '}
              — it takes 2 minutes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Your display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aman, Priya"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!name.trim() || joining}
              className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-40"
            >
              {joining ? 'Joining...' : `Join ${group?.name ?? 'group'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
