import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { isValidStellarAddress } from '../../utils';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  onCreate: (name: string, members: any[]) => void;
}

const COLORS = ['#7C3AED', '#059669', '#D97706', '#DB2777', '#2563EB', '#DC2626'];

export function CreateGroupModal({ onClose, onCreate }: Props) {
  const { address } = useWalletStore();
  const [name, setName] = useState('');
  const [participants, setParticipants] = useState([
    { id: '1', name: '', address: '' }
  ]);

  const addParticipant = () => {
    setParticipants([...participants, { id: Math.random().toString(), name: '', address: '' }]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const updateParticipant = (id: string, field: 'name' | 'address', value: string) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }

    const validParticipants = participants.filter(p => p.name.trim() && p.address.trim());
    if (validParticipants.length === 0) {
      toast.error('Add at least one member with a name and Stellar address');
      return;
    }

    const invalid = validParticipants.find(p => !isValidStellarAddress(p.address));
    if (invalid) {
      toast.error(`Invalid Stellar address for ${invalid.name}`);
      return;
    }

    const members = [
      { name: 'You', address: address || 'G...', avatarColor: COLORS[0] },
      ...validParticipants.map((p, i) => ({
        name: p.name,
        address: p.address,
        avatarColor: COLORS[(i + 1) % COLORS.length]
      }))
    ];

    onCreate(name, members);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Create New Group</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend Trip, Roommates"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Group Members</label>
                <span className="text-xs text-gray-500">You are automatically added</span>
              </div>
              
              <div className="space-y-3">
                {participants.map((p, index) => (
                  <div key={p.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                        placeholder="Friend's Name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        required
                      />
                      <input
                        type="text"
                        value={p.address}
                        onChange={(e) => updateParticipant(p.id, 'address', e.target.value)}
                        placeholder="Stellar Address (G...)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-mono"
                        required
                      />
                    </div>
                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(p.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addParticipant}
                className="mt-3 flex items-center gap-1 text-sm text-violet-600 font-medium hover:text-violet-700 p-1"
              >
                <Plus className="w-4 h-4" /> Add another member
              </button>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
