import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentRequest } from '../types';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';

interface RequestStore {
  requests: PaymentRequest[];

  // Sync from Supabase
  syncRequests: () => Promise<void>;

  addRequest: (req: Omit<PaymentRequest, 'id' | 'createdAt'>) => Promise<string>;
  addRequests: (reqs: Array<Omit<PaymentRequest, 'id' | 'createdAt'>>) => Promise<void>;
  markPaid: (id: string, txHash: string) => Promise<void>;
  markRejected: (id: string) => Promise<void>;

  getIncoming: (myAddress: string) => PaymentRequest[];
  getOutgoing: (myAddress: string) => PaymentRequest[];
  getPendingCount: (myAddress: string) => number;
}

export const useRequestStore = create<RequestStore>()(
  persist(
    (set, get) => ({
      requests: [],

      syncRequests: async () => {
        if (!supabase) return;
        const { data } = await supabase.from('payment_requests').select('*');
        if (data) {
          const mapped = data.map((d) => ({
            id: d.id,
            groupId: d.groupId,
            groupName: d.groupName,
            fromAddress: d.fromAddress,
            toAddress: d.toAddress,
            fromName: d.fromName,
            amount: d.amount,
            memo: d.memo,
            status: d.status as any,
            txHash: d.txHash,
            createdAt: new Date(d.created_at)
          }));
          // Merge avoiding duplicates
          set((s) => {
            const existingIds = new Set(s.requests.map((r) => r.id));
            const newReqs = mapped.filter((m) => !existingIds.has(m.id));
            return { requests: [...newReqs, ...s.requests] };
          });
        }
      },

      addRequest: async (req) => {
        const id = nanoid();
        const newReq = { ...req, id, createdAt: new Date() };
        set((s) => ({ requests: [newReq, ...s.requests] }));
        
        if (supabase) {
          await supabase.from('payment_requests').insert({
            id: newReq.id,
            groupId: newReq.groupId,
            groupName: newReq.groupName,
            fromAddress: newReq.fromAddress,
            toAddress: newReq.toAddress,
            fromName: newReq.fromName,
            amount: newReq.amount,
            memo: newReq.memo,
            status: newReq.status,
            txHash: newReq.txHash
          });
        }
        return id;
      },

      addRequests: async (reqs) => {
        const newReqs = reqs.map((r) => ({
          ...r,
          id: nanoid(),
          createdAt: new Date(),
        }));
        set((s) => ({ requests: [...newReqs, ...s.requests] }));
        
        if (supabase) {
          await supabase.from('payment_requests').insert(
            newReqs.map(r => ({
              id: r.id,
              groupId: r.groupId,
              groupName: r.groupName,
              fromAddress: r.fromAddress,
              toAddress: r.toAddress,
              fromName: r.fromName,
              amount: r.amount,
              memo: r.memo,
              status: r.status,
              txHash: r.txHash
            }))
          );
        }
      },

      markPaid: async (id, txHash) => {
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'paid' as const, txHash } : r
          ),
        }));
        if (supabase) {
          await supabase.from('payment_requests').update({ status: 'paid', txHash }).eq('id', id);
        }
      },

      markRejected: async (id) => {
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'rejected' as const } : r
          ),
        }));
        if (supabase) {
          await supabase.from('payment_requests').update({ status: 'rejected' }).eq('id', id);
        }
      },

      getIncoming: (myAddress: string) =>
        get().requests.filter(
          (r) =>
            r.toAddress.toLowerCase() === myAddress.toLowerCase() &&
            r.status === 'pending'
        ),

      getOutgoing: (myAddress: string) =>
        get().requests.filter(
          (r) => r.fromAddress.toLowerCase() === myAddress.toLowerCase()
        ),

      getPendingCount: (myAddress: string) =>
        get().requests.filter(
          (r) =>
            r.toAddress.toLowerCase() === myAddress.toLowerCase() &&
            r.status === 'pending'
        ).length,
    }),
    { name: 'stellarpay-requests-v3' }
  )
);
