import { Settlement, Expense, GroupMember } from '../types';

/**
 * Given a list of expenses, calculate who owes whom and how much.
 * Uses the "net balance" algorithm to minimize transaction count.
 */
export function calculateSettlements(
  expenses: Expense[],
  members: GroupMember[]
): Settlement[] {
  // Step 1: Build net balance map (positive = owed money, negative = owes money)
  const netBalance: Record<string, number> = {};
  members.forEach((m) => (netBalance[m.address] = 0));

  for (const expense of expenses) {
    const splitCount = expense.splitAmong.length;
    const share = expense.amount / splitCount;

    // Payer gets credit
    netBalance[expense.paidBy] = (netBalance[expense.paidBy] ?? 0) + expense.amount;

    // Each participant is debited their share
    expense.splitAmong.forEach((addr) => {
      netBalance[addr] = (netBalance[addr] ?? 0) - share;
    });
  }

  // Step 2: Separate into creditors (positive) and debtors (negative)
  const creditors: { address: string; amount: number }[] = [];
  const debtors: { address: string; amount: number }[] = [];

  Object.entries(netBalance).forEach(([address, balance]) => {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.001) creditors.push({ address, amount: rounded });
    else if (rounded < -0.001) debtors.push({ address, amount: Math.abs(rounded) });
  });

  // Step 3: Greedy matching — pair largest debtor with largest creditor
  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const settleAmount = Math.min(creditor.amount, debtor.amount);

    if (settleAmount > 0.001) {
      const fromMember = members.find((m) => m.address === debtor.address);
      const toMember = members.find((m) => m.address === creditor.address);

      settlements.push({
        from: debtor.address,
        to: creditor.address,
        amount: Math.round(settleAmount * 100) / 100,
        fromName: fromMember?.name ?? debtor.address.slice(0, 6),
        toName: toMember?.name ?? creditor.address.slice(0, 6),
      });
    }

    creditor.amount -= settleAmount;
    debtor.amount -= settleAmount;

    if (creditor.amount < 0.001) ci++;
    if (debtor.amount < 0.001) di++;
  }

  return settlements;
}

/** Sum all expenses in a group */
export function totalSpent(expenses: Expense[]): number {
  return Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
}

/** Calculate each member's total share */
export function memberShares(
  expenses: Expense[],
  members: GroupMember[]
): Record<string, { paid: number; owed: number; net: number }> {
  const result: Record<string, { paid: number; owed: number; net: number }> = {};
  members.forEach((m) => (result[m.address] = { paid: 0, owed: 0, net: 0 }));

  for (const expense of expenses) {
    const share = expense.amount / expense.splitAmong.length;
    result[expense.paidBy].paid += expense.amount;
    expense.splitAmong.forEach((addr) => {
      if (result[addr]) result[addr].owed += share;
    });
  }

  Object.keys(result).forEach((addr) => {
    result[addr].net = Math.round((result[addr].paid - result[addr].owed) * 100) / 100;
    result[addr].paid = Math.round(result[addr].paid * 100) / 100;
    result[addr].owed = Math.round(result[addr].owed * 100) / 100;
  });

  return result;
}
