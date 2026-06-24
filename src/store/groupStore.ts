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
  addExpense: (groupId: string, exp: Omit<Expense, 'id' | 'date'>) => string;
  markExpensePaid: (groupId: string, expenseId: string, txHash: string) => void;
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
            name: m.name,
            address: m.address,
            avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
          })),
          expenses: [],
          createdAt: new Date(),
        };
        set((s) => ({ groups: [...s.groups, group] }));
        return id;
      },

      addExpense: (groupId, exp) => {
        const expId = nanoid();
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: [...g.expenses, { ...exp, id: expId, date: new Date() }] }
              : g
          ),
        }));
        return expId;
      },

      markExpensePaid: (groupId, expenseId, txHash) =>
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

      deleteGroup: (id) =>
        set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),

      getGroup: (id) => get().groups.find((g) => g.id === id),
    }),
    { name: 'stellarpay-groups-v2' }
  )
);
