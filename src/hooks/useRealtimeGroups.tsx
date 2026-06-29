import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useGroupStore } from '../store/groupStore';
import { useWalletStore } from '../store/walletStore';

export function useRealtimeGroups() {
  const address = useWalletStore((s) => s.address);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  // Stable reference — read directly from store to avoid dependency churn
  const triggerSync = useCallback(() => {
    useGroupStore.getState().syncFromSupabase();
  }, []);

  useEffect(() => {
    if (!address || !supabase) return;

    // Initial sync on mount / wallet change
    triggerSync();

    let debounceTimer: ReturnType<typeof setTimeout>;
    const debouncedSync = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerSync, 600);
    };

    // Subscribe to all group-related table changes
    const channel = supabase
      .channel('groups-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, debouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, debouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, debouncedSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pools' }, debouncedSync)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useRealtimeGroups] Realtime channel SUBSCRIBED');
        }
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useRealtimeGroups] Realtime channel error — will retry');
        }
      });

    channelRef.current = channel;

    return () => {
      clearTimeout(debounceTimer);
      if (supabase && channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [address, triggerSync]);
}
