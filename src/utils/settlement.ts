import { Settlement, Expense, GroupMember } from '../types';

export function calculateSettlements(
  expenses: Expense[],
  members: GroupMember[]
): Settlement[] {
  // Build net balance keyed by member ID
  const net: Record<string, number> = {};
  members.forEach((m) => (net[m.id] = 0));

  for (const expense of expenses) {
    if (expense.splitAmong.length === 0) continue;
    const share = expense.totalAmount / expense.splitAmong.length;

    // Payer receives credit
    net[expense.paidBy] = (net[expense.paidBy] ?? 0) + expense.totalAmount;

    // Each participant is debited their share
    for (const memberId of expense.splitAmong) {
      net[memberId] = (net[memberId] ?? 0) - share;
    }
  }

  // Split into creditors (net > 0) and debtors (net < 0)
  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of Object.entries(net)) {
    const r = Math.round(balance * 1e7) / 1e7; // 7 decimal places (stroops precision)
    if (r > 0.0000001) creditors.push({ id, amount: r });
    else if (r < -0.0000001) debtors.push({ id, amount: -r });
  }

  // Sort largest first for greedy min-tx matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.0000001) {
      const fromMember = members.find((m) => m.id === debtor.id)!;
      const toMember   = members.find((m) => m.id === creditor.id)!;

      settlements.push({
        from: debtor.id,
        to: creditor.id,
        fromAddress: fromMember.address,
        toAddress: toMember.address,
        fromName: fromMember.name,
        toName: toMember.name,
        amount: Math.round(amount * 1e7) / 1e7,
        paid: false,
      });
    }

    creditor.amount -= amount;
    debtor.amount   -= amount;

    if (creditor.amount <= 0.0000001) ci++;
    if (debtor.amount   <= 0.0000001) di++;
  }

  return settlements;
}

export function totalSpent(expenses: Expense[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.totalAmount, 0) * 100) / 100;
}

export function memberBalance(
  memberId: string,
  expenses: Expense[]
): { paid: number; owed: number; net: number } {
  let paid = 0, owed = 0;
  for (const e of expenses) {
    if (e.paidBy === memberId) paid += e.totalAmount;
    if (e.splitAmong.includes(memberId)) owed += e.totalAmount / e.splitAmong.length;
  }
  return {
    paid: Math.round(paid * 100) / 100,
    owed: Math.round(owed * 100) / 100,
    net:  Math.round((paid - owed) * 100) / 100,
  };
}
