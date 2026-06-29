import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Group, GroupMember, Expense, Pool } from '../types';
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
  createPool: (groupId: string, poolId: string, title: string, targetAmount: number, creator: string, asset: 'XLM' | 'USDC') => Promise<void>;
  contributeToPool: (groupId: string, poolId: string, amount: number) => Promise<void>;
  withdrawFromPool: (groupId: string, poolId: string) => Promise<void>;
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
          id, name, members: newMembers, expenses: [], pools: [], createdAt: new Date(),
        };
        set((s) => ({ groups: [...s.groups, group] }));

        // Sync to Supabase
        if (supabase) {
          try {
            const { error: groupErr } = await supabase.from('groups').upsert({ id, name });
            if (groupErr) console.error('[createGroup] Error saving group:', groupErr);

            const { error: membersErr } = await supabase.from('group_members').upsert(
              newMembers.map((m) => ({
                id: m.id,
                group_id: id,
                name: m.name,
                address: m.address,
                avatarcolor: m.avatarColor, // lowercase to match Postgres
              }))
            );
            if (membersErr) console.error('[createGroup] Error saving members:', membersErr);
          } catch (err) {
            console.error('[createGroup] Unexpected error:', err);
          }
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
          try {
            const { error } = await supabase.from('expenses').upsert({
              id: expId,
              group_id: groupId,
              description: expense.description,
              totalamount: expense.totalAmount, // lowercase to match Postgres
              paidby: expense.paidBy,           // lowercase to match Postgres
              splitamong: expense.splitAmong,   // lowercase to match Postgres
              settled: false,
              // Temporarily removed 'asset' to prevent PGRST204 schema cache errors
            });
            if (error) console.error('[addExpense] Error saving expense:', error);
          } catch (err) {
            console.error('[addExpense] Unexpected error:', err);
          }
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

      createPool: async (groupId, poolId, title, targetAmount, creator, asset) => {
        const newPool: Pool = {
          id: poolId,
          groupId,
          creator,
          title,
          targetAmount,
          balance: 0,
          closed: false,
          asset,
          createdAt: new Date(),
        };

        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, pools: [...(g.pools || []), newPool] }
              : g
          ),
        }));

        if (supabase) {
          try {
            await supabase.from('pools').upsert({
              id: poolId,
              group_id: groupId,
              creator,
              title,
              target_amount: targetAmount,
              balance: 0,
              closed: false,
              asset,
            });
          } catch (err) {
            console.warn('Supabase pools upsert failed (possibly table does not exist):', err);
          }
        }
      },

      contributeToPool: async (groupId, poolId, amount) => {
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  pools: (g.pools || []).map((p) =>
                    p.id === poolId ? { ...p, balance: p.balance + amount } : p
                  ),
                }
              : g
          ),
        }));

        if (supabase) {
          try {
            const { data } = await supabase.from('pools').select('balance').eq('id', poolId).single();
            const currentBalance = data ? (data.balance || 0) : 0;
            await supabase
              .from('pools')
              .update({ balance: currentBalance + amount })
              .eq('id', poolId);
          } catch (err) {
            console.warn('Supabase pools update failed:', err);
          }
        }
      },

      withdrawFromPool: async (groupId, poolId) => {
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  pools: (g.pools || []).map((p) =>
                    p.id === poolId ? { ...p, balance: 0, closed: true } : p
                  ),
                }
              : g
          ),
        }));

        if (supabase) {
          try {
            await supabase
              .from('pools')
              .update({ balance: 0, closed: true })
              .eq('id', poolId);
          } catch (err) {
            console.warn('Supabase pools update failed:', err);
          }
        }
      },

      syncFromSupabase: async () => {
        const client = supabase;
        if (!client) return;

        try {
          const { data: groupRows, error: groupErr } = await client.from('groups').select('*');
          if (groupErr) {
            console.error('[syncFromSupabase] Failed to fetch groups:', groupErr.message);
            return;
          }
          if (!groupRows || groupRows.length === 0) {
            // No groups in DB — keep local state as-is (might have locally created ones pending sync)
            return;
          }

          // Always try to fetch pools — don't rely on a flag
          let allPoolRows: any[] = [];
          try {
            const { data, error } = await client.from('pools').select('*');
            if (!error && data) {
              allPoolRows = data;
            }
          } catch {
            // pools table might not exist yet — that's fine
          }

          const rebuilt: Group[] = await Promise.all(
            groupRows.map(async (g) => {
              const { data: memberRows } = await client
                .from('group_members').select('*').eq('group_id', g.id);
              const { data: expenseRows } = await client
                .from('expenses').select('*').eq('group_id', g.id);

              const members: GroupMember[] = (memberRows ?? []).map((m) => ({
                id: m.id,
                name: m.name,
                address: m.address,
                avatarColor: m.avatarcolor ?? m.avatarColor ?? '#7C3AED',
              }));

              const expenses: Expense[] = (expenseRows ?? []).map((e) => ({
                id: e.id,
                description: e.description,
                totalAmount: e.totalamount ?? e.totalAmount ?? 0,
                paidBy: e.paidby ?? e.paidBy,
                splitAmong: e.splitamong ?? e.splitAmong ?? [],
                date: new Date(e.date ?? e.created_at ?? Date.now()),
                settled: e.settled ?? false,
                asset: e.asset || 'XLM',
              }));

              const pools: Pool[] = allPoolRows
                .filter((p) => p.group_id === g.id)
                .map((p) => ({
                  id: p.id,
                  groupId: p.group_id,
                  creator: p.creator,
                  title: p.title,
                  targetAmount: p.target_amount,
                  balance: p.balance,
                  closed: p.closed,
                  asset: p.asset || 'XLM',
                  createdAt: new Date(p.created_at || Date.now()),
                }));

              return {
                id: g.id,
                name: g.name,
                members,
                expenses,
                pools,
                createdAt: new Date(g.created_at ?? Date.now()),
              };
            })
          );

          set({ groups: rebuilt });
        } catch (err) {
          console.error('[syncFromSupabase] Unexpected error:', err);
        }
      },
    }),
    { name: 'stellarpay-groups-v4' }
  )
);

