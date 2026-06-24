import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Group, Expense } from '../types';
import { nanoid } from 'nanoid';

interface GroupStore {
  groups: Group[];
  createGroup: (name: string, members: Group['members']) => string;
  addExpense: (groupId: string, expense: Omit<Expense, 'id'>) => void;
  markExpenseSettled: (groupId: string, expenseId: string, txHash: string) => void;
  deleteGroup: (groupId: string) => void;
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set) => ({
      groups: [],
      createGroup: (name, members) => {
        const id = nanoid();
        set((s) => ({
          groups: [
            ...s.groups,
            { id, name, members, expenses: [], createdAt: new Date() },
          ],
        }));
        return id;
      },
      addExpense: (groupId, expense) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: [...g.expenses, { ...expense, id: nanoid() }] }
              : g
          ),
        })),
      markExpenseSettled: (groupId, expenseId, txHash) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  expenses: g.expenses.map((e) =>
                    e.id === expenseId ? { ...e, txHash } : e
                  ),
                }
              : g
          ),
        })),
      deleteGroup: (groupId) =>
        set((s) => ({ groups: s.groups.filter((g) => g.id !== groupId) })),
    }),
    { name: 'stellarpay-groups' }
  )
);
