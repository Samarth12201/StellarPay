import { useState } from 'react';
import { useGroupStore } from '../../store/groupStore';
import { useWalletStore } from '../../store/walletStore';
import { Calculator, Check } from 'lucide-react';
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
  const [paidBy, setPaidBy] = useState<string>(''); // member.id
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');

  if (!group) return null;

  // Default paidBy to connected wallet's member
  const defaultPaidBy =
    group.members.find((m) => m.address === address)?.id ?? group.members[0]?.id ?? '';

  const activePaidBy = paidBy || defaultPaidBy;
  const activeSplitAmong = splitAmong.length > 0 ? splitAmong : group.members.map((m) => m.id);

  const toggleMember = (memberId: string) => {
    setSplitAmong((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleAdd = () => {
    const amtNum = parseFloat(amount);
    if (!description.trim() || isNaN(amtNum) || amtNum <= 0) {
      toast.error('Fill in description and a valid amount.');
      return;
    }
    if (activeSplitAmong.length === 0) {
      toast.error('Select at least one person to split with.');
      return;
    }

    addExpense(groupId, {
      description: description.trim(),
      totalAmount: amtNum,
      paidBy: activePaidBy,
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
        <label className="block text-sm font-semibold mb-1.5">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Hotel, Dinner, Uber"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5">Amount (XLM)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.0000001"
          step="0.01"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5">Paid by</label>
        <div className="flex flex-wrap gap-2">
          {group.members.map((m) => (
            <button
              key={m.id}
              onClick={() => setPaidBy(m.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                activePaidBy === m.id
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: m.avatarColor }}
              >
                {m.name[0].toUpperCase()}
              </div>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5">Split among</label>
        <div className="flex flex-wrap gap-2">
          {group.members.map((m) => {
            const selected = activeSplitAmong.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMember(m.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                  selected
                    ? 'bg-violet-50 text-violet-700 border-violet-300'
                    : 'border-gray-300 text-gray-400 hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: m.avatarColor, opacity: selected ? 1 : 0.4 }}
                >
                  {m.name[0].toUpperCase()}
                </div>
                {m.name}
                {selected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
        {activeSplitAmong.length > 0 && amount && (
          <p className="text-xs text-gray-400 mt-2">
            {(parseFloat(amount) / activeSplitAmong.length).toFixed(7)} XLM each
          </p>
        )}
      </div>

      <button
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-xl font-semibold hover:bg-violet-700"
      >
        <Calculator className="w-4 h-4" />
        Add expense
      </button>
    </div>
  );
}
