import { useState } from 'react';
import { X } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';

interface Props {
  onClose: () => void;
  onCreate: (name: string, members: any[]) => void;
}

export function CreateGroupModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const { address } = useWalletStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // For demo purposes, we automatically add the current user and dummy users
    const members = [
      { name: 'You', address: address || 'G...', avatarColor: '#7C3AED' },
      { name: 'Alice', address: 'GALICE...DEMO', avatarColor: '#059669' },
      { name: 'Bob', address: 'GBOB...DEMO', avatarColor: '#D97706' },
    ];

    onCreate(name, members);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Create New Group</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
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
            
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
              <p className="text-xs text-violet-800 leading-relaxed">
                <strong>Demo Mode:</strong> Creating a group will automatically add you, Alice, and Bob to demonstrate the settlement algorithm.
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
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
