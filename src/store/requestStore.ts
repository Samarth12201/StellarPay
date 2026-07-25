import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentRequest } from '../types';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';

interface RequestStore {
  requests: PaymentRequest[];
  addRequest: (req: Omit<PaymentRequest, 'id' | 'createdAt'>) => Promise<string>;
  addRequests: (reqs: Omit<PaymentRequest, 'id' | 'createdAt'>[]) => Promise<void>;
  markPaid: (id: string, txHash: string) => Promise<void>;
  markRejected: (id: string) => Promise<void>;
  getIncoming: (myAddress: string) => PaymentRequest[];
  getOutgoing: (myAddress: string) => PaymentRequest[];
  getPendingCount: (myAddress: string) => number;
  syncFromSupabase: (myAddress: string) => Promise<void>;
}

export const useRequestStore = create<RequestStore>()(
  persist(
    (set, get) => ({
      requests: [],

      addRequest: async (req) => {
        const id = nanoid();
        const full: PaymentRequest = { ...req, id, createdAt: new Date() };
        set((s) => ({ requests: [full, ...s.requests] }));

        // Write to Supabase so other devices see it
        if (supabase) {
          await supabase.from('payment_requests').upsert({
            id,
            groupid: req.groupId ?? null,
            groupname: req.groupName ?? null,
            fromaddress: req.fromAddress,
            toaddress: req.toAddress,
            fromname: req.fromName,
            amount: req.amount,
            memo: req.memo,
            status: req.status,
            txhash: req.txHash ?? null,
          });
        }
        return id;
      },

      addRequests: async (reqs) => {
        const full = reqs.map((r) => ({ ...r, id: nanoid(), createdAt: new Date() }));
        set((s) => ({ requests: [...full, ...s.requests] }));
        if (supabase) {
          await supabase.from('payment_requests').upsert(
            full.map((r) => ({
              id: r.id,
              groupid: r.groupId ?? null,
              groupname: r.groupName ?? null,
              fromaddress: r.fromAddress,
              toaddress: r.toAddress,
              fromname: r.fromName,
              amount: r.amount,
              memo: r.memo,
              status: r.status,
              txhash: r.txHash ?? null,
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
          await supabase
            .from('payment_requests')
            .update({ status: 'paid', txhash: txHash })
            .eq('id', id);
        }
      },

      markRejected: async (id) => {
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'rejected' as const } : r
          ),
        }));
        if (supabase) {
          await supabase
            .from('payment_requests')
            .update({ status: 'rejected' })
            .eq('id', id);
        }
      },

      // CRITICAL: only requests addressed TO this wallet
      getIncoming: (myAddress) =>
        get().requests.filter(
          (r) =>
            r.toAddress.toLowerCase() === myAddress.toLowerCase() &&
            r.status === 'pending'
        ),

      getOutgoing: (myAddress) =>
        get().requests.filter(
          (r) => r.fromAddress.toLowerCase() === myAddress.toLowerCase()
        ),

      getPendingCount: (myAddress) =>
        get().requests.filter(
          (r) =>
            r.toAddress.toLowerCase() === myAddress.toLowerCase() &&
            r.status === 'pending'
        ).length,

      // Pull pending requests from Supabase addressed to this wallet
      syncFromSupabase: async (myAddress) => {
        const client = supabase;
        if (!client) return;

        const { data } = await client
          .from('payment_requests')
          .select('*')
          .or(`toaddress.eq.${myAddress},fromaddress.eq.${myAddress}`)
          .order('created_at', { ascending: false });
          
        if (!data) return;

        const allRequests: PaymentRequest[] = data.map((r) => ({
          id: r.id,
          fromAddress: r.fromaddress ?? r.fromAddress,
          toAddress: r.toaddress ?? r.toAddress,
          fromName: r.fromname ?? r.fromName,
          amount: r.amount,
          memo: r.memo,
          groupId: r.groupid ?? r.groupId ?? undefined,
          groupName: r.groupname ?? r.groupName ?? undefined,
          status: r.status as PaymentRequest['status'],
          txHash: r.txhash ?? r.txHash ?? undefined,
          createdAt: new Date(r.created_at),
        }));

        set({ requests: allRequests });
      },
    }),
    { name: 'stellarpay-requests-v4' }
  )
);
