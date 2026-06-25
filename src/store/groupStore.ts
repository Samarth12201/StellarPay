import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Group, GroupMember, Expense } from '../types';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';

const AVATAR_COLORS = [
  '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#2563EB', '#DB2777', '#0891B2', '#65A30D',
];

let isSyncingGroups = false;

interface GroupStore {
  groups: Group[];
  syncGroups: () => Promise<void>;
  createGroup: (name: string, members: Array<{ name: string; address: string }>) => Promise<string>;
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'date' | 'settled'>) => Promise<string>;
  markExpenseSettled: (groupId: string, expenseId: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  getGroup: (id: string) => Group | undefined;
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      groups: [],

      syncGroups: async () => {
        if (!supabase || isSyncingGroups) return;
        isSyncingGroups = true;
        try {
          const [{ data: groups }, { data: members }, { data: expenses }] = await Promise.all([
            supabase.from('groups').select('*'),
            supabase.from('group_members').select('*'),
            supabase.from('expenses').select('*')
          ]);
          if (!groups || !members || !expenses) return;

          const assembledGroups: Group[] = groups.map(g => {
            const groupMembers = members.filter(m => m.group_id === g.id).map(m => ({
              id: m.id, name: m.name, address: m.address, avatarColor: m.avatarcolor
            }));
            const groupExpenses = expenses.filter(e => e.group_id === g.id).map(e => ({
              id: e.id, description: e.description, totalAmount: e.totalamount,
              paidBy: e.paidby, splitAmong: e.splitamong, date: new Date(e.date),
              settled: e.settled
            }));
            return { id: g.id, name: g.name, createdAt: new Date(g.created_at), members: groupMembers, expenses: groupExpenses };
          });

          // Auto-upload local-only groups
          const dbIds = new Set(assembledGroups.map(g => g.id));
          const localGroups = get().groups;
          const localOnlyGroups = localGroups.filter(g => !dbIds.has(g.id));

          for (const g of localOnlyGroups) {
            try {
              await supabase.from('groups').upsert({ id: g.id, name: g.name });
              await supabase.from('group_members').upsert(
                g.members.map(m => ({ id: m.id, group_id: g.id, name: m.name, address: m.address, avatarcolor: m.avatarColor }))
              );
              if (g.expenses.length > 0) {
                await supabase.from('expenses').upsert(
                  g.expenses.map(e => ({
                    id: e.id,
                    group_id: g.id,
                    description: e.description,
                    totalamount: e.totalAmount,
                    paidby: e.paidBy,
                    splitamong: e.splitAmong,
                    settled: e.settled
                  }))
                );
              }
              assembledGroups.push(g);
              dbIds.add(g.id);
            } catch (err) {
              console.error('Failed to auto-upload local group:', err);
            }
          }

          // Auto-upload local-only expenses for already synced groups
          for (const lg of localGroups) {
            if (dbIds.has(lg.id)) {
              const dbGroup = assembledGroups.find(g => g.id === lg.id);
              if (dbGroup) {
                const dbExpenseIds = new Set(dbGroup.expenses.map(e => e.id));
                const localOnlyExpenses = lg.expenses.filter(e => !dbExpenseIds.has(e.id));
                for (const e of localOnlyExpenses) {
                  try {
                    await supabase.from('expenses').upsert({
                      id: e.id,
                      group_id: lg.id,
                      description: e.description,
                      totalamount: e.totalAmount,
                      paidby: e.paidBy,
                      splitamong: e.splitAmong,
                      settled: e.settled
                    });
                    dbGroup.expenses.push(e);
                  } catch (err) {
                    console.error('Failed to auto-upload local expense:', err);
                  }
                }
              }
            }
          }

          set(() => ({ groups: assembledGroups }));
        } finally {
          isSyncingGroups = false;
        }
      },

      createGroup: async (name, members) => {
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

        if (supabase) {
          await supabase.from('groups').insert({ id: group.id, name: group.name });
          await supabase.from('group_members').insert(
            group.members.map(m => ({ id: m.id, group_id: group.id, name: m.name, address: m.address, avatarcolor: m.avatarColor }))
          );
        }
        return id;
      },

      addExpense: async (groupId, expense) => {
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

        if (supabase) {
          await supabase.from('expenses').insert({
            id: newExpense.id,
            group_id: groupId,
            description: newExpense.description,
            totalamount: newExpense.totalAmount,
            paidby: newExpense.paidBy,
            splitamong: newExpense.splitAmong,
            settled: newExpense.settled
          });
        }
        return expenseId;
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
          await supabase.from('expenses').update({ settled: true }).eq('id', expenseId);
        }
      },

      deleteGroup: async (id) => {
        set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }));
        if (supabase) {
          await supabase.from('groups').delete().eq('id', id);
        }
      },

      getGroup: (id) => get().groups.find((g) => g.id === id),
    }),
    { name: 'stellarpay-groups-v4' }
  )
);
