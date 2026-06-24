import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentRequest } from '../types';
import { nanoid } from 'nanoid';

interface RequestStore {
  requests: PaymentRequest[];
  addRequest: (req: Omit<PaymentRequest, 'id' | 'createdAt'>) => string;
  addRequests: (reqs: Array<Omit<PaymentRequest, 'id' | 'createdAt'>>) => void;
  markPaid: (id: string, txHash: string) => void;
  markRejected: (id: string) => void;
  getIncoming: (myAddress: string) => PaymentRequest[];  // requests I need to pay
  getOutgoing: (myAddress: string) => PaymentRequest[];  // requests I created
}

export const useRequestStore = create<RequestStore>()(
  persist(
    (set, get) => ({
      requests: [],

      addRequest: (req) => {
        const id = nanoid();
        set((s) => ({
          requests: [
            { ...req, id, createdAt: new Date() },
            ...s.requests,
          ],
        }));
        return id;
      },

      addRequests: (reqs) => {
        const newReqs = reqs.map((r) => ({ ...r, id: nanoid(), createdAt: new Date() }));
        set((s) => ({ requests: [...newReqs, ...s.requests] }));
      },

      markPaid: (id, txHash) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'paid', txHash } : r
          ),
        })),

      markRejected: (id) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'rejected' } : r
          ),
        })),

      getIncoming: (myAddress) =>
        get().requests.filter(
          (r) => r.toAddress === myAddress && r.status === 'pending'
        ),

      getOutgoing: (myAddress) =>
        get().requests.filter((r) => r.fromAddress === myAddress),
    }),
    { name: 'stellarpay-requests-v2' }
  )
);
