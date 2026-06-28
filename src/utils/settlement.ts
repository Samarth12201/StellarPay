import { Settlement, Expense, GroupMember } from '../types';

export function calculateSettlements(
  expenses: Expense[],
  members: GroupMember[]
): Settlement[] {
  if (expenses.length === 0 || members.length === 0) return [];

  // Net balance keyed by member.id
  // Positive = creditor (owed money), Negative = debtor (owes money)
  const net: Record<string, number> = {};
  members.forEach((m) => (net[m.id] = 0));

  for (const expense of expenses) {
    if (!expense.splitAmong || expense.splitAmong.length === 0) continue;
    const share = expense.totalAmount / expense.splitAmong.length;
    net[expense.paidBy] = (net[expense.paidBy] ?? 0) + expense.totalAmount;
    for (const memberId of expense.splitAmong) {
      net[memberId] = (net[memberId] ?? 0) - share;
    }
  }

  const creditors: { id: string; amount: number }[] = [];
  const debtors:   { id: string; amount: number }[] = [];

  for (const [id, balance] of Object.entries(net)) {
    const r = Math.round(balance * 1e7) / 1e7;
    if (r >  0.0000001) creditors.push({ id, amount:  r });
    if (r < -0.0000001) debtors  .push({ id, amount: -r });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors  .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.round(
      Math.min(creditors[ci].amount, debtors[di].amount) * 1e7
    ) / 1e7;

    if (amount > 0.0000001) {
      const toMember   = members.find((m) => m.id === creditors[ci].id)!;
      const fromMember = members.find((m) => m.id === debtors[di].id)!;
      settlements.push({
        from: debtors[di].id,
        to:   creditors[ci].id,
        fromAddress: fromMember.address,
        toAddress:   toMember.address,
        fromName:    fromMember.name,
        toName:      toMember.name,
        amount,
      });
    }

    creditors[ci].amount -= amount;
    debtors  [di].amount -= amount;
    if (creditors[ci].amount <= 0.0000001) ci++;
    if (debtors  [di].amount <= 0.0000001) di++;
  }

  return settlements;
}

export function totalSpent(expenses: Expense[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.totalAmount, 0) * 100) / 100;
}

export function memberBalances(
  members: GroupMember[],
  expenses: Expense[]
): Record<string, { paid: number; owed: number; net: number }> {
  const r: Record<string, { paid: number; owed: number; net: number }> = {};
  members.forEach((m) => (r[m.id] = { paid: 0, owed: 0, net: 0 }));
  for (const e of expenses) {
    if (r[e.paidBy]) r[e.paidBy].paid += e.totalAmount;
    const share = e.totalAmount / e.splitAmong.length;
    e.splitAmong.forEach((id) => { if (r[id]) r[id].owed += share; });
  }
  Object.keys(r).forEach((id) => {
    r[id].paid = Math.round(r[id].paid * 100) / 100;
    r[id].owed = Math.round(r[id].owed * 100) / 100;
    r[id].net  = Math.round((r[id].paid - r[id].owed) * 100) / 100;
  });
  return r;
}
