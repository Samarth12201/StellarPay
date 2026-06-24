import { Settlement, Expense, GroupMember } from '../types';

/**
 * Calculates the minimum set of transactions to settle all group debts.
 * Uses the "net balance + greedy matching" algorithm.
 *
 * IMPORTANT: expenses use GroupMember.id for paidBy and splitAmong.
 * This function resolves addresses from the members array at the end.
 */
export function calculateSettlements(
  expenses: Expense[],
  members: GroupMember[]
): Settlement[] {
  if (expenses.length === 0) return [];

  // Step 1: Build net balance map keyed by member.id
  // Positive = this person is owed money (creditor)
  // Negative = this person owes money (debtor)
  const net: Record<string, number> = {};
  members.forEach((m) => (net[m.id] = 0));

  for (const expense of expenses) {
    if (!expense.splitAmong || expense.splitAmong.length === 0) continue;
    const share = expense.totalAmount / expense.splitAmong.length;

    // The payer fronted the whole amount — they are owed it back
    net[expense.paidBy] = (net[expense.paidBy] ?? 0) + expense.totalAmount;

    // Each person in splitAmong owes their share
    for (const memberId of expense.splitAmong) {
      net[memberId] = (net[memberId] ?? 0) - share;
    }
  }

  // Step 2: Separate into creditors (net > 0) and debtors (net < 0)
  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of Object.entries(net)) {
    // Round to 7 decimal places (Stellar stroop precision)
    const rounded = Math.round(balance * 1e7) / 1e7;
    if (rounded > 0.0000001) creditors.push({ id, amount: rounded });
    else if (rounded < -0.0000001) debtors.push({ id, amount: Math.abs(rounded) });
  }

  // Step 3: Greedy matching — largest creditor meets largest debtor
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = { ...creditors[ci] };
    const debtor = { ...debtors[di] };
    const settleAmount = Math.round(Math.min(creditor.amount, debtor.amount) * 1e7) / 1e7;

    if (settleAmount > 0.0000001) {
      const fromMember = members.find((m) => m.id === debtor.id);
      const toMember = members.find((m) => m.id === creditor.id);

      if (!fromMember || !toMember) {
        ci++;
        di++;
        continue;
      }

      settlements.push({
        from: debtor.id,
        to: creditor.id,
        fromAddress: fromMember.address,
        toAddress: toMember.address,
        fromName: fromMember.name,
        toName: toMember.name,
        amount: settleAmount,
      });
    }

    creditors[ci].amount -= settleAmount;
    debtors[di].amount -= settleAmount;

    if (creditors[ci].amount <= 0.0000001) ci++;
    if (debtors[di].amount <= 0.0000001) di++;
  }

  return settlements;
}

/** Sum of all expenses in XLM */
export function totalSpent(expenses: Expense[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.totalAmount, 0) * 100) / 100;
}

/** Net balance for a single member: positive = owed money, negative = owes money */
export function memberNetBalance(
  memberId: string,
  expenses: Expense[]
): number {
  let net = 0;
  for (const e of expenses) {
    if (e.paidBy === memberId) net += e.totalAmount;
    if (e.splitAmong.includes(memberId)) net -= e.totalAmount / e.splitAmong.length;
  }
  return Math.round(net * 100) / 100;
}

/** Per-member paid/owed/net breakdown */
export function memberBalances(
  members: GroupMember[],
  expenses: Expense[]
): Record<string, { paid: number; owed: number; net: number }> {
  const result: Record<string, { paid: number; owed: number; net: number }> = {};
  members.forEach((m) => (result[m.id] = { paid: 0, owed: 0, net: 0 }));
  for (const e of expenses) {
    if (result[e.paidBy]) result[e.paidBy].paid += e.totalAmount;
    const share = e.totalAmount / e.splitAmong.length;
    e.splitAmong.forEach((id) => { if (result[id]) result[id].owed += share; });
  }
  Object.keys(result).forEach((id) => {
    result[id].paid = Math.round(result[id].paid * 100) / 100;
    result[id].owed = Math.round(result[id].owed * 100) / 100;
    result[id].net  = Math.round((result[id].paid - result[id].owed) * 100) / 100;
  });
  return result;
}
