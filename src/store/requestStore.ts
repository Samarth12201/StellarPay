import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentRequest } from '../types';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';
import { useWalletStore } from './walletStore';
import toast from 'react-hot-toast';

let isSyncingRequests = false;
const appLoadTime = Date.now();

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
        if (!supabase || isSyncingRequests) return;
        isSyncingRequests = true;
        try {
          const { data } = await supabase.from('payment_requests').select('*');
          if (data) {
            const mapped: PaymentRequest[] = data.map((d) => ({
              id: d.id,
              groupId: d.groupid ?? undefined,
              groupName: d.groupname ?? undefined,
              fromAddress: d.fromaddress,
              toAddress: d.toaddress,
              fromName: d.fromname,
              amount: d.amount,
              memo: d.memo,
              status: d.status as any,
              txHash: d.txhash ?? undefined,
              createdAt: new Date(d.created_at)
            }));

            // Detect new pending requests for the current user
            const myAddress = useWalletStore.getState().address;
            if (myAddress) {
              const currentRequests = get().requests;
              const myLowerAddress = myAddress.toLowerCase();
              const newRequests = mapped.filter(r => 
                r.toAddress.toLowerCase() === myLowerAddress && 
                r.status === 'pending' && 
                !currentRequests.some(prev => prev.id === r.id) &&
                r.createdAt.getTime() > appLoadTime
              );

              for (const r of newRequests) {
                toast.success(
                  `New payment request: ${r.amount} XLM from ${r.fromName}\n"${r.memo}"`,
                  {
                    duration: 6000,
                    icon: '📬',
                    style: {
                      background: '#1e1b4b', // Indigo dark
                      color: '#e0e7ff', // Indigo light text
                      border: '1px solid #4338ca',
                    }
                  }
                );
              }
            }

            const dbIds = new Set(mapped.map((m) => m.id));
            const localOnly = get().requests.filter((r) => !dbIds.has(r.id));

            // Auto-upload local-only requests
            for (const req of localOnly) {
              try {
                let shouldUpload = true;
                if (req.groupId) {
                  const { data: grp } = await supabase.from('groups').select('id').eq('id', req.groupId).maybeSingle();
                  if (!grp) {
                    shouldUpload = false;
                  }
                }
                if (shouldUpload) {
                  await supabase.from('payment_requests').upsert({
                    id: req.id,
                    groupid: req.groupId,
                    groupname: req.groupName,
                    fromaddress: req.fromAddress,
                    toaddress: req.toAddress,
                    fromname: req.fromName,
                    amount: req.amount,
                    memo: req.memo,
                    status: req.status,
                    txhash: req.txHash
                  });
                  mapped.push(req);
                }
              } catch (err) {
                console.error('Failed to auto-upload local request:', err);
              }
            }

            set({ requests: mapped });
          }
        } finally {
          isSyncingRequests = false;
        }
      },

      addRequest: async (req) => {
        const id = nanoid();
        const newReq = { ...req, id, createdAt: new Date() };
        set((s) => ({ requests: [newReq, ...s.requests] }));
        
        if (supabase) {
          await supabase.from('payment_requests').insert({
            id: newReq.id,
            groupid: newReq.groupId,
            groupname: newReq.groupName,
            fromaddress: newReq.fromAddress,
            toaddress: newReq.toAddress,
            fromname: newReq.fromName,
            amount: newReq.amount,
            memo: newReq.memo,
            status: newReq.status,
            txhash: newReq.txHash
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
              groupid: r.groupId,
              groupname: r.groupName,
              fromaddress: r.fromAddress,
              toaddress: r.toAddress,
              fromname: r.fromName,
              amount: r.amount,
              memo: r.memo,
              status: r.status,
              txhash: r.txHash
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
          await supabase.from('payment_requests').update({ status: 'paid', txhash: txHash }).eq('id', id);
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
    { name: 'stellarpay-requests-v4' }
  )
);
