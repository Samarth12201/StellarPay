import { Group } from '../../types';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useSettlement } from '../../hooks/useSettlement';
import { SettlementView } from './SettlementView';

interface Props {
  group: Group;
  onBack: () => void;
  onAddExpense: () => void;
}

export function GroupDetail({ group, onBack, onAddExpense }: Props) {
  const { settlements, total, shares } = useSettlement(group.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">{group.name}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Spent</p>
              <p className="text-3xl font-bold text-gray-900">{total} XLM</p>
            </div>
            <button
              onClick={onAddExpense}
              className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-violet-700 transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              Add Expense
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 text-lg">Expenses</h3>
            {group.expenses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                No expenses yet. Add one to get started!
              </p>
            ) : (
              <div className="space-y-2">
                {group.expenses.map((expense) => (
                  <div key={expense.id} className="bg-white border border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-medium text-gray-900">{expense.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Paid by {group.members.find(m => m.address === expense.paidBy)?.name || expense.paidBy.slice(0, 6)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{expense.amount} XLM</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100">
            <h3 className="font-semibold text-violet-900 mb-4 text-lg">Settlements</h3>
            <SettlementView
              settlements={settlements}
              onPay={(s) => {
                alert(`Initiating payment of ${s.amount} XLM to ${s.toName}. Hook this up to Freighter!`);
              }}
              loading={false}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-lg">Balances</h3>
            <div className="space-y-3">
              {group.members.map(m => {
                const net = shares[m.address]?.net || 0;
                const isPositive = net > 0;
                return (
                  <div key={m.address} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: m.avatarColor }}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{m.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${net === 0 ? 'text-gray-400' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{net}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
