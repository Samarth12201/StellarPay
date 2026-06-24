import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import { useWalletStore } from '../../store/walletStore';
import toast from 'react-hot-toast';

interface Props {
  groupId: string;
  onDone?: () => void;
}

export function AddExpense({ groupId, onDone }: Props) {
  const { getGroup, addExpense } = useGroupStore();
  const { address } = useWalletStore();
  const group = getGroup(groupId);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState<string>('');
  const [splitAmong, setSplitAmong] = useState<string[]>([]);

  if (!group) return null;

  // Default paidBy to connected wallet's member if possible
  const defaultPaidById =
    group.members.find((m) => m.address === address)?.id ?? group.members[0]?.id ?? '';
  const activePaidById = paidById || defaultPaidById;

  // Default splitAmong to all members
  const activeSplitAmong =
    splitAmong.length > 0 ? splitAmong : group.members.map((m) => m.id);

  const toggleSplitMember = (memberId: string) => {
    setSplitAmong((prev) => {
      const next = prev.length === 0
        ? group.members.map((m) => m.id).filter((id) => id !== memberId)
        : prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      return next.length === 0 ? [memberId] : next; // can't remove all
    });
  };

  const amountNum = parseFloat(amount);
  const sharePerPerson =
    activeSplitAmong.length > 0 && !isNaN(amountNum)
      ? (amountNum / activeSplitAmong.length).toFixed(7)
      : '0';

  const isValid =
    description.trim().length > 0 &&
    !isNaN(amountNum) &&
    amountNum > 0 &&
    activeSplitAmong.length > 0;

  const handleAdd = async () => {
    if (!isValid) {
      toast.error('Enter a description and valid amount');
      return;
    }
    await addExpense(groupId, {
      description: description.trim(),
      totalAmount: amountNum,
      paidBy: activePaidById,
      splitAmong: activeSplitAmong,
    });
    toast.success('Expense added!');
    setDescription('');
    setAmount('');
    setSplitAmong([]);
    onDone?.();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Hotel, Dinner, Uber"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (XLM)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.0000001"
          step="0.01"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Paid by</label>
        <div className="flex flex-wrap gap-2">
          {group.members.map((m) => (
            <button
              key={m.id}
              onClick={() => setPaidById(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all ${
                activePaidById === m.id
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: m.avatarColor }}
              >
                {m.name[0]?.toUpperCase()}
              </div>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Split among
          {activeSplitAmong.length > 0 && amount && !isNaN(amountNum) && (
            <span className="ml-2 text-violet-500 font-normal">
              ({sharePerPerson} XLM each)
            </span>
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          {group.members.map((m) => {
            const selected = activeSplitAmong.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleSplitMember(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all ${
                  selected
                    ? 'bg-violet-50 text-violet-700 border-violet-300'
                    : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: m.avatarColor, opacity: selected ? 1 : 0.4 }}
                >
                  {m.name[0]?.toUpperCase()}
                </div>
                {m.name}
                {selected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleAdd}
        disabled={!isValid}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-40 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Expense
      </button>
    </div>
  );
}
