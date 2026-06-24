import { useState } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, Info } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import { useWalletStore } from '../../store/walletStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { nanoid } from 'nanoid';

interface MemberRow {
  _key: string;
  name: string;
  address: string;
}

function isValidStellarAddress(addr: string): boolean {
  return addr.startsWith('G') && addr.length === 56;
}

export function CreateGroup() {
  const navigate = useNavigate();
  const { address: myAddress } = useWalletStore();
  const { createGroup } = useGroupStore();

  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<MemberRow[]>([
    { _key: nanoid(), name: 'Me', address: myAddress ?? '' },
    { _key: nanoid(), name: '', address: '' },
  ]);
  const [loading, setLoading] = useState(false);

  const updateMember = (_key: string, field: 'name' | 'address', value: string) =>
    setMembers((ms) => ms.map((m) => (m._key === _key ? { ...m, [field]: value } : m)));

  const removeMember = (_key: string) =>
    setMembers((ms) => (ms.length > 2 ? ms.filter((m) => m._key !== _key) : ms));

  const addMember = () =>
    setMembers((ms) => [...ms, { _key: nanoid(), name: '', address: '' }]);

  const isFormValid =
    groupName.trim().length > 0 &&
    members.length >= 2 &&
    members.every((m) => m.name.trim().length > 0 && isValidStellarAddress(m.address));

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      const groupId = createGroup(
        groupName.trim(),
        members.map((m) => ({ name: m.name.trim(), address: m.address.trim() }))
      );
      toast.success(`Group "${groupName}" created!`);
      navigate(`/dashboard/${groupId}`); // Ensure we stay in dashboard
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const AVATAR_COLORS = ['#7C3AED', '#059669', '#D97706', '#DC2626', '#2563EB', '#DB2777'];

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Group name</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="e.g. Goa Trip 2025"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Members</label>
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 mb-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Every member needs their Stellar public key (G..., 56 characters). This is required for payments to work. They can find it in their Freighter or Lobstr wallet.
          </p>
        </div>

        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={m._key} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {m.name ? m.name[0].toUpperCase() : (i + 1)}
                </div>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateMember(m._key, 'name', e.target.value)}
                  placeholder={`Person ${i + 1} name`}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400"
                />
                <button
                  onClick={() => removeMember(m._key)}
                  disabled={members.length <= 2}
                  className="text-gray-300 hover:text-red-400 disabled:opacity-20 p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={m.address}
                onChange={(e) => updateMember(m._key, 'address', e.target.value)}
                placeholder="G... Stellar public key (56 characters)"
                className={`w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-colors ${
                  m.address.length > 0 && !isValidStellarAddress(m.address)
                    ? 'border-red-300 bg-red-50 focus:border-red-400'
                    : m.address.length === 56
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 focus:border-violet-400'
                }`}
              />

              {m.address.length > 0 && !isValidStellarAddress(m.address) && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {m.address.startsWith('G')
                    ? `${56 - m.address.length} more characters needed`
                    : 'Stellar addresses start with G'}
                </p>
              )}
              {isValidStellarAddress(m.address) && (
                <p className="text-xs text-green-600">✓ Valid Stellar address</p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addMember}
          className="mt-3 w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:border-violet-300 hover:text-violet-500 flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add another member
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isFormValid || loading}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
        ) : (
          'Create Group'
        )}
      </button>

      {!isFormValid && groupName.trim().length > 0 && (
        <p className="text-xs text-center text-gray-400">
          All members need a name and valid Stellar address to create the group.
        </p>
      )}
    </div>
  );
}
