import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Group, GroupMember, Expense } from '../types';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';

const AVATAR_COLORS = [
  '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#2563EB', '#DB2777', '#0891B2', '#65A30D',
];

interface GroupStore {
  groups: Group[];
  createGroup: (name: string, members: { name: string; address: string }[]) => Promise<string>;
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'date' | 'settled'>) => Promise<string>;
  markExpenseSettled: (groupId: string, expenseId: string) => Promise<void>;
  deleteGroup: (id: string) => void;
  getGroup: (id: string) => Group | undefined;
  syncFromSupabase: () => Promise<void>;
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      groups: [],

      createGroup: async (name, members) => {
        const id = nanoid();
        const newMembers: GroupMember[] = members.map((m, i) => ({
          id: nanoid(),
          name: m.name.trim(),
          address: m.address.trim(),
          avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        }));
        const group: Group = {
          id, name, members: newMembers, expenses: [], createdAt: new Date(),
        };
        set((s) => ({ groups: [...s.groups, group] }));

        // Sync to Supabase
        if (supabase) {
          await supabase.from('groups').upsert({ id, name });
          await supabase.from('group_members').upsert(
            newMembers.map((m) => ({
              id: m.id, group_id: id, name: m.name,
              address: m.address, avatarColor: m.avatarColor,
            }))
          );
        }
        return id;
      },

      addExpense: async (groupId, expense) => {
        const expId = nanoid();
        const newExpense: Expense = {
          ...expense, id: expId, date: new Date(), settled: false,
        };
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, expenses: [...g.expenses, newExpense] }
              : g
          ),
        }));

        // Sync to Supabase
        if (supabase) {
          await supabase.from('expenses').upsert({
            id: expId,
            group_id: groupId,
            description: expense.description,
            totalAmount: expense.totalAmount,
            paidBy: expense.paidBy,
            splitAmong: expense.splitAmong,
            settled: false,
          });
        }
        return expId;
      },

      markExpenseSettled: async (groupId, expenseId) => {
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
        }));
        if (supabase) {
          await supabase
            .from('expenses')
            .update({ settled: true })
            .eq('id', expenseId);
        }
      },

      deleteGroup: (id) => {
        set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }));
        if (supabase) {
          supabase.from('groups').delete().eq('id', id);
        }
      },

      getGroup: (id) => get().groups.find((g) => g.id === id),

      syncFromSupabase: async () => {
        const client = supabase;
        if (!client) return;

        const { data: groupRows } = await client.from('groups').select('*');
        if (!groupRows) return;

        const rebuilt: Group[] = await Promise.all(
          groupRows.map(async (g) => {
            const { data: memberRows } = await client
              .from('group_members').select('*').eq('group_id', g.id);
            const { data: expenseRows } = await client
              .from('expenses').select('*').eq('group_id', g.id);

            const members: GroupMember[] = (memberRows ?? []).map((m) => ({
              id: m.id, name: m.name, address: m.address, avatarColor: m.avatarcolor ?? m.avatarColor,
            }));
            const expenses: Expense[] = (expenseRows ?? []).map((e) => ({
              id: e.id,
              description: e.description,
              totalAmount: e.totalamount ?? e.totalAmount,
              paidBy: e.paidby ?? e.paidBy,
              splitAmong: e.splitamong ?? e.splitAmong ?? [],
              date: new Date(e.date),
              settled: e.settled,
            }));
            return { id: g.id, name: g.name, members, expenses, createdAt: new Date(g.created_at) };
          })
        );
        set({ groups: rebuilt });
      },
    }),
    { name: 'stellarpay-groups-v4' }
  )
);
