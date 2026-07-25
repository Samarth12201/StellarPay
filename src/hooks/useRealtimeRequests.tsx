import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRequestStore } from '../store/requestStore';
import { useWalletStore } from '../store/walletStore';
import { PaymentRequest } from '../types';
import toast from 'react-hot-toast';

export function useRealtimeRequests() {
  const address = useWalletStore((s) => s.address);
  const isInitialLoad = useRef(true);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const triggerSync = useCallback((addr: string) => {
    useRequestStore.getState().syncFromSupabase(addr);
  }, []);

  useEffect(() => {
    if (!address || !supabase) return;

    // Pull existing requests from Supabase on wallet connect
    triggerSync(address);
    // Mark initial load done after first sync
    const t = setTimeout(() => { isInitialLoad.current = false; }, 3000);

    // Subscribe to INSERT and UPDATE events for this wallet
    const channel = supabase
      .channel(`requests-${address}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_requests',
          filter: `toaddress=eq.${address}`,
        },
        (payload) => {
          if (isInitialLoad.current) return;

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

          // Add to local store
          useRequestStore.setState((s) => ({
            requests: [newReq, ...s.requests],
          }));

          // Show toast notification
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_requests',
          filter: `toaddress=eq.${address}`,
        },
        () => {
          // When a request status changes (paid/rejected), re-sync
          triggerSync(address);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useRealtimeRequests] Realtime channel SUBSCRIBED');
        }
      });

    channelRef.current = channel;

    return () => {
      clearTimeout(t);
      isInitialLoad.current = true;
      if (supabase && channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [address, triggerSync]);
}
