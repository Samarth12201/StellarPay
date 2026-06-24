import { useState } from 'react';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { nanoid } from 'nanoid';
import { useWalletStore } from '../../store/walletStore';

interface MemberInput {
  id: string;
  name: string;
  address: string;
}

export function CreateGroup() {
  const { address } = useWalletStore();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<MemberInput[]>([
    { id: nanoid(), name: '', address: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const { createGroup } = useGroupStore();
  const navigate = useNavigate();

  const updateMember = (id: string, field: keyof MemberInput, value: string) =>
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  const removeMember = (id: string) =>
    setMembers((ms) => ms.filter((m) => m.id !== id));

  const validateAddress = (addr: string) =>
    addr.startsWith('G') && addr.length === 56;

  const isValid =
    name.trim().length > 0 &&
    members.length >= 1 &&
    members.every((m) => m.name.trim() && validateAddress(m.address));

  const handleCreate = async () => {
    if (!isValid || !address) return;
    setLoading(true);
    try {
      const groupId = createGroup(
        name.trim(),
        [
          { name: 'You', address }, // automatically add the creator
          ...members.map((m) => ({ name: m.name.trim(), address: m.address.trim() }))
        ]
      );
      toast.success(`Group "${name}" created!`);
      navigate(`/dashboard/${groupId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-semibold mb-1.5">Group name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Goa Trip 2025"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-semibold">Members</label>
          <span className="text-xs text-gray-500">You are automatically added</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Each member needs their Stellar testnet address (G...) so payments work.
        </p>

        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={m.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: ['#7C3AED','#059669','#D97706','#DC2626'][i % 4] }}
                >
                  {m.name ? m.name[0].toUpperCase() : (i + 1)}
                </div>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateMember(m.id, 'name', e.target.value)}
                  placeholder={`Person ${i + 1} name`}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                {members.length > 1 && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={m.address}
                onChange={(e) => updateMember(m.id, 'address', e.target.value)}
                placeholder="G... (Stellar public key, 56 chars)"
                className={`w-full border rounded-lg px-3 py-2 text-xs font-mono ${
                  m.address && !validateAddress(m.address)
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
              />
              {m.address && !validateAddress(m.address) && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Must be a valid Stellar address starting with G (56 characters)
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setMembers((ms) => [...ms, { id: nanoid(), name: '', address: '' }])}
          className="mt-3 w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add member
        </button>
      </div>

      <button
        onClick={handleCreate}
        disabled={!isValid || loading}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-40"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Create group
      </button>
    </div>
  );
}
