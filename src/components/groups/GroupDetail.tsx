import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Receipt, Send, Bell } from 'lucide-react';
import { useGroupSettlement } from '../../hooks/useGroupSettlement';
import { useWalletStore } from '../../store/walletStore';
import { SettlementView } from './SettlementView';
import { AddExpense } from './AddExpense';
import { Settlement } from '../../types';
import toast from 'react-hot-toast';

type Tab = 'expenses' | 'settle' | 'members';

export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { address } = useWalletStore();
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);

  const {
    group,
    settlements,
    myBalance,
    total,
    paying,
    paySettlement,
    sendPaymentRequest,
    sendAllPaymentRequests,
  } = useGroupSettlement(groupId!);

  if (!group) {
    return (
      <div className="p-6 text-center text-gray-400">
        Group not found.
        <button onClick={() => navigate('/dashboard')} className="ml-2 text-violet-600 hover:underline">
          Back to groups
        </button>
      </div>
    );
  }

  const handleRequestAll = () => {
    const count = sendAllPaymentRequests();
    if (count === 0) {
      toast('No outstanding amounts to request. All settled!');
    } else {
      toast.success(
        `${count} payment request${count !== 1 ? 's' : ''} sent! ` +
        `Members will see them when they connect their wallet.`
      );
    }
  };

  const unsettledCount = settlements.length;
  const myOutgoing = settlements.filter((s) => s.fromAddress === address);
  const myIncoming = settlements.filter((s) => s.toAddress === address);

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-400">
            {group.members.length} members · {group.expenses.length} expenses
          </p>
        </div>
        <button
          onClick={() => setShowAddExpense(true)}
          className="flex items-center gap-1.5 bg-violet-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700"
        >
          <Plus className="w-4 h-4" /> Add expense
        </button>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Total</p>
          <p className="text-base font-bold text-gray-900">{total} XLM</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${
          myBalance.net > 0 ? 'bg-green-50' : myBalance.net < 0 ? 'bg-red-50' : 'bg-gray-50'
        }`}>
          <p className="text-xs text-gray-500 mb-0.5">Your balance</p>
          <p className={`text-base font-bold ${
            myBalance.net > 0 ? 'text-green-700' : myBalance.net < 0 ? 'text-red-600' : 'text-gray-700'
          }`}>
            {myBalance.net > 0 ? '+' : ''}{myBalance.net} XLM
          </p>
        </div>
        <div className="bg-violet-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-0.5">To settle</p>
          <p className="text-base font-bold text-violet-700">{unsettledCount} tx</p>
        </div>
      </div>

      {/* My obligations callout */}
      {myOutgoing.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-800">
            You owe {myOutgoing.length} payment{myOutgoing.length !== 1 ? 's' : ''} totalling{' '}
            {myOutgoing.reduce((s, t) => s + t.amount, 0).toFixed(2)} XLM
          </p>
          <p className="text-xs text-red-600 mt-0.5">Go to Settle Up tab to pay</p>
        </div>
      )}

      {myIncoming.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-violet-800">
              You are owed {myIncoming.reduce((s, t) => s + t.amount, 0).toFixed(2)} XLM
            </p>
            <p className="text-xs text-violet-600 mt-0.5">from {myIncoming.length} people</p>
          </div>
          <button
            onClick={handleRequestAll}
            className="flex-shrink-0 bg-white border border-violet-200 text-violet-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-violet-100"
          >
            Request All
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
        {([
          { id: 'expenses', label: 'Expenses', icon: Receipt },
          { id: 'settle',   label: 'Settle up', icon: Send },
          { id: 'members',  label: 'Members', icon: Users },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === id ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Expenses tab */}
      {tab === 'expenses' && (
        <div className="space-y-2">
          {showAddExpense && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <AddExpense groupId={group.id} onDone={() => setShowAddExpense(false)} />
            </div>
          )}
          {group.expenses.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No expenses yet. Add one!</p>
            </div>
          ) : (
            group.expenses.map((e) => {
              const payer = group.members.find((m) => m.id === e.paidBy);
              const share = e.totalAmount / e.splitAmong.length;
              return (
                <div key={e.id} className="border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: payer?.avatarColor ?? '#7C3AED' }}
                  >
                    {payer?.name[0].toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{e.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Paid by {payer?.name ?? 'unknown'} · split {e.splitAmong.length} ways ({share.toFixed(2)} XLM each)
                    </p>
                    {e.settled && (
                      <p className="text-xs text-green-600 mt-0.5">✓ Settled on-chain</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900">{e.totalAmount} XLM</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Settle tab — THE FIXED PART */}
      {tab === 'settle' && (
        <div className="space-y-4">
          {settlements.length > 0 && (
            <button
              onClick={handleRequestAll}
              className="w-full flex items-center justify-center gap-2 border border-violet-200 text-violet-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-50"
            >
              <Bell className="w-4 h-4" />
              Send all payment requests to group
            </button>
          )}
          <SettlementView
            settlements={settlements}
            myAddress={address ?? ''}
            onPay={paySettlement}
            onRequest={sendPaymentRequest}
            paying={paying}
          />
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div className="space-y-2">
          {group.members.map((m) => {
            const bal = myBalance; // simplified — you can call memberBalance per member
            return (
              <div key={m.id} className="flex items-center gap-3 border border-gray-200 rounded-xl p-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ background: m.avatarColor }}
                >
                  {m.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                  <p className="text-xs font-mono text-gray-400 truncate">
                    {m.address.slice(0, 12)}...{m.address.slice(-4)}
                  </p>
                </div>
                {m.address === address && (
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">you</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
