import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRequestStore } from '../store/requestStore';
import { useWalletStore } from '../store/walletStore';
import { PaymentRequest } from '../types';
import toast from 'react-hot-toast';

export function useRealtimeRequests() {
  const { address } = useWalletStore();
  const { syncFromSupabase } = useRequestStore();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!address || !supabase) return;

    // Pull existing pending requests from Supabase on wallet connect
    syncFromSupabase(address);
    // Mark initial load done after first sync
    const t = setTimeout(() => { isInitialLoad.current = false; }, 3000);

    // Subscribe to NEW inserts only (not existing rows)
    const channel = supabase
      .channel(`requests-${address}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',            // INSERT only
          schema: 'public',
          table: 'payment_requests',
          filter: `toaddress=eq.${address}`,
        },
        (payload) => {
          if (isInitialLoad.current) return; // ignore initial snapshot

          const r = payload.new as any;
          const newReq: PaymentRequest = {
            id: r.id,
            fromAddress: r.fromaddress ?? r.fromAddress,
            toAddress: r.toaddress ?? r.toAddress,
            fromName: r.fromname ?? r.fromName,
            amount: r.amount,
            memo: r.memo,
            groupId: r.groupid ?? r.groupId ?? undefined,
            groupName: r.groupname ?? r.groupName ?? undefined,
            status: r.status,
            txHash: r.txhash ?? r.txHash ?? undefined,
            createdAt: new Date(r.created_at ?? Date.now()),
          };

          // Add to local store without calling Supabase again
          useRequestStore.setState((s) => ({
            requests: [newReq, ...s.requests],
          }));

          // Show dark-indigo toast notification
          toast.custom(
            (t) => (
              <div
                onClick={() => toast.dismiss(t.id)}
                style={{
                  background: '#312e81',
                  color: '#e0e7ff',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  maxWidth: '320px',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: '#c7d2fe' }}>New payment request</strong>
                <br />
                {newReq.fromName} requests {newReq.amount} XLM
                {newReq.groupName ? ` · ${newReq.groupName}` : ''}
              </div>
            ),
            { duration: 6000 }
          );
        }
      )
      .subscribe();

    return () => {
      clearTimeout(t);
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [address]);
}
