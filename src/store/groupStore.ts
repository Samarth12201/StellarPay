import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Group, GroupMember, Expense } from '../types';
import { nanoid } from 'nanoid';

const AVATAR_COLORS = [
  '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#2563EB', '#DB2777', '#0891B2', '#65A30D',
];

interface GroupStore {
  groups: Group[];
  createGroup: (name: string, members: Array<{ name: string; address: string }>) => string;
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'date' | 'settled'>) => string;
  markExpenseSettled: (groupId: string, expenseId: string) => void;
  deleteGroup: (id: string) => void;
  getGroup: (id: string) => Group | undefined;
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      groups: [],

      createGroup: (name, members) => {
        const id = nanoid();
        const group: Group = {
          id,
          name,
          members: members.map((m, i) => ({
            id: nanoid(),
            name: m.name.trim(),
            address: m.address.trim(),
            avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
          })),
          expenses: [],
          createdAt: new Date(),
        };
        set((s) => ({ groups: [...s.groups, group] }));
        return id;
      },

      addExpense: (groupId, expense) => {
        const expenseId = nanoid();
        const newExpense: Expense = {
          ...expense,
          id: expenseId,
          date: new Date(),
          settled: false,
        };
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: [...g.expenses, newExpense] }
              : g
          ),
        }));
        return expenseId;
      },

      markExpenseSettled: (groupId, expenseId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  expenses: g.expenses.map((e) =>
                    e.id === expenseId ? { ...e, settled: true } : e
                  ),
                }
              : g
          ),
        })),

      deleteGroup: (id) =>
        set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),

      getGroup: (id) => get().groups.find((g) => g.id === id),
    }),
    { name: 'stellarpay-groups-v3' }
  )
);
