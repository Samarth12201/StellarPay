import { describe, it, expect } from 'vitest';
import { calculateSettlements, totalSpent, memberShares } from '../../utils/settlement';
import { Expense, GroupMember } from '../../types';

const members: GroupMember[] = [
  { name: 'Alice', address: 'GALICE', avatarColor: '#7C3AED' },
  { name: 'Bob',   address: 'GBOB',   avatarColor: '#059669' },
  { name: 'Carol', address: 'GCAROL', avatarColor: '#D97706' },
];

const makeExpense = (
  id: string,
  amount: number,
  paidBy: string,
  splitAmong: string[]
): Expense => ({
  id,
  description: 'Test',
  amount,
  paidBy,
  splitAmong,
  date: new Date(),
});

describe('calculateSettlements', () => {
  it('returns empty array when no expenses', () => {
    expect(calculateSettlements([], members)).toEqual([]);
  });

  it('calculates equal 3-way split correctly', () => {
    const expenses = [
      makeExpense('1', 30, 'GALICE', ['GALICE', 'GBOB', 'GCAROL']),
    ];
    const settlements = calculateSettlements(expenses, members);
    // Alice paid 30, each owes 10 → Bob owes Alice 10, Carol owes Alice 10
    expect(settlements).toHaveLength(2);
    const bobOwes = settlements.find((s) => s.from === 'GBOB');
    expect(bobOwes?.amount).toBe(10);
    expect(bobOwes?.to).toBe('GALICE');
  });

  it('minimizes transaction count for complex debts', () => {
    const expenses = [
      makeExpense('1', 60,  'GALICE', ['GALICE', 'GBOB', 'GCAROL']),
      makeExpense('2', 30,  'GBOB',   ['GALICE', 'GBOB', 'GCAROL']),
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
      makeExpense('1', 20, 'GALICE', ['GALICE', 'GBOB']),
      makeExpense('2', 20, 'GBOB',   ['GALICE', 'GBOB']),
    ];
    const settlements = calculateSettlements(expenses, members.slice(0, 2));
    expect(settlements).toHaveLength(0);
  });
});

describe('totalSpent', () => {
  it('sums all expenses', () => {
    const expenses = [
      makeExpense('1', 100, 'GALICE', ['GALICE']),
      makeExpense('2', 50.5, 'GBOB', ['GBOB']),
    ];
    expect(totalSpent(expenses)).toBe(150.5);
  });

  it('returns 0 for empty expenses', () => {
    expect(totalSpent([])).toBe(0);
  });
});

describe('memberShares', () => {
  it('correctly tracks paid and owed per member', () => {
    const expenses = [
      makeExpense('1', 30, 'GALICE', ['GALICE', 'GBOB', 'GCAROL']),
    ];
    const shares = memberShares(expenses, members);
    expect(shares['GALICE'].paid).toBe(30);
    expect(shares['GALICE'].owed).toBe(10);
    expect(shares['GALICE'].net).toBe(20);
    expect(shares['GBOB'].net).toBe(-10);
  });
});
