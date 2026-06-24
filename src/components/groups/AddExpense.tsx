import { useState } from 'react';
import { Group } from '../../types';
import { useGroupStore } from '../../store/groupStore';

interface Props {
  group: Group;
  onClose: () => void;
}

export function AddExpense({ group, onClose }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(group.members[0]?.address || '');

  const { addExpense } = useGroupStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !paidBy) return;

    addExpense(group.id, {
      description,
      amount: parseFloat(amount),
      paidBy,
      splitAmong: group.members.map((m) => m.address),
      date: new Date(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Expense to {group.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Dinner at Mario's"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (XLM)</label>
            <input
              type="number"
              step="0.0000001"
              required
              min="0.1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            >
              {group.members.map((m) => (
                <option key={m.address} value={m.address}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-violet-600 text-white font-medium py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
