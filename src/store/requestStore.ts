import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentRequest } from '../types';
import { nanoid } from 'nanoid';

interface RequestStore {
  requests: PaymentRequest[];

  // Add a single request (e.g. from group settlement "Send Request" button)
  addRequest: (req: Omit<PaymentRequest, 'id' | 'createdAt'>) => string;

  // Add multiple requests at once (e.g. after bill split)
  addRequests: (reqs: Array<Omit<PaymentRequest, 'id' | 'createdAt'>>) => void;

  // Mark a request as paid (called after on-chain TX confirms)
  markPaid: (id: string, txHash: string) => void;

  // Mark a request as rejected
  markRejected: (id: string) => void;

  // THE KEY SELECTOR: returns only requests addressed TO this wallet address
  // This is how Person B sees their requests when they connect their wallet
  getIncoming: (myAddress: string) => PaymentRequest[];

  // Returns requests created BY this address (for outgoing view)
  getOutgoing: (myAddress: string) => PaymentRequest[];

  // Get pending count for a specific address (for badge)
  getPendingCount: (myAddress: string) => number;
}

export const useRequestStore = create<RequestStore>()(
  persist(
    (set, get) => ({
      requests: [],

      addRequest: (req) => {
        const id = nanoid();
        set((s) => ({
          requests: [{ ...req, id, createdAt: new Date() }, ...s.requests],
        }));
        return id;
      },

      addRequests: (reqs) => {
        const newReqs = reqs.map((r) => ({
          ...r,
          id: nanoid(),
          createdAt: new Date(),
        }));
        set((s) => ({ requests: [...newReqs, ...s.requests] }));
      },

      markPaid: (id, txHash) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'paid' as const, txHash } : r
          ),
        })),

      markRejected: (id) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'rejected' as const } : r
          ),
        })),

      // CRITICAL: only return requests where THIS wallet is the payer
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
