import { describe, it, expect } from 'vitest';
import { calculateSettlements, totalSpent, memberBalances } from '../../utils/settlement';
import { Expense, GroupMember } from '../../types';

const members: GroupMember[] = [
  { id: '1', name: 'Alice', address: 'GALICE', avatarColor: '#7C3AED' },
  { id: '2', name: 'Bob',   address: 'GBOB',   avatarColor: '#059669' },
  { id: '3', name: 'Carol', address: 'GCAROL', avatarColor: '#D97706' },
];

const makeExpense = (
  id: string,
  totalAmount: number,
  paidBy: string,
  splitAmong: string[]
): Expense => ({
  id,
  description: 'Test',
  totalAmount,
  paidBy,
  splitAmong,
  date: new Date(),
  settled: false,
});

describe('calculateSettlements', () => {
  it('returns empty array when no expenses', () => {
    expect(calculateSettlements([], members)).toEqual([]);
  });

  it('calculates equal 3-way split correctly', () => {
    const expenses = [
      makeExpense('1', 30, '1', ['1', '2', '3']),
    ];
    const settlements = calculateSettlements(expenses, members);
    // Alice paid 30, each owes 10 → Bob owes Alice 10, Carol owes Alice 10
    expect(settlements).toHaveLength(2);
    const bobOwes = settlements.find((s) => s.from === '2');
    expect(bobOwes?.amount).toBe(10);
    expect(bobOwes?.to).toBe('1');
  });

  it('minimizes transaction count for complex debts', () => {
    const expenses = [
      makeExpense('1', 60,  '1', ['1', '2', '3']),
      makeExpense('2', 30,  '2', ['1', '2', '3']),
    ];
    // Alice paid 60, Bob paid 30, Carol paid 0
    // Each owes 30. Alice is owed 30, Bob is owed 0, Carol owes 30
    const settlements = calculateSettlements(expenses, members);
    expect(settlements.length).toBeLessThanOrEqual(2);
    const total = settlements.reduce((s, t) => s + t.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(30);
  });

  it('handles already-balanced group with no settlements', () => {
    const expenses = [
      makeExpense('1', 20, '1', ['1', '2']),
      makeExpense('2', 20, '2', ['1', '2']),
    ];
    const settlements = calculateSettlements(expenses, members.slice(0, 2));
    expect(settlements).toHaveLength(0);
  });
});

describe('totalSpent', () => {
  it('sums all expenses', () => {
    const expenses = [
      makeExpense('1', 100, '1', ['1']),
      makeExpense('2', 50.5, '2', ['2']),
    ];
    expect(totalSpent(expenses)).toBe(150.5);
  });

  it('returns 0 for empty expenses', () => {
    expect(totalSpent([])).toBe(0);
  });
});

describe('memberBalances', () => {
  it('correctly tracks paid and owed per member', () => {
    const expenses = [
      makeExpense('1', 30, '1', ['1', '2', '3']),
    ];
    const shares = memberBalances(members, expenses);
    expect(shares['1'].paid).toBe(30);
    expect(shares['1'].owed).toBe(10);
    expect(shares['1'].net).toBe(20);
    expect(shares['2'].net).toBe(-10);
  });
});
